"""Test set for pronunciation checking: each word said right and said wrong.

The wrong takes copy common mistakes of Taiwanese learners: e pepet said as
e taling, a dropped final consonant, r said as l, ng said as n. All voiced by
Google's native Indonesian voice (id-ID Chirp 3 HD Kore), so only the sounds
differ. Each take is transcribed back as a sanity check.
"""

import base64
import json
import os
import sys
from pathlib import Path

import httpx
from dotenv import load_dotenv
from openai import OpenAI

HERE = Path(__file__).resolve().parent
load_dotenv(HERE.parent / ".env")

# (word, KBBI lafal, spoken form, label, what is wrong)
SAMPLES = [
    ("sekolah", "/sêkolah/", "sekolah", "right", ""),
    ("sekolah", "/sêkolah/", "sakolah", "wrong", "e pepet said as a"),
    ("sekolah", "/sêkolah/", "sékolah", "wrong?", "e pepet said as e taling (if the voice follows é)"),
    ("menjelaskan", "/mênjêlaskan/", "menjelaskan", "right", ""),
    ("menjelaskan", "/mênjêlaskan/", "menjalaskan", "wrong", "second e pepet said as a"),
    ("menjelaskan", "/mênjêlaskan/", "menjélaskan", "wrong?", "second e said as e taling (if the voice follows é)"),
    ("berbicara", "/bêrbicara/", "berbicara", "right", ""),
    ("berbicara", "/bêrbicara/", "belbicala", "wrong", "r said as l"),
    ("terima", "/têrima/", "terima", "right", ""),
    ("terima", "/têrima/", "telima", "wrong", "r said as l"),
    ("senang", "/sênang/", "senang", "right", ""),
    ("senang", "/sênang/", "senan", "wrong", "final ng said as n"),
    ("dadu", "", "dadu", "right", ""),
    ("dadu", "", "tatu", "wrong", "d said as t"),
    ("bagus", "", "bagus", "right", ""),
    ("bagus", "", "pagus", "wrong", "b said as p"),
    ("baik", "", "baik", "right", ""),
    ("teks", "/téks/", "teks", "right", ""),
]

VOICE = "id-ID-Chirp3-HD-Kore"


def speak(text: str) -> bytes:
    r = httpx.post(
        "https://texttospeech.googleapis.com/v1/text:synthesize",
        params={"key": os.environ["GOOGLE_TTS_API_KEY"]},
        json={
            "input": {"text": text},
            "voice": {"languageCode": "id-ID", "name": VOICE},
            "audioConfig": {"audioEncoding": "MP3"},
        },
        timeout=60,
    )
    r.raise_for_status()
    return base64.b64decode(r.json()["audioContent"])


def main() -> None:
    out = Path(sys.argv[1])
    out.mkdir(parents=True, exist_ok=True)
    client = OpenAI()
    manifest = []
    for i, (word, lafal, spoken, label, problem) in enumerate(SAMPLES):
        path = out / f"{i:02d}-{word}-{label.rstrip('?')}-{spoken}.mp3"
        path.write_bytes(speak(spoken))
        with open(path, "rb") as f:
            heard = client.audio.transcriptions.create(model="gpt-4o-transcribe", file=f, language="id").text
        manifest.append({"file": path.name, "word": word, "lafal": lafal, "spoken": spoken,
                         "label": label, "problem": problem, "heard": heard})
        print(f"{path.name}: heard {heard!r}")
    (out / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
