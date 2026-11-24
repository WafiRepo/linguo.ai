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
import time
import wave
from difflib import SequenceMatcher
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

TTS_MODEL = os.getenv("LINE_TTS_MODEL", "gemini-2.5-pro-preview-tts")
# The pro model allows only a few requests (Tier 1: 10 a minute, 50 a day).
# When it is used up, the flash model (its own quota) voices the line.
FALLBACK_MODEL = os.getenv("LINE_TTS_FALLBACK_MODEL", "gemini-2.5-flash-preview-tts")
PRO_REST_SECONDS = 3600
_pro_resting_until = 0.0
# When the flash quota is used up too, Gemini is skipped for a while and the
# line is voiced by OpenAI right away (no waiting on refused requests).
_flash_resting_until = 0.0
# Last resort, so Bu Guru never stays silent: OpenAI's voice (cached apart,
# so a later Gemini recording of the line still replaces it).
OPENAI_TTS_MODEL = os.getenv("LINE_OPENAI_TTS_MODEL", "gpt-4o-mini-tts")
OPENAI_VOICES = {"Kore": "coral", "Charon": "ash"}
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


def openai_cache_path(text: str, voice: str) -> Path:
    key = hashlib.sha1(f"{OPENAI_TTS_MODEL}|{voice}|{text}".encode("utf-8")).hexdigest()
    return CACHE_DIR / "openai" / f"{key}.pcm"


def _synthesize_openai(text: str, voice: str) -> bytes:
    """24 kHz PCM16 mono, like the Gemini recordings."""
    from openai import OpenAI

    response = OpenAI().audio.speech.create(
        model=OPENAI_TTS_MODEL,
        voice=OPENAI_VOICES.get(voice, "coral"),
        input=text,
        instructions=_style(text, voice),
        response_format="pcm",
    )
    return response.content


def _plain(text: str) -> str:
    return "".join(ch for ch in text.lower() if ch.isalnum())


def _synthesize_once(text: str, voice: str, model: str = TTS_MODEL) -> bytes:
    from google import genai
    from google.genai import types

    client = genai.Client()
    response = client.models.generate_content(
        model=model,
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
    global _pro_resting_until, _flash_resting_until
    for attempt in range(1, MAX_TRIES + 1):
        now = time.monotonic()
        if now < _pro_resting_until and now < _flash_resting_until:
            break  # both Gemini quotas used up: no recording from Gemini now
        model = TTS_MODEL if now >= _pro_resting_until else FALLBACK_MODEL
        try:
            pcm = _synthesize_once(text, voice, model)
        except Exception as e:  # noqa: BLE001 - try again, then give up
            if "RESOURCE_EXHAUSTED" in str(e):
                logger.warning("[line-voice] %s quota used up; resting it for a while", model)
                if model == TTS_MODEL:
                    _pro_resting_until = time.monotonic() + PRO_REST_SECONDS
                else:
                    _flash_resting_until = time.monotonic() + PRO_REST_SECONDS
            else:
                logger.warning("[line-voice] TTS failed (try %d, %s): %s", attempt, model, str(e)[:160])
            continue
        if not pcm:
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


async def line_audio(text: str, voice: str, fallback: bool = True) -> Optional[bytes]:
    """Cached recording of a line (made on first use). When Gemini can't make
    one now (quota), OpenAI's voice is used (unless fallback=False)."""
    path = cache_path(text, voice)
    if path.exists():
        return path.read_bytes()
    lock = _locks.setdefault(str(path), asyncio.Lock())
    async with lock:
        if path.exists():
            return path.read_bytes()
        pcm = await asyncio.to_thread(synthesize, text, voice)
        if pcm:
            CACHE_DIR.mkdir(exist_ok=True)
            path.write_bytes(pcm)
            return pcm
    if not fallback:
        return None
    spare = openai_cache_path(text, voice)
    if spare.exists():
        return spare.read_bytes()
    try:
        pcm = await asyncio.to_thread(_synthesize_openai, text, voice)
    except Exception as e:  # noqa: BLE001
        logger.warning("[line-voice] OpenAI voice failed: %s", str(e)[:160])
        return None
    if pcm:
        spare.parent.mkdir(parents=True, exist_ok=True)
        spare.write_bytes(pcm)
    return pcm or None


async def prewarm(lines: list[str], voice: str, concurrency: int = 3, fallback: bool = True) -> None:
    """Record every line of a lesson ahead of time (cached ones are skipped)."""
    gate = asyncio.Semaphore(concurrency)

    async def one(line: str) -> None:
        async with gate:
            try:
                await line_audio(line, voice, fallback=fallback)
            except Exception as e:  # noqa: BLE001
                logger.warning("[line-voice] prewarm failed for %r: %s", line[:40], e)

    await asyncio.gather(*(one(line) for line in dict.fromkeys(lines)))
