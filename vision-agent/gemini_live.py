"""Gemini Live as the Role Play / Practice voice engine (trial).

Same surface as GptLive, so main.py can use either:
- simple_response(text): Bu Guru voices the text as written
- append_thinking / append_instructions: quiet context, no reply
- set_listening(False): the student's audio is not passed on
- final transcripts: Gemini only streams pieces, so whole turns are
  assembled here the way GptLive does it

Gemini has no "say exactly this" channel like GPT-Live's commentary, so the
line goes in with a strict wrapper. Whether it keeps to the words is what
this trial checks.
"""

from __future__ import annotations

import asyncio
import os
from typing import Any, Awaitable, Callable, Optional

from google.genai.types import Content, Part
from vision_agents.core.edge.types import Participant
from vision_agents.core.llm.llm import LLMResponseFinal
from vision_agents.plugins.gemini.gemini_realtime import GeminiRealtime

from gpt_live import AGENT_TURN_SETTLE_SECONDS, USER_TURN_SETTLE_SECONDS

# Google's native Indonesian voices (the vocabulary recordings use Kore).
FEMALE_VOICE = "Kore"
MALE_VOICE = "Charon"
DEFAULT_MODEL = os.getenv("GEMINI_LIVE_MODEL", "gemini-3.1-flash-live-preview")


def say_exactly(text: str) -> str:
    """The wrapper that makes Gemini voice a script line as written."""
    return (
        "[TEACHER SCRIPT - say the text between « » out loud exactly as written, word for "
        "word, in your teacher voice. Say NOTHING before or after it. Do not answer it, "
        f"do not translate it, do not repeat it.]\n«{text}»"
    )


class GeminiLive(GeminiRealtime):
    provider_name = "gemini_live"

    def __init__(self, model: str = DEFAULT_MODEL, voice: str = FEMALE_VOICE, **kwargs: Any):
        super().__init__(model=model, **kwargs)
        self.voice = voice
        self._listening = True
        self._user_parts: list[str] = []
        self._agent_parts: list[str] = []
        self._user_timer: Optional[asyncio.Task] = None
        self._agent_timer: Optional[asyncio.Task] = None

    def get_config(self):
        config = super().get_config()
        speech = dict(config.get("speech_config") or {})
        speech["voice_config"] = {"prebuilt_voice_config": {"voice_name": self.voice}}
        # Bu Guru speaks Chinese (or English) and Indonesian in one turn: let
        # the model pick the language instead of forcing en-US.
        speech.pop("language_code", None)
        config["speech_config"] = speech
        return config

    async def simple_response(self, text: str, participant: Optional[Participant] = None):
        await self._session.send_realtime_input(text=say_exactly(text))
        yield LLMResponseFinal()

    async def append_thinking(self, content: str) -> None:
        """Quiet context: added to the conversation without asking for a reply."""
        await self._session.send_client_content(
            turns=[Content(role="user", parts=[Part(text=f"[Note for you, do not read aloud] {content}")])],
            turn_complete=False,
        )

    async def append_instructions(self, content: str) -> None:
        await self.append_thinking(content)

    async def set_listening(self, listening: bool) -> None:
        self._listening = listening

    async def simple_audio_response(self, pcm, participant: Optional[Participant] = None):
        if not self._listening:
            return
        await super().simple_audio_response(pcm, participant)

    # ---- Whole-turn transcripts (Gemini only streams pieces) ----
    def _emit_user_speech_transcription(self, text: str, *, mode) -> None:  # type: ignore[override]
        super()._emit_user_speech_transcription(text, mode=mode)
        if mode != "delta" or not text:
            return
        self._user_parts.append(text)
        self._user_timer = _restart(self._user_timer, self._finish_user_turn, USER_TURN_SETTLE_SECONDS)

    def _emit_agent_speech_transcription(self, text: str, *, mode) -> None:  # type: ignore[override]
        super()._emit_agent_speech_transcription(text, mode=mode)
        if mode != "delta" or not text:
            return
        self._agent_parts.append(text)
        self._agent_timer = _restart(self._agent_timer, self._finish_agent_turn, AGENT_TURN_SETTLE_SECONDS)

    async def _finish_user_turn(self) -> None:
        text = "".join(self._user_parts).strip()
        self._user_parts.clear()
        if text:
            # Through the instance attribute: main.py wraps it to react to finals.
            self._emit_user_speech_transcription(text, mode="final")

    async def _finish_agent_turn(self) -> None:
        text = "".join(self._agent_parts).strip()
        self._agent_parts.clear()
        if text:
            self._emit_agent_speech_transcription(text, mode="final")


def _restart(
    current: Optional[asyncio.Task], callback: Callable[[], Awaitable[None]], delay: float
) -> asyncio.Task:
    if current is not None:
        current.cancel()

    async def fire() -> None:
        await asyncio.sleep(delay)
        await callback()

    return asyncio.create_task(fire())
