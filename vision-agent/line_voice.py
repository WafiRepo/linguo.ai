"""Bu Guru's fixed lines as recordings (hybrid Practice).

Every script line (Listen instruction, praise, correction, "say it with me")
is voiced once by Gemini-TTS (gemini-2.5-pro-preview-tts, voice Kore, asked
for a Taiwan Mandarin accent and a Jakarta Indonesian accent), cached on
disk, and played into the call. The same line always sounds the same and
nothing is improvised.
"""

from __future__ import annotations

import asyncio
import hashlib
import io
import logging
import os
import wave
from difflib import SequenceMatcher
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

TTS_MODEL = os.getenv("LINE_TTS_MODEL", "gemini-2.5-pro-preview-tts")
SAMPLE_RATE = 24000
CACHE_DIR = Path(__file__).resolve().parent / ".line-audio-cache"
MAX_TRIES = 3

FEMALE_VOICE = "Kore"
MALE_VOICE = "Charon"

STYLE_ZH = (
    "用溫柔、親切的台灣小學{who}語氣，台灣國語口音（不要大陸口音），"
    "印尼語部分用道地雅加達口音，一字不差地說："
)
STYLE_EN = (
    "As a warm, friendly primary-school {who} for young children: English with a clear, "
    "gentle accent; the Indonesian words with a native Jakarta accent. Say exactly:"
)

_locks: dict[str, asyncio.Lock] = {}


def _style(text: str, voice: str) -> str:
    chinese = any("一" <= ch <= "鿿" for ch in text)
    male = voice == MALE_VOICE
    if chinese:
        return STYLE_ZH.format(who="男老師" if male else "女老師")
    return STYLE_EN.format(who="male teacher" if male else "teacher")


def cache_path(text: str, voice: str) -> Path:
    key = hashlib.sha1(f"{TTS_MODEL}|{voice}|{text}".encode("utf-8")).hexdigest()
    return CACHE_DIR / f"{key}.pcm"


def _plain(text: str) -> str:
    return "".join(ch for ch in text.lower() if ch.isalnum())


def _synthesize_once(text: str, voice: str) -> bytes:
    from google import genai
    from google.genai import types

    client = genai.Client()
    response = client.models.generate_content(
        model=TTS_MODEL,
        contents=f"{_style(text, voice)}\n{text}",
        config=types.GenerateContentConfig(
            response_modalities=["AUDIO"],
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=voice)
                )
            ),
        ),
    )
    return response.candidates[0].content.parts[0].inline_data.data


def _transcribe_check(pcm: bytes) -> str:
    """What the recording says (to catch a take that read the style note aloud)."""
    from openai import OpenAI

    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SAMPLE_RATE)
        w.writeframes(pcm)
    buf.name = "line.wav"
    buf.seek(0)
    return OpenAI().audio.transcriptions.create(model="gpt-4o-transcribe", file=buf).text


def synthesize(text: str, voice: str) -> bytes:
    """Mono 24 kHz PCM16 for `text`; the closest of a few takes."""
    best, best_score = b"", -1.0
    for attempt in range(1, MAX_TRIES + 1):
        try:
            pcm = _synthesize_once(text, voice)
        except Exception as e:  # noqa: BLE001 - try again, then give up
            logger.warning("[line-voice] TTS failed (try %d): %s", attempt, e)
            continue
        try:
            heard = _transcribe_check(pcm)
            score = SequenceMatcher(None, _plain(text), _plain(heard)).ratio()
        except Exception:  # noqa: BLE001 - keep it unchecked
            score = 0.5
        if score > best_score:
            best, best_score = pcm, score
        if score >= 0.75:
            break
        logger.warning("[line-voice] take %d off (%.2f): %r", attempt, score, text[:40])
    return best


async def line_audio(text: str, voice: str) -> Optional[bytes]:
    """Cached recording of a line (made on first use)."""
    path = cache_path(text, voice)
    if path.exists():
        return path.read_bytes()
    lock = _locks.setdefault(str(path), asyncio.Lock())
    async with lock:
        if path.exists():
            return path.read_bytes()
        pcm = await asyncio.to_thread(synthesize, text, voice)
        if not pcm:
            return None
        CACHE_DIR.mkdir(exist_ok=True)
        path.write_bytes(pcm)
        return pcm


async def prewarm(lines: list[str], voice: str, concurrency: int = 3) -> None:
    """Record every line of a lesson ahead of time (cached ones are skipped)."""
    gate = asyncio.Semaphore(concurrency)

    async def one(line: str) -> None:
        async with gate:
            try:
                await line_audio(line, voice)
            except Exception as e:  # noqa: BLE001
                logger.warning("[line-voice] prewarm failed for %r: %s", line[:40], e)

    await asyncio.gather(*(one(line) for line in dict.fromkeys(lines)))
