import asyncio
import os
import unittest
from unittest.mock import patch

import numpy as np
from getstream.video.rtc.track_util import PcmData

import hybrid_engine
import main
import practice
import roleplay
from hybrid_engine import HybridEngine, make_judge
from practice import ComicPractice, all_script_lines, correction_line, unclear_line
from roleplay import RoleplayController, RoleplayTracker

ZH = "Traditional Chinese (Taiwan / 繁體中文)"
TURNS_RAW = [
    {"guruLine": "Selamat pagi, anak-anak.", "studentLine": "Selamat pagi, Bu Guru.",
     "studentLineZh": "老師早安。", "expectedAnswers": ["Selamat pagi, Bu Guru", "Selamat pagi"]},
    {"guruLine": "Siapa yang tidak hadir?", "studentLine": "Semua hadir.",
     "studentLineZh": "大家都到了。", "expectedAnswers": ["Semua hadir"]},
]


class EngineChoiceTest(unittest.TestCase):
    def test_hybrid_only_for_tester_practice(self):
        env = {"HYBRID_TEST_USERS": "user_abc", "GEMINI_TEST_USERS": "", "ROLEPLAY_LLM": "gpt-live"}
        with patch.dict(os.environ, env):
            self.assertEqual(main._roleplay_engine("roleplay-practice-topik-2-user_abc"), "hybrid")
            self.assertEqual(main._roleplay_engine("roleplay-comic-topik-2-user_abc"), "gpt-live")
            self.assertEqual(main._roleplay_engine("roleplay-practice-topik-2-user_xyz"), "gpt-live")


class FakeEngine:
    def __init__(self, plain):
        self.plain = plain

    def plain_for(self, hinted):
        return self.plain.get(hinted)


class JudgeTest(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.turns = roleplay.comic_turns(TURNS_RAW)
        self.tracker = RoleplayTracker(roleplay.comic_objectives(self.turns), sequential=True)

    async def verdict(self, said, plain, model_says=False):
        engine = FakeEngine({said: plain})

        async def fake_model(turn, text):
            return model_says

        with patch.object(hybrid_engine, "_model_accepts", fake_model):
            return await make_judge(engine, self.tracker, self.turns)(said, 1)

    async def test_both_transcripts_fit(self):
        self.assertEqual(await self.verdict("Semua hadir.", "Semua hadir."), "pass")

    async def test_only_the_hinted_one_fits_is_unclear(self):
        # With the hint it heard the line; without it, something else.
        self.assertEqual(await self.verdict("Semua hadir.", "Sama adil."), "unclear")

    async def test_wrong_answer(self):
        self.assertEqual(await self.verdict("Saya tidak tahu.", "Saya tidak tahu."), "wrong")

    async def test_close_answer_goes_to_the_model(self):
        self.assertEqual(await self.verdict("Semuanya hadir.", "Semuanya hadir.", model_says=True), "pass")
        self.assertEqual(await self.verdict("Semuanya hadir.", "Semuanya hadir.", model_says=False), "wrong")


class HybridPracticeFlowTest(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.turns = roleplay.comic_turns(TURNS_RAW)
        self.events, self.spoken, self.expected = [], [], []

        async def send(payload):
            self.events.append(payload)

        self.controller = RoleplayController(
            send_event=send,
            tracker=RoleplayTracker(roleplay.comic_objectives(self.turns), sequential=True),
        )

        async def say(text):
            self.spoken.append(text)
            self.controller.on_agent_partial(text)
            await self.controller.on_agent_final(text)

        self.verdicts = []

        async def judge(said, index):
            return self.verdicts.pop(0)

        self.practice = ComicPractice(
            turns=self.turns, controller=self.controller, send_event=send, say=say, note=None,
            help_language=ZH, judge=judge, expect=self.expected.append,
        )
        self.controller.on_user_answer = self.practice.on_answer

    async def answer(self, text):
        await self.controller.on_user_partial(text)
        await self.controller.on_user_final(text)
        await asyncio.sleep(0.05)

    def steps(self):
        return [(e["turnIndex"], e["step"]) for e in self.events if e["type"] == "practice_step"]

    async def test_pass_unclear_wrong(self):
        await self.practice.start()
        self.assertEqual(self.expected, ["Selamat pagi, Bu Guru."])
        self.verdicts = ["pass"]
        await self.answer("Selamat pagi, Bu Guru")       # repeat: right
        self.assertIn("很好！", self.spoken)
        self.assertEqual(self.steps()[-1], (0, "answer"))
        self.verdicts = ["wrong"]
        await self.answer("Saya lupa")                   # answer: wrong
        self.assertEqual(self.spoken[-1], correction_line(self.turns[0], ZH))
        self.assertEqual(self.steps()[-1], (0, "answer"))
        self.verdicts = ["unclear"]
        await self.answer("Selamat pagi, Bu Guru")       # right words, unclear
        self.assertIn(unclear_line(self.turns[0], ZH), self.spoken)
        results = [e for e in self.events if e["type"] == "practice_result"]
        self.assertEqual(results[0]["stars"], 2)         # one wrong + one unclear
        self.assertEqual(self.expected[-1], "Semua hadir.")
        self.practice.close()

    def test_every_line_is_known_ahead(self):
        lines = all_script_lines(self.turns, ZH)
        self.assertIn(correction_line(self.turns[1], ZH), lines)
        self.assertTrue(all(lines))


class TurnCuttingTest(unittest.IsolatedAsyncioTestCase):
    async def test_a_held_turn_is_cut_out_and_transcribed_once(self):
        engine = HybridEngine()
        turns = []

        async def fake_transcribe(audio, expected):
            turns.append((len(audio), expected))

        engine._transcribe_turn = fake_transcribe
        engine.expect("Baik, Bu Guru.")
        await engine.set_listening(True)
        speech = PcmData(samples=(np.sin(np.arange(1600)) * 3000).astype(np.int16), sample_rate=16000, format="s16", channels=1)
        silence = PcmData(samples=np.zeros(1600, dtype=np.int16), sample_rate=16000, format="s16", channels=1)
        with patch.object(hybrid_engine, "END_SILENCE_SECONDS", 0.05):
            for _ in range(6):
                await engine.simple_audio_response(speech)
            await engine.simple_audio_response(silence)
            await asyncio.sleep(0.08)
            await engine.simple_audio_response(silence)
            await asyncio.sleep(0.05)
        self.assertEqual(len(turns), 1)
        self.assertEqual(turns[0][1], "Baik, Bu Guru.")

    async def test_nothing_heard_while_not_listening(self):
        engine = HybridEngine()
        called = []
        engine._transcribe_turn = lambda *a: called.append(a)
        speech = PcmData(samples=(np.ones(1600) * 3000).astype(np.int16), sample_rate=16000, format="s16", channels=1)
        await engine.simple_audio_response(speech)
        self.assertEqual(engine._turn, [])


if __name__ == "__main__":
    unittest.main()
