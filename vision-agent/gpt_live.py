"""gpt-live-1 (OpenAI Live API) as a vision-agents Realtime LLM.

vision-agents 0.6.9 only ships a plugin for the older Realtime API, and that
plugin pins openai<3 while the SDK's Live client needs openai>=3 — so this
speaks the Live WebSocket protocol directly: JSON events carrying raw mono
24 kHz PCM16 audio, full duplex (the model listens while it talks).
"""

from __future__ import annotations

import asyncio
import base64
import json
import logging
import os
import re
import time
from typing import Any, AsyncIterator, Awaitable, Callable, Optional

import aiortc
import websockets
from getstream.video.rtc.track_util import PcmData, PyAVResampler
from vision_agents.core.edge.types import Participant
from vision_agents.core.llm import realtime
from vision_agents.core.llm.llm import LLMResponseFinal

logger = logging.getLogger(__name__)

LIVE_URL = "wss://api.openai.com/v1/live/sessions"
LIVE_SAMPLE_RATE = 24000
CONNECT_TIMEOUT_SECONDS = 15
# Live transcript fragments follow audio cadence, not turn boundaries. A turn
# counts as finished once no new fragment has arrived for this long. Learners
# pause mid-sentence while thinking, so their turns get a longer window.
USER_TURN_SETTLE_SECONDS = 1.2
AGENT_TURN_SETTLE_SECONDS = 0.9
# Barge-in: the Live API stops talking by itself when the student speaks, but
# the audio already sent keeps playing and it sends no "interrupted" event.
# Don't count the last moment of her audio (a reply right as she ends).
BARGE_IN_TAIL_SECONDS = 0.25
_SPEECH = re.compile(r"[^\W\d_]{2,}")  # a real word, not "." or "-"


class GptLive(realtime.Realtime):
    provider_name = "openai_gpt_live"

    def __init__(
        self,
        model: str = "gpt-live-1",
        voice: str = "marin",
        backend_model: Optional[str] = None,
        api_key: Optional[str] = None,
    ):
        super().__init__(fps=1)
        self.model = model
        self.voice = voice
        # Optional Responses "reasoning backend" GPT-Live can delegate to.
        # Unset = client delegation, where the voice model handles the turn itself.
        self.backend_model = backend_model
        self._api_key = api_key
        self._ws: Any = None
        self._reader_task: Optional[asyncio.Task] = None
        self._started: Optional[asyncio.Event] = None
        self._start_error: Optional[str] = None
        self._closing = False
        self._resampler = PyAVResampler(format="s16", sample_rate=LIVE_SAMPLE_RATE, channels=1)
        self._user_parts: list[str] = []
        self._agent_parts: list[str] = []
        self._user_timer: Optional[asyncio.Task] = None
        self._agent_timer: Optional[asyncio.Task] = None
        # Role Play only: the student may cut in while the teacher talks.
        self.barge_in = False
        self._audio_until = 0.0  # when the audio sent so far finishes playing
        self._barging = False  # the student interrupted and is still talking
        self._last_user_fragment_at = 0.0

    async def connect(self) -> None:
        api_key = self._api_key or os.environ.get("OPENAI_API_KEY", "")
        session: dict[str, Any] = {
            "model": self.model,
            "instructions": self._instructions,
            "audio": {"output": {"voice": self.voice}},
        }
        if self.backend_model:
            session["delegation"] = {
                "type": "responses",
                "responses": {"model": self.backend_model},
            }

        self._started = asyncio.Event()
        self._start_error = None
        self._closing = False
        self._ws = await websockets.connect(
            LIVE_URL,
            additional_headers={"Authorization": f"Bearer {api_key}"},
            max_size=None,
        )
        self._reader_task = asyncio.create_task(self._read_loop())
        await self._send({"type": "session.start", "session": session})
        await asyncio.wait_for(self._started.wait(), CONNECT_TIMEOUT_SECONDS)
        if self._start_error:
            raise RuntimeError(f"gpt-live session failed to start: {self._start_error}")

        self._on_connected(
            session_config={"model": self.model, "voice": self.voice},
            capabilities=["text", "audio"],
        )

    async def simple_response(
        self,
        text: str,
        participant: Optional[Participant] = None,
    ) -> AsyncIterator[LLMResponseFinal]:
        # GPT-Live has no "user text message" turn; commentary is content the
        # model voices itself, which is what the kickoff/hint callers want.
        await self._send({
            "type": "session.commentary.append",
            "delegation_id": None,
            "content": text,
        })
        yield LLMResponseFinal()

    async def append_instructions(self, content: str) -> None:
        """Add trusted instructions mid-session (the startup prompt is immutable)."""
        await self._send({
            "type": "session.instructions.append",
            "delegation_id": None,
            "content": content,
        })

    async def append_thinking(self, content: str) -> None:
        """Add quiet context: informs the model without prompting it to speak."""
        await self._send({
            "type": "session.thinking.append",
            "delegation_id": None,
            "content": content,
        })

    async def set_listening(self, listening: bool) -> None:
        """Mute/unmute the student's audio on the model side. The client's mic
        stays published: toggling it there dropped the audio track."""
        await self._send({
            "type": "session.input_audio.unmute" if listening else "session.input_audio.mute"
        })

    async def simple_audio_response(self, pcm: PcmData, participant: Participant) -> None:
        self._current_participant = participant
        if self._ws is None or self._started is None or not self._started.is_set():
            return
        data = self._resampler.resample(pcm).to_bytes()
        if len(data) % 2:
            data = data[:-1]
        if not data:
            return
        await self._send({
            "type": "session.input_audio.append",
            "audio": base64.b64encode(data).decode("ascii"),
        })

    async def watch_video_track(
        self,
        track: aiortc.mediastreams.MediaStreamTrack,
        shared_forwarder: Any = None,
    ) -> None:
        # gpt-live-1 is audio-only.
        return None

    async def close(self) -> None:
        self._closing = True
        await self._close_audio_input()
        for timer in (self._user_timer, self._agent_timer):
            if timer is not None:
                timer.cancel()
        if self._ws is not None:
            try:
                await self._send({"type": "session.close"})
                if self._reader_task is not None:
                    await asyncio.wait_for(asyncio.shield(self._reader_task), 5)
            except Exception:
                pass
            await self._ws.close()
        if self._reader_task is not None and not self._reader_task.done():
            self._reader_task.cancel()
        if self.connected:
            self._on_disconnected()

    async def _send(self, event: dict[str, Any]) -> None:
        if self._ws is None:
            return
        try:
            await self._ws.send(json.dumps(event, ensure_ascii=False))
        except websockets.ConnectionClosed:
            logger.warning("gpt-live socket closed; dropped %s", event.get("type"))

    async def _read_loop(self) -> None:
        clean = True
        try:
            async for raw in self._ws:
                try:
                    await self._handle_event(json.loads(raw))
                except Exception:
                    logger.exception("gpt-live event handling failed")
        except websockets.ConnectionClosed as exc:
            clean = self._closing
            if not self._closing:
                logger.warning("gpt-live connection lost: %s", exc)
        finally:
            if self._started is not None and not self._started.is_set():
                self._start_error = self._start_error or "connection closed before session.started"
                self._started.set()
            if self.connected and not self._closing:
                self._on_disconnected(reason="connection_lost", clean=clean)

    async def _handle_event(self, event: dict[str, Any]) -> None:
        et = event.get("type")

        if et == "session.output_audio.delta":
            if self._silenced():
                return  # the rest of the sentence she was cut off in
            pcm = PcmData.from_bytes(
                base64.b64decode(event.get("delta", "")),
                sample_rate=LIVE_SAMPLE_RATE,
                format="s16",
                channels=1,
            )
            now = time.monotonic()
            self._audio_until = max(now, self._audio_until) + pcm.duration_ms / 1000
            self._emit_audio_output_event(pcm)
        elif et == "session.output_transcript.delta":
            if not self._silenced():
                self._on_agent_fragment(event.get("delta", ""))
        elif et == "session.input_transcript.delta":
            delta = event.get("delta", "")
            self._maybe_barge_in(delta)
            self._on_user_fragment(delta)
        elif et == "session.started":
            logger.info("gpt-live session started: %s", (event.get("session") or {}).get("id"))
            if self._started is not None:
                self._started.set()
        elif et == "session.delegation.created":
            await self._resolve_client_delegation(event.get("delegation") or {})
        elif et == "error":
            error = event.get("error") or {}
            message = f"{error.get('code') or error.get('type')}: {error.get('message')}"
            if self._started is not None and not self._started.is_set():
                self._start_error = message
                self._started.set()
                return
            logger.error("gpt-live error: %s", message)
            self._emit_error_event(error=Exception(message), context="gpt-live")
        elif et == "session.closed":
            logger.info("gpt-live session closed: %s usage=%s", event.get("reason"), event.get("usage"))
        else:
            logger.debug("gpt-live event: %s", et)

    async def _resolve_client_delegation(self, delegation: dict[str, Any]) -> None:
        # With client delegation nothing else will answer this unit of work,
        # so hand it straight back rather than leave the model waiting on it.
        if delegation.get("target") != "client" or not delegation.get("id"):
            return
        await self._send({
            "type": "session.thinking.append",
            "delegation_id": delegation["id"],
            "content": "No backend is available. Handle this yourself, briefly and in character.",
        })

    def _maybe_barge_in(self, fragment: str) -> None:
        """The student started talking over the teacher: stop her audio now."""
        now = time.monotonic()
        if _SPEECH.search(fragment):
            self._last_user_fragment_at = now
        if not self.barge_in or self._barging or not _SPEECH.search(fragment):
            return
        if now >= self._audio_until - BARGE_IN_TAIL_SECONDS:
            return  # she already finished: a normal answer, not an interruption
        logger.info("gpt-live: student barged in; stopping the teacher's audio")
        self._barging = True
        self._audio_until = now
        # Same path as a Realtime barge-in: the agent flushes the queued audio.
        self._emit_audio_output_done_event(interrupted=True)

    def _silenced(self) -> bool:
        """While the student who interrupted is still talking, drop the rest of
        the teacher's interrupted sentence; her reply afterwards plays normally."""
        if not self._barging:
            return False
        if time.monotonic() - self._last_user_fragment_at > USER_TURN_SETTLE_SECONDS:
            self._barging = False
            return False
        return True

    def _on_user_fragment(self, text: str) -> None:
        if not text:
            return
        if not self._user_parts:
            self._emit_user_speech_started()
        self._user_parts.append(text)
        self._emit_user_speech_transcription(text, mode="delta")
        self._user_timer = self._restart_timer(
            self._user_timer, self._finish_user_turn, USER_TURN_SETTLE_SECONDS
        )

    def _on_agent_fragment(self, text: str) -> None:
        if not text:
            return
        if not self._agent_parts:
            self._emit_agent_speech_started()
        self._agent_parts.append(text)
        self._emit_agent_speech_transcription(text, mode="delta")
        self._agent_timer = self._restart_timer(
            self._agent_timer, self._finish_agent_turn, AGENT_TURN_SETTLE_SECONDS
        )

    async def _finish_user_turn(self) -> None:
        text = "".join(self._user_parts).strip()
        self._user_parts.clear()
        if text:
            self._emit_user_speech_transcription(text, mode="final")
        self._emit_user_speech_ended()

    async def _finish_agent_turn(self) -> None:
        text = "".join(self._agent_parts).strip()
        self._agent_parts.clear()
        self._emit_agent_speech_transcription(text, mode="final")
        self._emit_agent_speech_ended()

    @staticmethod
    def _restart_timer(
        current: Optional[asyncio.Task],
        callback: Callable[[], Awaitable[None]],
        delay: float,
    ) -> asyncio.Task:
        if current is not None:
            current.cancel()

        async def fire() -> None:
            await asyncio.sleep(delay)
            await callback()

        return asyncio.create_task(fire())
