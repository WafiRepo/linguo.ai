import asyncio
import json
import unittest
from types import SimpleNamespace
from unittest.mock import patch

import roleplay
from roleplay import (
    RoleplayController,
    RoleplayTracker,
    build_roleplay_system_prompt,
    generate_roleplay_feedback,
    mission_status_text,
    parse_feedback,
    parse_objectives,
)

OBJECTIVES = parse_objectives([
    {"id": "greet", "goal": "greet the seller", "targets": ["selamat pagi", "halo"]},
    {"id": "buy", "goal": "say what to buy", "targets": ["saya mau", "mau beli"]},
    {"id": "thanks", "goal": "thank the seller", "targets": ["terima kasih"]},
])


class ControllerTest(unittest.IsolatedAsyncioTestCase):
    def make(self, feedback=None):
        self.events: list[dict] = []
        self.instructions: list[str] = []

        async def send(payload):
            self.events.append(payload)

        async def append(text):
            self.instructions.append(text)

        return RoleplayController(
            send_event=send,
            tracker=RoleplayTracker(list(OBJECTIVES)),
            append_instructions=append,
            generate_feedback=feedback,
        )

    async def test_sentence_split_by_pause_still_completes_mission(self):
        controller = self.make()
        await controller.on_user_final("Saya")
        await controller.on_user_final("mau mangga")
        done = [e["objectiveId"] for e in self.events if e["type"] == "roleplay_objective"]
        self.assertEqual(done, ["buy"])
        controller.close()

    async def test_mission_status_sent_to_ai_after_each_completion(self):
        controller = self.make()
        await controller.on_user_final("Selamat pagi, Bu!")
        self.assertEqual(len(self.instructions), 1)
        self.assertIn("Still to do", self.instructions[0])
        self.assertIn("thank the seller", self.instructions[0])
        await controller.on_user_final("Bu, apa kabar?")
        self.assertEqual(len(self.instructions), 1)
        controller.close()

    async def test_all_missions_done_lets_ai_close_scene(self):
        tracker = RoleplayTracker(list(OBJECTIVES))
        tracker.record("halo saya mau terima kasih")
        self.assertIn("completed every mission", mission_status_text(tracker))

    async def test_transcript_events_and_merged_turns(self):
        controller = self.make()
        await controller.on_user_partial(" Saya")
        await controller.on_user_partial(" mau")
        await controller.on_user_final("Saya mau")
        await controller.on_user_final("dua")
        await controller.on_agent_final("Baik, dua mangga.")
        partials = [e["text"] for e in self.events if e["type"] == "transcript_partial"]
        self.assertEqual(partials, ["Saya", "Saya mau"])
        self.assertEqual(controller.turns, [
            {"speaker": "user", "text": "Saya mau dua"},
            {"speaker": "agent", "text": "Baik, dua mangga."},
        ])
        controller.close()

    async def test_feedback_sent_after_student_goes_quiet(self):
        seen_turns = []

        async def feedback(turns):
            seen_turns.append(turns)
            return {"praise": "很好！", "corrections": []}

        controller = self.make(feedback)
        with patch.object(roleplay, "FEEDBACK_IDLE_SECONDS", 0.05):
            await controller.on_user_final("Saya mau")
            await controller.on_user_final("mangga")  # restarts the idle timer
            await asyncio.sleep(0.2)
        feedback_events = [e for e in self.events if e["type"] == "roleplay_feedback"]
        self.assertEqual(feedback_events, [{"type": "roleplay_feedback", "praise": "很好！", "corrections": []}])
        self.assertEqual(len(seen_turns), 1)


class ComicControllerTest(unittest.IsolatedAsyncioTestCase):
    async def test_ai_moving_on_by_itself_gets_no_repeat_prompt(self):
        """Replays the logged case: the AI said the next line before the status was sent."""
        turns = roleplay.comic_turns(COMIC_RAW)
        notes: list[str] = []

        async def send(payload):
            pass

        async def append(text):
            notes.append(text)

        controller = RoleplayController(
            send_event=send,
            tracker=RoleplayTracker(roleplay.comic_objectives(turns), sequential=True),
            append_instructions=append,
            status_text=lambda t, recent: roleplay.comic_status_text(t, turns, recent),
        )
        for fragment in (" Bagus!", " Tekan", " tombolnya."):
            controller.on_agent_partial(fragment)
        await controller.on_user_final("Baik, Bu Guru")
        self.assertEqual(notes, [])

        await controller.on_user_final("Sudah")  # AI hasn't said line 3 yet
        self.assertEqual(len(notes), 1)
        self.assertIn("Besarkan suaranya sedikit.", notes[0])
        controller.close()


class CorrectionTest(unittest.IsolatedAsyncioTestCase):
    def test_answer_attempt_filter(self):
        self.assertFalse(roleplay.is_answer_attempt("Em... eh"))
        self.assertFalse(roleplay.is_answer_attempt("我不知道怎麼說"))
        self.assertTrue(roleplay.is_answer_attempt("Bagus"))

    def test_correction_note_skipped_when_ai_already_modeled_line(self):
        note = roleplay.comic_correction_note("Bagus", "Sudah.", "English")
        self.assertIn('"Bagus"', note)
        self.assertIn("Coba bilang: Sudah.", note)
        self.assertIsNone(
            roleplay.comic_correction_note("Bagus", "Sudah.", "English", "Hampir! Coba bilang: Sudah.")
        )

    async def test_unmatched_answer_is_reported(self):
        turns = roleplay.comic_turns(COMIC_RAW)
        misses: list[tuple[str, str]] = []

        async def send(payload):
            pass

        async def on_unmatched(said, recent):
            misses.append((said, recent))

        controller = RoleplayController(
            send_event=send,
            tracker=RoleplayTracker(roleplay.comic_objectives(turns), sequential=True),
            on_unmatched=on_unmatched,
        )
        controller.on_agent_partial(" Masukkan ke stopkontak.")
        await controller.on_user_final("Bagus")
        await controller.on_user_final("Baik, Bu Guru")
        self.assertEqual(misses, [("Bagus", " Masukkan ke stopkontak.")])
        controller.close()


class FeedbackTest(unittest.IsolatedAsyncioTestCase):
    def test_parse_feedback_clips_and_validates(self):
        raw = json.dumps({
            "praise": "x" * 500,
            "corrections": [
                {"said": "buah manga", "better": "buah mangga", "tip": "t" * 500},
                {"said": "", "better": "skip me"},
                "junk",
                {"said": "a", "better": "b"},
                {"said": "c", "better": "d"},
                {"said": "e", "better": "f"},
            ],
        })
        parsed = parse_feedback(raw)
        self.assertEqual(len(parsed["praise"]), 200)
        # Invalid items are skipped without using up the 3 correction slots.
        self.assertEqual([c["said"] for c in parsed["corrections"]], ["buah manga", "a", "c"])
        self.assertEqual(len(parsed["corrections"][0]["tip"]), 160)
        self.assertIsNone(parse_feedback("not json"))
        self.assertLess(len(json.dumps(parsed).encode()), 5000)

    async def test_generate_uses_transcript_and_help_language(self):
        captured = {}

        async def create(**kwargs):
            captured.update(kwargs)
            content = json.dumps({"praise": "Good", "corrections": []})
            return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content=content))])

        client = SimpleNamespace(chat=SimpleNamespace(completions=SimpleNamespace(create=create)))
        result = await generate_roleplay_feedback(
            client, "gpt-5.4-mini",
            [{"speaker": "agent", "text": "Mau beli apa?"}, {"speaker": "user", "text": "Saya mau manga"}],
            "English",
        )
        self.assertEqual(result, {"praise": "Good", "corrections": []})
        self.assertEqual(captured["model"], "gpt-5.4-mini")
        self.assertIn("STUDENT: Saya mau manga", captured["messages"][1]["content"])
        self.assertIn("in English", captured["messages"][0]["content"])


COMIC_RAW = [
    {"guruLine": "Masukkan ke stopkontak.", "guruLineZh": "把插頭插入插座。",
     "studentLine": "Baik, Bu Guru.", "expectedAnswers": ["Baik, Bu Guru", "Baik"]},
    {"guruLine": "Tekan tombolnya.", "studentLine": "Sudah.", "expectedAnswers": ["Sudah"]},
    {"guruLine": "Besarkan suaranya sedikit.", "studentLine": "Oke, Bu.", "expectedAnswers": ["Oke"]},
    {"guruLine": "", "studentLine": "dropped"},
]


class ComicTest(unittest.TestCase):
    def setUp(self):
        self.turns = roleplay.comic_turns(COMIC_RAW)
        self.tracker = RoleplayTracker(roleplay.comic_objectives(self.turns), sequential=True)

    def test_turns_are_normalized(self):
        self.assertEqual(len(self.turns), 3)
        self.assertEqual(self.turns[0]["guru_zh"], "把插頭插入插座。")

    def test_dialogues_complete_only_in_order(self):
        self.assertEqual(self.tracker.record("Oke!"), [])  # turn 3 is two ahead
        self.assertEqual([o.id for o in self.tracker.record("Baik, Bu Guru")], ["turn-0"])
        self.assertIn('"Tekan tombolnya."', roleplay.comic_status_text(self.tracker, self.turns))

    def test_answering_next_line_catches_up_skipped_one(self):
        self.tracker.record("Baik")
        done = [o.id for o in self.tracker.record("Oke, Bu")]
        self.assertEqual(done, ["turn-1", "turn-2"])
        self.assertIn("finished every dialogue", roleplay.comic_status_text(self.tracker, self.turns))

    def test_syllable_split_answer_counts(self):
        self.tracker.record("Baik, Bu Guru")
        self.assertEqual([o.id for o in self.tracker.record("Su- dah")], ["turn-1"])

    def test_no_status_when_ai_already_said_next_line(self):
        self.tracker.record("Baik, Bu Guru")
        self.assertIsNone(
            roleplay.comic_status_text(self.tracker, self.turns, " Bagus! Tekan tombolnya.")
        )
        self.assertIsNotNone(roleplay.comic_status_text(self.tracker, self.turns, " Bagus!"))

    def test_prompt_contains_script_in_order(self):
        prompt = roleplay.build_comic_roleplay_prompt(self.turns, "English", "Topik 1")
        self.assertLess(prompt.index("Masukkan ke stopkontak"), prompt.index("Tekan tombolnya"))
        self.assertIn("SAFETY", prompt)
        self.assertIn("TURN STATUS", prompt)


class PromptTest(unittest.TestCase):
    def test_closing_rule_depends_on_live_updates(self):
        live = build_roleplay_system_prompt({}, OBJECTIVES, "English", live_mission_updates=True)
        fallback = build_roleplay_system_prompt({}, OBJECTIVES, "English")
        self.assertIn("MISSION STATUS", live)
        self.assertNotIn("MISSION STATUS", fallback)
        self.assertIn("Never do it for them", live)


if __name__ == "__main__":
    unittest.main()
