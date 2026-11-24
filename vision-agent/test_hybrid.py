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

    async def test_the_no_hint_transcript_does_not_grade(self):
        # It garbled right answers ("Bahagi komuno" for "Baik, Bu Guru").
        self.assertEqual(await self.verdict("Semua hadir.", "Sama adil."), "pass")

    async def test_wrong_answer(self):
        self.assertEqual(await self.verdict("Saya tidak tahu.", "Saya tidak tahu."), "wrong")

    async def test_a_changed_word_does_not_fit(self):
        # "Kita" for "Kami": not the accepted answer; the model decides (no).
        turns = roleplay.comic_turns([{"guruLine": "Apa yang kita pelajari kemarin?",
                                       "studentLine": "Kami belajar salam.", "expectedAnswers": ["Kami belajar salam"]}])
        engine = FakeEngine({"Kita belajar salam.": "Kita belajar salam."})

        async def says_no(turn, text):
            return False

        tracker = RoleplayTracker(roleplay.comic_objectives(turns), sequential=True)
        with patch.object(hybrid_engine, "_model_accepts", says_no):
            verdict = await make_judge(engine, tracker, turns)("Kita belajar salam.", 0)
        self.assertEqual(verdict, "wrong")

    async def test_hinted_transcript_decides(self):
        engine = FakeEngine({"Baik, Bu Guru.": "Baik, mulu-mulu."})
        turns = roleplay.comic_turns([{"guruLine": "Mari kita mengulas pelajaran kemarin.",
                                       "studentLine": "Baik, Bu Guru.", "expectedAnswers": ["Baik, Bu Guru", "Baik"]}])
        tracker = RoleplayTracker(roleplay.comic_objectives(turns), sequential=True)
        self.assertEqual(await make_judge(engine, tracker, turns)("Baik, Bu Guru.", 0), "pass")
        self.assertEqual(await make_judge(FakeEngine({}), tracker, turns)("Baik, Bu Kulu.", 0), "wrong")
        engine = FakeEngine({"Baik.": "Baik"})
        self.assertEqual(await make_judge(engine, tracker, turns)("Baik.", 0), "pass")

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
        await self.answer("Selamat pagi, Bu Guru")       # right words, unclear sounds
        self.assertEqual(self.spoken[-1], unclear_line(self.turns[0], ZH))
        self.assertNotIn("說對了", self.spoken[-1])
        self.assertEqual(self.steps()[-1], (0, "answer"))  # says it again
        self.verdicts = ["pass"]
        await self.answer("Selamat pagi, Bu Guru")
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


class LiveWordsTest(unittest.IsolatedAsyncioTestCase):
    async def test_words_are_sent_while_the_student_talks(self):
        engine = HybridEngine()
        sent = []

        async def sink(payload):
            sent.append(payload)

        async def fake_transcribe(audio, prompt):
            return "Baik, Bu"

        engine.partial_sink = sink
        engine._transcribe = fake_transcribe
        engine._transcribe_turn = lambda *a: asyncio.sleep(0)
        engine.expect("Baik, Bu Guru.")
        await engine.set_listening(True)
        speech = PcmData(samples=(np.sin(np.arange(1600)) * 3000).astype(np.int16), sample_rate=16000, format="s16", channels=1)
        with patch.object(hybrid_engine, "PARTIAL_EVERY_SECONDS", 0.0), patch.object(hybrid_engine, "MIN_PARTIAL_SECONDS", 0.3):
            for _ in range(5):
                await engine.simple_audio_response(speech)
                await asyncio.sleep(0.01)
        self.assertTrue(sent)
        self.assertEqual(sent[0], {"type": "transcript_partial", "speaker": "user", "text": "Baik, Bu"})


class GeminiPronunciationTest(unittest.IsolatedAsyncioTestCase):
    async def judge_with(self, runs, said="Baik, Bu Guru."):
        import pron_check

        turns = roleplay.comic_turns([{"guruLine": "Mari kita mengulas pelajaran kemarin.",
                                       "studentLine": "Baik, Bu Guru.", "expectedAnswers": ["Baik, Bu Guru"]}])
        tracker = RoleplayTracker(roleplay.comic_objectives(turns), sequential=True)
        engine = HybridEngine()
        engine._plain[said] = "Baik, Bu Gulu."
        engine._audio[said] = b"\x00\x01" * 800
        answers = iter(runs)

        async def fake_check(pcm, line):
            return next(answers)

        with patch.object(pron_check, "gemini_check", fake_check), \
                patch.object(pron_check.WORKER, "check", lambda *a: asyncio.sleep(0, {"correct": True})),                 patch.object(hybrid_engine, "_model_accepts", lambda *a: asyncio.sleep(0, False)):
            verdict = await make_judge(engine, tracker, turns)(said, 0)
        return verdict, engine.pron_notes

    async def test_a_sound_error_is_unclear_with_a_note(self):
        wrong = {"correct": False, "problems": [{"word": "Guru", "problem_zh": "r 唸成 l 了"}]}
        verdict, notes = await self.judge_with([wrong])
        self.assertEqual(verdict, "unclear")
        self.assertEqual(notes[0], {"words": ["Guru"], "problem": "Guru：r 唸成 l 了", "heard": "Baik, Bu Gulu."})

    async def test_every_wrong_word_is_named_also_when_the_words_differ(self):
        # "Bagi, Bu Gulu": the transcript gives "Bagi, Bu Guru." (a different
        # word, so wrong) and hides the l; Gemini names both.
        wrong = {"correct": False, "heard_text": "Bagi, Bu Gulu",
                 "problems": [{"word": "Baik", "problem_zh": "唸成 Bagi 了"},
                              {"word": "Guru", "problem_zh": "r 唸成 l 了"}]}
        verdict, notes = await self.judge_with([wrong], said="Bagi, Bu Guru.")
        self.assertEqual(verdict, "wrong")
        self.assertEqual(notes[0]["words"], ["Baik", "Guru"])
        self.assertEqual(notes[0]["heard"], "Bagi, Bu Gulu")

    async def test_the_shown_words_are_what_gemini_heard(self):
        wrong = {"correct": False, "word": "Guru", "problem_zh": "r 唸成 l 了", "heard_text": "Vai, Bu Gulu"}
        verdict, notes = await self.judge_with([wrong])
        self.assertEqual(notes[0]["heard"], "Vai, Bu Gulu")

    async def test_a_failed_check_counts_as_correct(self):
        verdict, notes = await self.judge_with([{"error": "timeout"}])
        self.assertEqual(verdict, "pass")
        self.assertEqual(notes, {})


class SpeechTest(unittest.TestCase):
    def test_noise_is_not_speech(self):
        from hybrid_engine import is_speech

        for noise in ["", "咳咳", "شیدا", "..."]:
            self.assertFalse(is_speech(noise), noise)
        self.assertTrue(is_speech("Bai bukulu."))
