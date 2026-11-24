"""Record a topic's hybrid-Practice lines ahead of time (Gemini-TTS is slow).

Usage (server or laptop, GEMINI_API_KEY + OPENAI_API_KEY in .env):
    .venv/bin/python prewarm_lines.py topik-2 [b-topik-6 ...] [--male]

Reads the comic from data/classManagement.ts, builds every line Bu Guru can
say in that Practice (Chinese help), and stores the recordings in the cache.
"""

from __future__ import annotations

import asyncio
import re
import sys
import time
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / ".env")

import line_voice  # noqa: E402
from practice import all_script_lines  # noqa: E402
from roleplay import comic_turns  # noqa: E402

DATA = Path(__file__).resolve().parent.parent / "data" / "classManagement.ts"
HELP_ZH = "Traditional Chinese (Taiwan / 繁體中文)"


def topic_turns(topic_id: str) -> tuple[list[dict], bool]:
    """The comic's turns as the app sends them, and whether Pak Guru teaches it."""
    source = DATA.read_text(encoding="utf-8")
    start = source.index(f'id: "{topic_id}"')
    nxt = re.search(r'\n    id: "', source[start + 10:])
    block = source[start: start + 10 + nxt.start()] if nxt else source[start:]
    raw = []
    pattern = re.compile(
        r'guruLine:\s*\{\s*id:\s*"((?:[^"\\]|\\.)*)",\s*zhTW:\s*"((?:[^"\\]|\\.)*)",?\s*\},\s*'
        r'studentLine:\s*\{\s*id:\s*"((?:[^"\\]|\\.)*)",\s*zhTW:\s*"((?:[^"\\]|\\.)*)",?\s*\},\s*'
        r'(?:expectedAnswers:\s*\[([^\]]*)\])?',
        re.S,
    )
    for guru, guru_zh, student, student_zh, answers in pattern.findall(block):
        raw.append({
            "guruLine": guru.replace('\\"', '"'),
            "guruLineZh": guru_zh,
            "studentLine": student.replace('\\"', '"'),
            "studentLineZh": student_zh,
            "expectedAnswers": re.findall(r'"((?:[^"\\]|\\.)*)"', answers or ""),
        })
    return raw, 'teacher: "Pak Guru"' in block


async def main() -> None:
    topics = [a for a in sys.argv[1:] if not a.startswith("--")]
    for topic in topics:
        raw, pak_guru = topic_turns(topic)
        voice = line_voice.MALE_VOICE if (pak_guru or "--male" in sys.argv) else line_voice.FEMALE_VOICE
        lines = all_script_lines(comic_turns(raw), HELP_ZH)
        started = time.monotonic()
        print(f"{topic}: {len(raw)} dialogues, {len(lines)} lines, voice {voice}")
        await line_voice.prewarm(lines, voice, fallback="--with-openai" in sys.argv)
        missing = [line for line in dict.fromkeys(lines) if not line_voice.cache_path(line, voice).exists()]
        print(f"{topic}: done in {time.monotonic() - started:.0f}s, missing {len(missing)}")


if __name__ == "__main__":
    asyncio.run(main())
