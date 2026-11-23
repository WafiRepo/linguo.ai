"""Generate the Learning material vocabulary audio (run once, not in the app).

Reads every `speakText` from data/learningMaterials.ts and asks OpenAI TTS for
two Indonesian recordings of it, guided by the KBBI syllables and lafal in
data/pronunciation.json (e pepet / e taling):
  - assets/audio/vocab/<slug>.mp3       natural speed
  - assets/audio/vocab/<slug>-slow.mp3  slowly (Google: the whole word at 60% speed)
Each recording is checked by transcribing it back. constants/audio.ts is
rewritten so the app can play the files offline.

Usage (from the repo root, OPENAI_API_KEY in vision-agent/.env):
    vision-agent/.venv/Scripts/python.exe scripts/generate_vocab_audio.py
Existing files are kept; pass --force to record them again.

--google: record with a native Indonesian Google Cloud Text-to-Speech voice
(GOOGLE_TTS_API_KEY in vision-agent/.env, voice GOOGLE_TTS_VOICE, default
id-ID-Chirp3-HD-Kore). The OpenAI voice is not a native speaker and mixes up the
e pepet / e taling. --list-voices prints Google's Indonesian voices.
--sample <dir>: record a few test words into <dir> to listen to first.
"""

import base64
import os
import re
import sys
import unicodedata
from pathlib import Path

import httpx

from dotenv import load_dotenv
from openai import OpenAI

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "vision-agent"))
from pronunciation import e_sound, sounded_syllables, word_guide, word_syllables  # noqa: E402

DATA_FILE = ROOT / "data" / "learningMaterials.ts"
AUDIO_DIR = ROOT / "assets" / "audio" / "vocab"
INDEX_FILE = ROOT / "constants" / "audio.ts"

MODEL = "gpt-4o-mini-tts"
VOICE = "marin"  # same voice as Bu Guru in AI Teacher
MAX_TRIES = 4

E_SOUNDS = (
    "The letter e has two sounds (KBBI): ê = e pepet, a short relaxed 'uh' like the a in "
    "English 'about' (sekolah, depan); é = e taling, a clear 'eh' like in English 'bed' "
    "(teks, video)."
)


def guide(text: str) -> str:
    """'sekolah = se-ko-lah /sêkolah/ (e pepet)' for each word."""
    parts = []
    for word in re.findall(r"[A-Za-z]+", text):
        lafal = word_guide().get(word.lower(), {}).get("lafal", "")
        entry = f"{word} = {word_syllables(word)}"
        if lafal:
            entry += f" {lafal} ({e_sound(lafal)})"
        parts.append(entry)
    return "; ".join(parts)


def ipa_hint(text: str) -> str:
    """The KBBI lafal as IPA-like spelling: ê -> ə (schwa), é -> e. Empty without an e."""
    parts = []
    for word in re.findall(r"[A-Za-z]+", text):
        lafal = word_guide().get(word.lower(), {}).get("lafal", "")
        if not lafal:
            parts.append(word.lower())
            continue
        parts.append(lafal.strip("/").replace("ê", "ə").replace("é", "e").replace(" ", ""))
    hint = " ".join(parts)
    return hint if "ə" in hint or any("e" in p for p in parts) else ""


def instructions(text: str, slow: bool) -> str:
    speed = (
        "Say it SLOWLY, syllable by syllable, with a short even pause between the syllables, "
        "so a young learner can follow and copy each syllable."
        if slow
        else "Say it at a natural, clear speaking speed, as whole smooth words: not slow and "
        "not syllable by syllable."
    )
    return (
        "You are a friendly native Indonesian primary-school teacher from Jakarta. Say the "
        "Indonesian word or phrase once, in Bahasa Indonesia with a native accent, never "
        "English, Dutch or German. Pure Indonesian vowels (a = ah, i = ee, u = oo, o = oh). "
        f"{E_SOUNDS} How it sounds: {guide(text)}. {ipa_line(text)}{speed} Warm and friendly. "
        "Say nothing else."
    )


def ipa_line(text: str) -> str:
    hint = ipa_hint(text)
    if not hint:
        return ""
    return (
        f"Pronounce it exactly as the IPA /{hint}/: every ə is a short, relaxed schwa (like the "
        "a in English 'about'), NEVER an 'eh' or 'ay' sound; every plain e is a clear 'eh'. "
    )


def spoken_input(text: str, slow: bool) -> str:
    """The slow take reads the syllables: 'sə - ko - lah'."""
    if not slow:
        return text
    return ",  ".join(sounded_syllables(word).replace("-", " - ") for word in text.split())


# ---- Google Cloud Text-to-Speech (native Indonesian voices) ----
GOOGLE_URL = "https://texttospeech.googleapis.com/v1"
GOOGLE_VOICE = "id-ID-Chirp3-HD-Kore"  # chosen by ear (2026-11-23)


def google_key() -> str:
    key = os.environ.get("GOOGLE_TTS_API_KEY", "")
    if not key:
        raise SystemExit("GOOGLE_TTS_API_KEY is missing in vision-agent/.env")
    return key


# The slow take: the whole word at 60% speed (chosen by ear). Cutting it
# into syllables with pauses made the voice drop syllables and change the e.
GOOGLE_SLOW_RATE = 0.6


def google_speak(text: str, slow: bool) -> bytes:
    voice = os.environ.get("GOOGLE_TTS_VOICE", GOOGLE_VOICE)
    response = httpx.post(
        f"{GOOGLE_URL}/text:synthesize",
        params={"key": google_key()},
        json={
            "input": {"text": text},
            "voice": {"languageCode": "id-ID", "name": voice},
            "audioConfig": {"audioEncoding": "MP3", "speakingRate": GOOGLE_SLOW_RATE if slow else 1.0},
        },
        timeout=60,
    )
    if response.status_code != 200:
        raise SystemExit(f"Google TTS error {response.status_code}: {response.text[:300]}")
    return base64.b64decode(response.json()["audioContent"])


def list_google_voices() -> None:
    response = httpx.get(
        f"{GOOGLE_URL}/voices", params={"key": google_key(), "languageCode": "id-ID"}, timeout=30
    )
    response.raise_for_status()
    for voice in response.json().get("voices", []):
        print(voice["name"], voice.get("ssmlGender", ""))


def normalize(text: str) -> str:
    # The transcriber may write the e pepet as "ə" or add accents ("Kəčilkan"):
    # those are right, so compare plain letters.
    plain = unicodedata.normalize("NFKD", text.lower().replace("ə", "e"))
    return re.sub(r"[^a-z]", "", plain)


def similarity(a: str, b: str) -> float:
    from difflib import SequenceMatcher

    return SequenceMatcher(None, normalize(a), normalize(b)).ratio()


def record(client: OpenAI, text: str, path: Path, slow: bool, google: bool = False) -> None:
    """Record, check by transcribing it back, keep the closest of a few tries."""
    best_score, best_audio = -1.0, b""
    # Google's voice gives the same take every time: one try is enough.
    for attempt in range(1, (1 if google else MAX_TRIES) + 1):
        if google:
            audio = google_speak(text, slow)
        else:
            audio = client.audio.speech.create(
                model=MODEL,
                voice=VOICE,
                input=spoken_input(text, slow),
                instructions=instructions(text, slow),
                response_format="mp3",
            ).content
        path.write_bytes(audio)
        with open(path, "rb") as f:
            heard = client.audio.transcriptions.create(
                model="gpt-4o-transcribe", file=f, language="id"
            ).text
        # Letters only: the slow take may come back as "se ko lah".
        score = similarity(text, heard)
        print(f"  try {attempt}: heard {heard!r} ({score:.2f})")
        if score > best_score:
            best_score, best_audio = score, audio
        if normalize(heard) == normalize(text):
            break
    path.write_bytes(best_audio)
    if best_score < 1.0:
        print(f"  CHECK BY EAR: best match {best_score:.2f}")


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def camel(slug: str) -> str:
    head, *rest = slug.split("-")
    return head + "".join(part.capitalize() for part in rest)


def main() -> None:
    load_dotenv(ROOT / "vision-agent" / ".env")
    force = "--force" in sys.argv
    google = "--google" in sys.argv
    if "--list-voices" in sys.argv:
        list_google_voices()
        return
    if "--sample" in sys.argv:
        out = Path(sys.argv[sys.argv.index("--sample") + 1])
        out.mkdir(parents=True, exist_ok=True)
        client = OpenAI()
        for text in ("menjelaskan", "sekolah", "setiap", "teks", "kecilkan suara", "steker"):
            for slow in (False, True):
                path = out / f"{slugify(text)}{'-slow' if slow else ''}.mp3"
                print(f"sample{' (slow)' if slow else ''}: {text}")
                record(client, text, path, slow, google)
        return
    texts = sorted(set(re.findall(r'speakText:\s*"([^"]+)"', DATA_FILE.read_text(encoding="utf-8"))))
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    client = OpenAI()

    for text in texts:
        for slow in (False, True):
            path = AUDIO_DIR / f"{slugify(text)}{'-slow' if slow else ''}.mp3"
            if path.exists() and not force:
                continue
            print(f"recording{' (slow)' if slow else ''}: {text}")
            record(client, text, path, slow, google)

    lines = [
        "// Generated by scripts/generate_vocab_audio.py — do not edit by hand.",
        "// Vocabulary recordings for Learning materials, keyed by speakText:",
        "// natural speed, and slowly syllable by syllable (KBBI syllables).",
        "",
    ]
    for text in texts:
        slug = slugify(text)
        lines.append(f'import {camel(slug)} from "@/assets/audio/vocab/{slug}.mp3";')
        lines.append(f'import {camel(slug)}Slow from "@/assets/audio/vocab/{slug}-slow.mp3";')
    lines += ["", "export const vocabAudio: Record<string, number> = {"]
    for text in texts:
        lines.append(f'  "{text}": {camel(slugify(text))},')
    lines += ["};", "", "export const vocabAudioSlow: Record<string, number> = {"]
    for text in texts:
        lines.append(f'  "{text}": {camel(slugify(text))}Slow,')
    lines += ["};", ""]
    INDEX_FILE.write_text("\n".join(lines), encoding="utf-8", newline="\n")
    print(f"done: {len(texts)} words -> {INDEX_FILE.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
