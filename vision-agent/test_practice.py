import asyncio
import unittest
from unittest.mock import patch

import practice
import roleplay
from practice import ComicPractice, answer_prompt_line, listen_line, stars_for

ZH = "Traditional Chinese (Taiwan / 繁體中文)"
from roleplay import RoleplayController, RoleplayTracker

TURNS_RAW = [
    {"guruLine": "Selamat pagi, anak-anak.", "studentLine": "Selamat pagi, Bu Guru.",
     "studentLineZh": "老師早安。", "expectedAnswers": ["Selamat pagi, Bu Guru", "Selamat pagi"]},
    {"guruLine": "Siapa yang tidak hadir?", "studentLine": "Semua hadir.",
     "studentLineZh": "大家都到了。", "expectedAnswers": ["Semua hadir"]},
]


class PracticeFlowTest(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.turns = roleplay.comic_turns(TURNS_RAW)
        self.events: list[dict] = []
        self.spoken: list[str] = []
        self.notes: list[str] = []

        async def send(payload):
            self.events.append(payload)

        self.controller = RoleplayController(
            send_event=send,
            tracker=RoleplayTracker(roleplay.comic_objectives(self.turns), sequential=True),
        )

        async def say(text):
            # Simulated Bu Guru: speaks the commentary as written.
            self.spoken.append(text)
            self.controller.on_agent_partial(text)
            await self.controller.on_agent_final(text)

        async def note(text):
            self.notes.append(text)

        self.listening: list[bool] = []

        async def set_listening(on):
            self.listening.append(on)

        self.practice = ComicPractice(
            turns=self.turns,
            controller=self.controller,
            send_event=send,
            say=say,
            note=note,
            help_language=ZH,
            set_listening=set_listening,
        )
        self.controller.on_user_answer = self.practice.on_answer
        for name, value in (
            ("CORRECTION_GRACE_SECONDS", 0.01),
            ("MATCH_OBJECTION_SECONDS", 0.0),
            ("VERDICT_POLL_SECONDS", 0.005),
        ):
            patcher = patch.object(practice, name, value)
            patcher.start()
            self.addCleanup(patcher.stop)

    def steps(self):
        return [(e["turnIndex"], e["step"]) for e in self.events if e["type"] == "practice_step"]

    async def answer(self, text):
        await self.controller.on_user_partial(text)
        await self.controller.on_user_final(text)
        await asyncio.sleep(0.05)

    async def test_listen_repeat_answer_then_next_dialogue(self):
        await self.practice.start()
        self.assertEqual(self.steps(), [(0, "listen"), (0, "repeat")])
        self.assertIn("老師早安", self.spoken[0])
        # Deaf while Bu Guru models the line, listening once it's the student's turn.
        self.assertEqual(self.listening, [False, True])

        await self.answer("Selamat pagi, Bu Guru")
        self.assertEqual(self.steps()[-2:], [(0, "answer-intro"), (0, "answer")])
        self.assertIn("現在不看文字", self.spoken[-1])
        self.assertEqual(self.listening[-2:], [False, True])

        await self.answer("Selamat pagi Bu Guru")
        results = [e for e in self.events if e["type"] == "practice_result"]
        self.assertEqual(results, [{"type": "practice_result", "turnIndex": 0, "stars": 3}])
        self.assertIn({"type": "roleplay_objective", "objectiveId": "turn-0"}, self.events)
        self.assertEqual(self.steps()[-2:], [(1, "listen"), (1, "repeat")])
        self.practice.close()

    async def test_wrong_answers_climb_hint_ladder_then_move_on(self):
        await self.practice.start()
        await self.answer("Selamat pagi, Bu Guru")  # repeat ok
        for attempt in (1, 2):
            await self.answer("Halo semuanya")
            correction = [e for e in self.events if e["type"] == "roleplay_correction"][-1]
            self.assertEqual((correction["step"], correction["attempt"]), ("answer", attempt))
        self.assertEqual(len(self.notes), 2)

        await self.answer("Halo lagi")  # third miss: modeled, then moves on
        self.assertIn("聽好：「Selamat pagi, Bu Guru.」", self.spoken[-2])
        results = [e for e in self.events if e["type"] == "practice_result"]
        self.assertEqual(results[-1]["stars"], 1)
        self.assertEqual(self.steps()[-1], (1, "repeat"))
        self.practice.close()

    async def test_echoing_the_teacher_line_is_not_a_correct_answer(self):
        # From the log: "Selamat pagi, anak-anak" contains the accepted "Selamat pagi".
        await self.practice.start()
        await self.answer("Selamat pagi, Bu Guru")  # repeat ok
        await self.answer("Selamat pagi, anak-anak")
        correction = [e for e in self.events if e["type"] == "roleplay_correction"]
        self.assertEqual(len(correction), 1)
        self.assertFalse([e for e in self.events if e["type"] == "practice_result"])
        await self.answer("Selamat pagi, Bu Guru")
        results = [e for e in self.events if e["type"] == "practice_result"]
        self.assertEqual(results[0]["stars"], 2)
        self.practice.close()

    async def test_ai_correction_beats_a_text_match(self):
        # Transcript matched, but Bu Guru heard it wrong (e.g. pronunciation).
        await self.practice.start()
        await self.controller.on_user_partial("Selamat pagi, Bu Guru")
        self.controller.on_agent_partial("差一點！再說一次：Selamat pagi, Bu Guru")
        await self.controller.on_user_final("Selamat pagi, Bu Guru")
        await asyncio.sleep(0.05)
        self.assertEqual(self.steps()[-1], (0, "repeat"))
        self.assertTrue([e for e in self.events if e["type"] == "roleplay_correction"])
        self.practice.close()

    async def test_praise_moves_on_without_the_grace_wait(self):
        with patch.object(practice, "CORRECTION_GRACE_SECONDS", 5.0), \
                patch.object(practice, "MATCH_OBJECTION_SECONDS", 5.0):
            await self.practice.start()
            await self.controller.on_user_partial("Selamat pagi Bu Guru")
            self.controller.on_agent_partial("很好！")
            await self.controller.on_user_final("Selamat pagi Bu Guru")
            await asyncio.sleep(0.1)  # far less than the 5 s waits
        self.assertEqual(self.steps()[-1], (0, "answer"))
        self.practice.close()

    async def test_answer_split_by_a_pause_is_judged_as_one(self):
        # From the screenshot: "Selamat" … "pagi, Bu Guru" was judged as just "pagi".
        await self.practice.start()
        for piece in ("Selamat", "pagi, Bu Guru"):
            await self.controller.on_user_partial(piece)
            await self.controller.on_user_final(piece)  # no wait: still being judged
        await asyncio.sleep(0.05)
        self.assertFalse([e for e in self.events if e["type"] == "roleplay_correction"])
        self.assertEqual(self.steps()[-1], (0, "answer"))
        self.practice.close()

    async def test_silent_bu_guru_gets_the_line_resent_once(self):
        calls: list[str] = []

        async def silent_then_speaks(text):
            calls.append(text)
            if len(calls) > 1:  # speaks only when sent a second time
                self.controller.on_agent_partial(text)
                await self.controller.on_agent_final(text)

        self.practice.say = silent_then_speaks
        with patch.object(practice, "SILENT_RESEND_SECONDS", 0.05), \
                patch.object(practice, "SPEECH_WAIT_SECONDS", 1.0):
            await self.practice.start()
        self.assertEqual(len(calls), 2)
        self.assertEqual(self.steps(), [(0, "listen"), (0, "repeat")])
        self.practice.close()

    async def test_fillers_ignored_and_session_completes(self):
        await self.practice.start()
        await self.answer("em")
        self.assertFalse([e for e in self.events if e["type"] == "roleplay_correction"])
        for text in ("Selamat pagi", "Selamat pagi", "Semua hadir", "Semua hadir"):
            await self.answer(text)
        self.assertEqual(self.steps()[-1], (1, "done"))
        self.assertIn("練習完成", self.spoken[-1])
        self.practice.close()


class PracticeHelpersTest(unittest.TestCase):
    def test_stars(self):
        self.assertEqual([stars_for(n) for n in (0, 1, 2, 3, 5)], [3, 2, 2, 1, 1])

    def test_listen_line_is_framed_in_chinese_without_double_punctuation(self):
        line = listen_line(roleplay.comic_turns(TURNS_RAW)[1], ZH)
        self.assertEqual(
            line,
            "仔細聽。老師說：「Siapa yang tidak hadir?」你回答：「Semua hadir.」"
            "意思是「大家都到了」。現在跟著說：「Semua hadir.」",
        )
        self.assertNotIn("」。」", line)

    def test_english_help_gets_english_framing(self):
        turn = roleplay.comic_turns(TURNS_RAW)[0]
        self.assertTrue(listen_line(turn, "English").startswith("Listen. The teacher says"))
        self.assertEqual(answer_prompt_line(turn, "English"), "Now without the text. Selamat pagi, anak-anak.")

if __name__ == "__main__":
    unittest.main()
