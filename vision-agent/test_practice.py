import asyncio
import unittest
from unittest.mock import patch

import practice
import roleplay
from practice import ComicPractice, listen_line, stars_for
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
            help_language="English",
            set_listening=set_listening,
        )
        self.controller.on_user_answer = self.practice.on_answer
        patcher = patch.object(practice, "CORRECTION_GRACE_SECONDS", 0.01)
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
        self.assertIn("tanpa melihat teks", self.spoken[-1])
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
        self.assertIn('Dengar ya: "Selamat pagi, Bu Guru."', self.spoken[-2])
        results = [e for e in self.events if e["type"] == "practice_result"]
        self.assertEqual(results[-1]["stars"], 1)
        self.assertEqual(self.steps()[-1], (1, "repeat"))
        self.practice.close()

    async def test_fillers_ignored_and_session_completes(self):
        await self.practice.start()
        await self.answer("em")
        self.assertFalse([e for e in self.events if e["type"] == "roleplay_correction"])
        for text in ("Selamat pagi", "Selamat pagi", "Semua hadir", "Semua hadir"):
            await self.answer(text)
        self.assertEqual(self.steps()[-1], (1, "done"))
        self.assertIn("Latihan selesai", self.spoken[-1])
        self.practice.close()


class PracticeHelpersTest(unittest.TestCase):
    def test_stars(self):
        self.assertEqual([stars_for(n) for n in (0, 1, 2, 3, 5)], [3, 2, 2, 1, 1])

    def test_listen_line_includes_meaning(self):
        line = listen_line(roleplay.comic_turns(TURNS_RAW)[1])
        self.assertIn('"Siapa yang tidak hadir?"', line)
        self.assertIn("大家都到了", line)
        self.assertTrue(line.endswith('tiru: "Semua hadir.".'))


if __name__ == "__main__":
    unittest.main()
