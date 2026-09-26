import asyncio
import base64
import json
import unittest
from unittest.mock import patch

import numpy as np
import websockets
from getstream.video.rtc.track_util import PcmData
from vision_agents.core.llm.realtime import (
    RealtimeAgentTranscript,
    RealtimeAudioOutput,
    RealtimeUserTranscript,
)

import gpt_live
from gpt_live import GptLive


class FakeParticipant:
    id = "p1"
    user_id = "student"


class FakeLiveServer:
    """Minimal stand-in for wss://api.openai.com/v1/live/sessions."""

    def __init__(self, reject_start: bool = False):
        self.reject_start = reject_start
        self.received: list[dict] = []
        self.audio_bytes = 0

    async def handler(self, ws):
        async for raw in ws:
            event = json.loads(raw)
            self.received.append(event)
            et = event["type"]
            if et == "session.start":
                if self.reject_start:
                    await ws.send(json.dumps({"type": "error", "error": {"code": "model_not_found", "message": "nope"}}))
                    continue
                await ws.send(json.dumps({"type": "session.started", "session": {"id": "sess_test"}}))
            elif et == "session.commentary.append":
                audio = base64.b64encode(np.zeros(2400, dtype=np.int16).tobytes()).decode()
                await ws.send(json.dumps({"type": "session.output_audio.delta", "delta": audio}))
                for word in (" Selamat", " pagi!"):
                    await ws.send(json.dumps({"type": "session.output_transcript.delta", "delta": word}))
            elif et == "session.input_audio.append":
                self.audio_bytes += len(base64.b64decode(event["audio"]))
                if self.audio_bytes >= 4800 and not getattr(self, "_said", False):
                    self._said = True
                    for word in (" Berapa", " harganya?"):
                        await ws.send(json.dumps({"type": "session.input_transcript.delta", "delta": word}))
            elif et == "session.close":
                await ws.send(json.dumps({"type": "session.closed", "reason": "close_requested"}))
                await ws.close()


async def drain(llm: GptLive, seconds: float) -> list:
    items = []

    async def collect():
        async for item in llm.output:
            items.append(item)

    task = asyncio.create_task(collect())
    await asyncio.sleep(seconds)
    task.cancel()
    return items


class GptLiveTest(unittest.IsolatedAsyncioTestCase):
    async def start_server(self, server: FakeLiveServer) -> str:
        ws_server = await websockets.serve(server.handler, "127.0.0.1", 0)
        self.addAsyncCleanup(self._close_server, ws_server)
        port = ws_server.sockets[0].getsockname()[1]
        return f"ws://127.0.0.1:{port}"

    @staticmethod
    async def _close_server(ws_server):
        ws_server.close()
        await ws_server.wait_closed()

    async def test_full_turn(self):
        server = FakeLiveServer()
        url = await self.start_server(server)
        with patch.object(gpt_live, "LIVE_URL", url), \
                patch.object(gpt_live, "USER_TURN_SETTLE_SECONDS", 0.2), \
                patch.object(gpt_live, "AGENT_TURN_SETTLE_SECONDS", 0.2):
            llm = GptLive(api_key="test")
            llm.set_instructions("Kamu Bu Sari.")
            await llm.connect()
            self.assertTrue(llm.connected)

            start = server.received[0]
            self.assertEqual(start["session"]["model"], "gpt-live-1")
            self.assertEqual(start["session"]["instructions"], "Kamu Bu Sari.")
            self.assertNotIn("delegation", start["session"])

            async for _ in llm.simple_response("Selamat pagi!"):
                pass
            # 48 kHz stereo input must be converted to 24 kHz mono before sending.
            stereo = PcmData(sample_rate=48000, format="s16", channels=2,
                             samples=np.zeros((2, 4800), dtype=np.int16))
            for _ in range(3):
                await llm.simple_audio_response(stereo, FakeParticipant())

            items = await drain(llm, 0.6)
            await llm.close()

        audio = [i for i in items if isinstance(i, RealtimeAudioOutput)]
        self.assertTrue(audio)
        self.assertEqual(audio[0].data.sample_rate, 24000)

        agent_final = [i for i in items if isinstance(i, RealtimeAgentTranscript) and i.mode == "final"]
        self.assertEqual([i.text for i in agent_final], ["Selamat pagi!"])

        user_final = [i for i in items if isinstance(i, RealtimeUserTranscript) and i.mode == "final"]
        self.assertEqual([i.text for i in user_final], ["Berapa harganya?"])
        user_delta = [i.text for i in items if isinstance(i, RealtimeUserTranscript) and i.mode == "delta"]
        self.assertEqual(user_delta, [" Berapa", " harganya?"])

        sent_audio = [e for e in server.received if e["type"] == "session.input_audio.append"]
        # 4800 frames @48k stereo -> 2400 frames @24k mono -> 4800 bytes per chunk
        total = sum(len(base64.b64decode(e["audio"])) for e in sent_audio)
        self.assertGreater(total, 0)
        self.assertEqual(total % 2, 0)
        self.assertEqual(server.received[-1]["type"], "session.close")

    async def test_backend_model_sets_responses_delegation(self):
        server = FakeLiveServer()
        url = await self.start_server(server)
        with patch.object(gpt_live, "LIVE_URL", url):
            llm = GptLive(api_key="test", backend_model="gpt-5.5")
            await llm.connect()
            await llm.close()
        delegation = server.received[0]["session"]["delegation"]
        self.assertEqual(delegation, {"type": "responses", "responses": {"model": "gpt-5.5"}})

    async def test_append_instructions(self):
        server = FakeLiveServer()
        url = await self.start_server(server)
        with patch.object(gpt_live, "LIVE_URL", url):
            llm = GptLive(api_key="test")
            await llm.connect()
            await llm.append_instructions("MISSION STATUS: test")
            await llm.close()
        appended = [e for e in server.received if e["type"] == "session.instructions.append"]
        self.assertEqual(appended, [{
            "type": "session.instructions.append",
            "delegation_id": None,
            "content": "MISSION STATUS: test",
        }])

    async def test_start_error_raises(self):
        url = await self.start_server(FakeLiveServer(reject_start=True))
        with patch.object(gpt_live, "LIVE_URL", url):
            llm = GptLive(api_key="test")
            with self.assertRaisesRegex(RuntimeError, "model_not_found"):
                await llm.connect()
            await llm.close()


class ModeAwareLauncherTest(unittest.IsolatedAsyncioTestCase):
    async def test_roleplay_calls_get_gpt_live(self):
        import main

        seen = {}

        async def fake_start_session(self, call_id, *args, **kwargs):
            agent_llm_is_live = main._uses_gpt_live(main._starting_call_id.get())
            seen[call_id] = agent_llm_is_live

        launcher = main.ModeAwareLauncher.__new__(main.ModeAwareLauncher)
        with patch.object(main.AgentLauncher, "start_session", fake_start_session):
            await launcher.start_session("roleplay-pasar-buah-user_1")
            await launcher.start_session("lesson-id-lesson-1-user_1")
            with patch.dict("os.environ", {"ROLEPLAY_LLM": "realtime"}):
                await launcher.start_session("roleplay-kantin-user_2")

        self.assertEqual(seen, {
            "roleplay-pasar-buah-user_1": True,
            "lesson-id-lesson-1-user_1": False,
            "roleplay-kantin-user_2": False,
        })
        self.assertEqual(main._starting_call_id.get(), "")


if __name__ == "__main__":
    unittest.main()
