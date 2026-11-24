"""Hybrid Practice engine (trial): recordings for Bu Guru, careful listening.

- Bu Guru's lines: line_voice recordings played into the call (no live AI
  voice, so nothing is improvised or skipped).
- The student: each hold-to-talk turn is cut out of the audio (the app
  sends silence while the face isn't held) and transcribed twice by
  gpt-4o-transcribe, language fixed to Indonesian:
    * with a hint (the line the student should say), so "Baik" isn't
      heard as "Bye";
    * without a hint, to tell whether the pronunciation was clear.
  The hinted text goes to the lesson flow; the plain one is kept for judging.
"""

from __future__ import annotations

import asyncio
import io
import logging
import time
import wave
from typing import Any, AsyncIterator, Optional

import numpy as np
from getstream.video.rtc.track_util import PcmData
from vision_agents.core.edge.types import Participant
from vision_agents.core.llm import realtime
from vision_agents.core.llm.llm import LLMResponseFinal

import line_voice

logger = logging.getLogger(__name__)

TRANSCRIBE_MODEL = "gpt-4o-transcribe"
INPUT_RATE = 16000
# A held face sends real microphone samples; a released one sends silence.
ACTIVE_LEVEL = 40          # peak |sample| above this = the mic is open
END_SILENCE_SECONDS = 0.5  # this much silence after a turn ends it
MIN_TURN_SECONDS = 0.35    # shorter = a tap, not an answer
CHUNK_SECONDS = 0.1
# While a turn is going on, its words are transcribed about this often.
PARTIAL_EVERY_SECONDS = 1.0
MIN_PARTIAL_SECONDS = 0.6


def _wav(pcm16: bytes, rate: int) -> io.BytesIO:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(pcm16)
    buf.name = "turn.wav"
    buf.seek(0)
    return buf


def hint_prompt(expected: str) -> str:
    return (
        "A child in Taiwan practising Indonesian answers a teacher. "
        f'The expected answer is: "{expected}". Transcribe exactly what the child says, '
        "in Indonesian spelling."
    )


class HybridEngine(realtime.Realtime):
    provider_name = "hybrid"

    def __init__(self, voice: str = line_voice.FEMALE_VOICE):
        super().__init__(fps=1)
        self.voice = voice
        self._listening = False
        self._expected = ""
        self._turn: list[bytes] = []
        self._turn_samples = 0
        self._silent_since: Optional[float] = None
        self._plain: dict[str, str] = {}
        self._openai: Any = None
        # Testers see what was heard and the verdict (set by main.py).
        self.debug_sink: Any = None
        # Live words while the student talks (set by main.py).
        self.partial_sink: Any = None
        self._turn_id = 0
        self._partial_busy = False
        self._last_partial_at = 0.0

    # ---- lifecycle ----
    async def connect(self) -> None:
        self._on_connected(session_config={"voice": self.voice}, capabilities=["audio"])

    async def close(self) -> None:
        await self._close_audio_input()
        if self.connected:
            self._on_disconnected()

    async def watch_video_track(self, track: Any, shared_forwarder: Any = None) -> None:
        return None

    # ---- what the lesson flow calls ----
    async def simple_response(self, text: str, participant: Optional[Participant] = None) -> AsyncIterator[LLMResponseFinal]:
        """Bu Guru says a script line: its recording, played in real time."""
        await self.say(text)
        yield LLMResponseFinal()

    async def say(self, text: str) -> None:
        pcm = await line_voice.line_audio(text, self.voice)
        self._emit_agent_speech_started()
        self._emit_agent_speech_transcription(text, mode="delta")
        if pcm:
            step = int(line_voice.SAMPLE_RATE * CHUNK_SECONDS) * 2
            started = time.monotonic()
            for offset in range(0, len(pcm), step):
                chunk = pcm[offset:offset + step]
                if len(chunk) % 2:
                    chunk = chunk[:-1]
                self._emit_audio_output_event(
                    PcmData.from_bytes(chunk, sample_rate=line_voice.SAMPLE_RATE, format="s16", channels=1)
                )
                # Keep pace with real time (a little ahead, so playback never starves).
                ahead = (offset / 2) / line_voice.SAMPLE_RATE - (time.monotonic() - started)
                if ahead > 0.3:
                    await asyncio.sleep(ahead - 0.3)
            rest = (len(pcm) / 2) / line_voice.SAMPLE_RATE - (time.monotonic() - started)
            if rest > 0:
                await asyncio.sleep(rest)
        else:
            logger.error("[hybrid] no recording for %r", text[:50])
        self._emit_audio_output_done_event()
        self._emit_agent_speech_transcription(text, mode="final")
        self._emit_agent_speech_ended()

    async def append_thinking(self, content: str) -> None:
        return None

    async def append_instructions(self, content: str) -> None:
        return None

    async def set_listening(self, listening: bool) -> None:
        self._listening = listening
        if not listening:
            self._reset_turn()

    def expect(self, line: str) -> None:
        """The line the student should say next (the transcription hint)."""
        self._expected = line

    def plain_for(self, hinted: str) -> Optional[str]:
        """The no-hint transcription of the turn that was heard as `hinted`."""
        return self._plain.get(hinted.strip())

    # ---- listening ----
    async def simple_audio_response(self, pcm: PcmData, participant: Optional[Participant] = None) -> None:
        self._current_participant = participant
        if not self._listening:
            return
        mono = pcm.resample(target_sample_rate=INPUT_RATE, target_channels=1)
        samples = mono.samples
        active = samples.size > 0 and int(np.abs(samples).max()) > ACTIVE_LEVEL
        now = time.monotonic()
        if active:
            if not self._turn:
                self._turn_id += 1
                self._last_partial_at = now
                self._emit_user_speech_started()
            self._turn.append(samples.astype(np.int16).tobytes())
            self._turn_samples += samples.size
            self._silent_since = None
            if (
                self.partial_sink is not None
                and not self._partial_busy
                and now - self._last_partial_at >= PARTIAL_EVERY_SECONDS
                and self._turn_samples / INPUT_RATE >= MIN_PARTIAL_SECONDS
            ):
                self._last_partial_at = now
                self._partial_busy = True
                asyncio.create_task(self._live_words(b"".join(self._turn), self._turn_id, self._expected))
            return
        if not self._turn:
            return
        if self._silent_since is None:
            self._silent_since = now
        elif now - self._silent_since >= END_SILENCE_SECONDS:
            audio = b"".join(self._turn)
            seconds = self._turn_samples / INPUT_RATE
            self._reset_turn()
            self._emit_user_speech_ended()
            if seconds >= MIN_TURN_SECONDS:
                asyncio.create_task(self._transcribe_turn(audio, self._expected))

    async def _live_words(self, audio: bytes, turn_id: int, expected: str) -> None:
        """The words so far, shown under the voice wave while the student talks."""
        try:
            text = (await self._transcribe(audio, hint_prompt(expected) if expected else None)).strip()
            # Only for the turn still going on (its final text wins afterwards).
            if text and turn_id == self._turn_id and self._turn and self.partial_sink is not None:
                await self.partial_sink({"type": "transcript_partial", "speaker": "user", "text": text})
        except Exception as e:  # noqa: BLE001
            logger.warning("[hybrid] live words failed: %s", e)
        finally:
            self._partial_busy = False

    def _reset_turn(self) -> None:
        self._turn = []
        self._turn_samples = 0
        self._silent_since = None

    async def _transcribe_turn(self, audio: bytes, expected: str) -> None:
        hinted, plain = await asyncio.gather(
            self._transcribe(audio, hint_prompt(expected) if expected else None),
            self._transcribe(audio, None),
        )
        hinted = (hinted or "").strip()
        plain = (plain or "").strip()
        logger.info("[hybrid] heard %r (no hint: %r), expected %r", hinted, plain, expected)
        print(f"[hybrid] heard {hinted!r} (no hint: {plain!r}), expected {expected!r}")
        if not hinted:
            return
        self._plain[hinted] = plain
        self._emit_user_speech_transcription(hinted, mode="delta")
        self._emit_user_speech_transcription(hinted, mode="final")

    async def _transcribe(self, audio: bytes, prompt: Optional[str]) -> str:
        from openai import AsyncOpenAI

        if self._openai is None:
            self._openai = AsyncOpenAI()
        try:
            kwargs: dict[str, Any] = {"model": TRANSCRIBE_MODEL, "file": _wav(audio, INPUT_RATE), "language": "id"}
            if prompt:
                kwargs["prompt"] = prompt
            result = await self._openai.audio.transcriptions.create(**kwargs)
            return result.text
        except Exception as e:  # noqa: BLE001
            logger.warning("[hybrid] transcription failed: %s", e)
            return ""


# ---- Judging an answer (hybrid Practice) ----
GRAY_ZONE_SIMILARITY = 0.5
JUDGE_MODEL = "gpt-4o-mini"


def make_judge(engine: "HybridEngine", tracker: Any, turns: list[dict[str, Any]]):
    """judge(said, index) -> "pass" | "unclear" | "wrong".

    - the hinted and the plain transcription both fit the line: pass
    - only the hinted one fits: right words, unclear sounds
    - neither fits but it's close: a text model decides (meaning-equivalent
      answers count), quietly
    - otherwise: wrong
    """
    from difflib import SequenceMatcher

    from feedback import _normalize
    from roleplay import objective_hit

    async def judge(said: str, index: int) -> str:
        objective = tracker.objectives[index]
        expected = turns[index]["student"]
        plain = engine.plain_for(said) or ""
        hinted_ok = objective_hit(objective, said)
        plain_ok = bool(plain) and objective_hit(objective, plain)
        if hinted_ok and plain_ok:
            verdict = "pass"
        elif hinted_ok:
            verdict = "unclear"
        elif SequenceMatcher(None, _normalize(said), _normalize(expected)).ratio() >= GRAY_ZONE_SIMILARITY:
            verdict = "pass" if await _model_accepts(turns[index], said) else "wrong"
        else:
            verdict = "wrong"
        print(f"[hybrid] judge dialogue {index}: {said!r} / plain {plain!r} -> {verdict}")
        sink = getattr(engine, "debug_sink", None)
        if sink is not None:
            try:
                await sink({"type": "hearing", "turnIndex": index, "expected": expected,
                            "hinted": said, "plain": plain, "verdict": verdict})
            except Exception as e:  # noqa: BLE001
                logger.warning("[hybrid] hearing event failed: %s", e)
        return verdict

    return judge


async def _model_accepts(turn: dict[str, Any], said: str) -> bool:
    from openai import AsyncOpenAI

    accepted = ", ".join(f'"{a}"' for a in turn.get("answers") or []) or "none"
    question = (
        "A child practising Indonesian answers the teacher in a comic dialogue.\n"
        f'Teacher: "{turn["guru"]}"\nComic answer: "{turn["student"]}"\n'
        f"Also accepted: {accepted}\nThe child said: \"{said}\"\n"
        "Is the child's answer acceptable (same meaning, correct Indonesian; small "
        "differences in word order or a missing polite word are fine)? Reply only yes or no."
    )
    try:
        result = await AsyncOpenAI().chat.completions.create(
            model=JUDGE_MODEL,
            messages=[{"role": "user", "content": question}],
            max_tokens=3,
            temperature=0,
        )
        return (result.choices[0].message.content or "").strip().lower().startswith("y")
    except Exception as e:  # noqa: BLE001
        logger.warning("[hybrid] judge model failed: %s", e)
        return False
