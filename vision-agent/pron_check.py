"""Pronunciation checks for the hybrid Practice trial (shown to testers only).

Two checkers listen to the student's turn; for now their results are only
shown in the tester card and logged, they do not change the grade:
- Gemini (gemini-3.8-flash) hears the audio and answers in JSON
- wav2vec2 phoneme recognition (pron_eval/pron_worker.py), run as a child
  process in its own venv (~/pron-eval-venv) over stdin/stdout, no listener
"""

from __future__ import annotations

import asyncio
import base64
import io
import json
import logging
import os
import re
import threading
import wave
from pathlib import Path
from typing import Any, Optional

from pronunciation import sounded_syllables, word_guide

logger = logging.getLogger(__name__)

GEMINI_MODEL = os.getenv("PRON_GEMINI_MODEL", "gemini-3.8-flash")
WORKER_PYTHON = Path(os.getenv("PRON_WORKER_PYTHON", str(Path.home() / "pron-eval-venv" / "bin" / "python")))
WORKER_SCRIPT = Path(__file__).resolve().parent / "pron_eval" / "pron_worker.py"
WORKER_START_SECONDS = 120.0
WORKER_REPLY_SECONDS = 20.0
GEMINI_SECONDS = 15.0

GEMINI_PROMPT = """You are an Indonesian pronunciation examiner for children learning Indonesian in Taiwan.
Listen to the audio. The child should say: "{line}".
How it sounds (KBBI): {guide}. Notation: ə = e pepet (short neutral "uh"), e/é = e taling ("eh").
Judge ONLY the sounds, not the voice, speed or accent. Standard Indonesian: a final k is a glottal stop [ʔ]
(baik = [baiʔ]) and a final h is soft - both are CORRECT. Mark it wrong only for a clear sound error, such as:
e pepet said as "é" or "a", r said as l, ng said as n, b said as p, d said as t, a missing or extra syllable.
If you hear no speech, only noise, or not this line at all, answer correct=false.
If you are not sure about a sound, answer correct.
Return JSON: {{"heard": "<what you heard, in IPA>",
"heard_text": "<what the child really said, written with normal Indonesian letters as it sounded, e.g. Baik, Bu Gulu>",
"correct": true|false,
"problem": "<short reason in English, empty if correct>",
"word": "<the Indonesian word with the problem, exactly as written in the line, empty if correct>",
"problem_zh": "<the same reason for a young child, in Traditional Chinese (Taiwan), max 20 characters, e.g. guru 的 r 唸成 l 了>"}}"""


def _wav(pcm16: bytes, rate: int = 16000) -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(pcm16)
    return buf.getvalue()


def _guide(line: str) -> str:
    parts = []
    for word in re.findall(r"[A-Za-z]+", line):
        lafal = word_guide().get(word.lower(), {}).get("lafal", "")
        parts.append(f"{word} = {sounded_syllables(word)}{' ' + lafal if lafal else ''}")
    return "; ".join(parts)


_client: Any = None
_client_lock = threading.Lock()


def _gemini() -> Any:
    """One Gemini client for the process: a throwaway one (or a second one
    made by a parallel call) gets closed mid-call."""
    global _client
    with _client_lock:
        if _client is None:
            from google import genai

            _client = genai.Client()
    return _client


async def gemini_check(pcm16: bytes, line: str) -> dict[str, Any]:
    from google.genai import types

    def call() -> dict[str, Any]:
        response = _gemini().models.generate_content(
            model=GEMINI_MODEL,
            contents=[
                types.Part.from_bytes(data=_wav(pcm16), mime_type="audio/wav"),
                GEMINI_PROMPT.format(line=line, guide=_guide(line)),
            ],
            config=types.GenerateContentConfig(response_mime_type="application/json", temperature=0),
        )
        return json.loads(response.text)

    try:
        result = await asyncio.wait_for(asyncio.to_thread(call), GEMINI_SECONDS)
        return {"correct": bool(result.get("correct")), "problem": str(result.get("problem") or ""),
                "heard": str(result.get("heard") or ""), "heard_text": str(result.get("heard_text") or ""),
                "word": str(result.get("word") or ""),
                "problem_zh": str(result.get("problem_zh") or "")}
    except Exception as e:  # noqa: BLE001
        return {"error": str(e)[:120]}


class PhonemeWorker:
    """The wav2vec2 worker process, started once and reused."""

    def __init__(self) -> None:
        self._proc: Optional[asyncio.subprocess.Process] = None
        self._lock = asyncio.Lock()
        self._next_id = 0
        self._broken = False

    @property
    def available(self) -> bool:
        return not self._broken and WORKER_PYTHON.exists() and WORKER_SCRIPT.exists()

    async def _start(self) -> None:
        self._proc = await asyncio.create_subprocess_exec(
            str(WORKER_PYTHON), str(WORKER_SCRIPT),
            cwd=str(WORKER_SCRIPT.parent),
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.DEVNULL,
        )
        assert self._proc.stdout is not None
        while True:
            line = await asyncio.wait_for(self._proc.stdout.readline(), WORKER_START_SECONDS)
            if not line:
                raise RuntimeError("phoneme worker exited")
            if json.loads(line).get("ready"):
                return

    async def check(self, pcm16: bytes, line: str) -> dict[str, Any]:
        if not self.available:
            return {"error": "phoneme worker not installed"}
        async with self._lock:
            try:
                if self._proc is None or self._proc.returncode is not None:
                    await self._start()
                assert self._proc and self._proc.stdin and self._proc.stdout
                self._next_id += 1
                request = {"id": self._next_id, "line": line, "pcm16": base64.b64encode(pcm16).decode("ascii")}
                self._proc.stdin.write((json.dumps(request) + "\n").encode("utf-8"))
                await self._proc.stdin.drain()
                reply = json.loads(await asyncio.wait_for(self._proc.stdout.readline(), WORKER_REPLY_SECONDS))
                return reply
            except Exception as e:  # noqa: BLE001
                logger.warning("[pron] phoneme worker failed: %s", e)
                if self._proc is not None and self._proc.returncode is None:
                    self._proc.kill()
                self._proc = None
                return {"error": str(e)[:120]}

    async def warm_up(self) -> None:
        """Start it ahead (loading the model takes a while)."""
        if self.available:
            async with self._lock:
                try:
                    if self._proc is None:
                        await self._start()
                except Exception as e:  # noqa: BLE001
                    logger.warning("[pron] phoneme worker did not start: %s", e)
                    self._broken = True


WORKER = PhonemeWorker()


async def gemini_verdict(pcm16: bytes, line: str, runs: int = 1) -> dict[str, Any]:
    """Gemini listens `runs` times (once by default: quicker); the sounds
    count as wrong only when EVERY run says so. An error or a timeout counts
    as correct."""
    results = await asyncio.gather(*(gemini_check(pcm16, line) for _ in range(runs)))
    wrong = [r for r in results if r.get("correct") is False]
    if len(wrong) == runs:
        first = wrong[0]
        return {"correct": False, "runs": results, "word": first.get("word", ""),
                "heard_text": first.get("heard_text", ""),
                "problem": first.get("problem", ""), "problem_zh": first.get("problem_zh", "")}
    return {"correct": True, "runs": results}


async def check_both(pcm16: bytes, line: str) -> dict[str, Any]:
    gemini, phonemes = await asyncio.gather(gemini_check(pcm16, line), WORKER.check(pcm16, line))
    return {"gemini": gemini, "phonemes": phonemes}
