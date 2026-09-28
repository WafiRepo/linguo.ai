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
