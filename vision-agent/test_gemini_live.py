import asyncio
import os
import unittest
from unittest.mock import patch

import gemini_live
import main
from gemini_live import GeminiLive, say_exactly


class EngineChoiceTest(unittest.TestCase):
    def test_only_listed_testers_get_gemini(self):
        env = {"GEMINI_TEST_USERS": "user_abc, user_def", "ROLEPLAY_LLM": "", "PRACTICE_ENGINE": "default"}
        with patch.dict(os.environ, env):
            os.environ.pop("ROLEPLAY_LLM")
            self.assertEqual(main._roleplay_engine("roleplay-comic-b-topik-6-user_abc"), "gemini")
            self.assertEqual(main._roleplay_engine("roleplay-practice-b-topik-2-user_def"), "gemini")
            self.assertEqual(main._roleplay_engine("roleplay-comic-b-topik-6-user_xyz"), "gpt-live")
            # A lesson call is never on the live engines.
            self.assertEqual(main._roleplay_engine("lesson-1-user_abc"), "realtime")

    def test_no_testers_keeps_gpt_live(self):
        with patch.dict(os.environ, {}, clear=False):
            os.environ.pop("GEMINI_TEST_USERS", None)
            os.environ.pop("ROLEPLAY_LLM", None)
            self.assertEqual(main._roleplay_engine("roleplay-comic-b-topik-6-user_abc"), "gpt-live")


class GeminiLiveTest(unittest.IsolatedAsyncioTestCase):
    def make(self):
        llm = GeminiLive(api_key="test")
        llm._instructions = "You are Bu Guru."
        return llm

    def test_voice_and_free_language(self):
        llm = self.make()
        llm.voice = gemini_live.MALE_VOICE
        speech = llm.get_config()["speech_config"]
        self.assertEqual(speech["voice_config"]["prebuilt_voice_config"]["voice_name"], "Charon")
        self.assertNotIn("language_code", speech)

    def test_script_lines_are_wrapped_to_be_said_as_written(self):
        wrapped = say_exactly("Satu kelompok tiga orang.")
        self.assertIn("«Satu kelompok tiga orang.»", wrapped)
        self.assertIn("exactly as written", wrapped)

    async def test_pieces_become_one_final_turn(self):
        llm = self.make()
        finals: list[str] = []
        original = llm._emit_user_speech_transcription

        def spy(text, *, mode):
            if mode == "final":
                finals.append(text)
            original(text, mode=mode)

        llm._emit_user_speech_transcription = spy  # how main.py hooks in
        with patch.object(gemini_live, "USER_TURN_SETTLE_SECONDS", 0.01):
            for piece in ("Baik", ", Pak", " Guru."):
                llm._emit_user_speech_transcription(piece, mode="delta")
            await asyncio.sleep(0.1)
        self.assertEqual(finals, ["Baik, Pak Guru."])

    async def test_muted_audio_is_not_sent(self):
        llm = self.make()
        sent = []

        async def fake_super(self, pcm, participant=None):
            sent.append(pcm)

        with patch("vision_agents.plugins.gemini.gemini_realtime.GeminiRealtime.simple_audio_response", fake_super):
            await llm.set_listening(False)
            await llm.simple_audio_response("pcm")
            await llm.set_listening(True)
            await llm.simple_audio_response("pcm2")
        self.assertEqual(sent, ["pcm2"])


if __name__ == "__main__":
    unittest.main()
