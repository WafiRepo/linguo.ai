"""Ask Gemini (audio in, JSON out) whether each test take is pronounced right.

Usage: python judge_gemini.py <samples dir> [model ...]
Each take is judged RUNS times per model; prints accuracy and consistency.
"""

import json
import sys
import time
from collections import Counter
from pathlib import Path

from dotenv import load_dotenv
from google import genai
from google.genai import types

HERE = Path(__file__).resolve().parent
load_dotenv(HERE.parent / ".env")
sys.path.insert(0, str(HERE.parent))
from pronunciation import sounded_syllables  # noqa: E402

RUNS = 3

PROMPT = """You are a strict Indonesian pronunciation examiner for children learning Indonesian in Taiwan.
Listen to the audio. The child was asked to say the Indonesian word: "{word}".
Correct pronunciation (KBBI): syllables {syllables}{lafal}. Notation: ə = e pepet (short neutral "uh"), é/e = e taling ("eh").
Judge ONLY the sounds, not the voice, speed or accent quality. Standard Indonesian: a final k is a glottal
stop [ʔ] (baik = [baiʔ]) and a final h is soft - both are CORRECT. Mark it wrong only for a clear sound error,
such as: e pepet said as "é" or "a", r said as l, ng said as n, b said as p, d said as t.
If you are not sure, answer correct.
Return JSON: {{"heard": "<what you heard, in IPA>", "correct": true|false, "problem": "<short reason, empty if correct>"}}"""


def judge(client: genai.Client, model: str, audio: bytes, word: str, lafal: str) -> dict:
    prompt = PROMPT.format(
        word=word,
        syllables=sounded_syllables(word),
        lafal=f", lafal {lafal}" if lafal else "",
    )
    response = client.models.generate_content(
        model=model,
        contents=[types.Part.from_bytes(data=audio, mime_type="audio/mp3"), prompt],
        config=types.GenerateContentConfig(response_mime_type="application/json", temperature=0),
    )
    return json.loads(response.text)


def main() -> None:
    folder = Path(sys.argv[1])
    models = sys.argv[2:] or ["gemini-3.8-flash", "gemini-2.5-flash"]
    manifest = json.loads((folder / "manifest.json").read_text(encoding="utf-8"))
    client = genai.Client()
    for model in models:
        right = total = steady = 0
        print(f"\n=== {model} ===")
        for item in manifest:
            audio = (folder / item["file"]).read_bytes()
            verdicts, notes = [], []
            for _ in range(RUNS):
                try:
                    result = judge(client, model, audio, item["word"], item["lafal"])
                    verdicts.append(bool(result.get("correct")))
                    notes.append(f"{result.get('heard', '')} | {result.get('problem', '')}")
                except Exception as e:  # noqa: BLE001
                    verdicts.append(None)
                    notes.append(f"error {str(e)[:60]}")
                time.sleep(0.5)
            if item["label"] == "wrong?":
                expected = False
            else:
                expected = item["label"] == "right"
            ok = sum(1 for v in verdicts if v == expected)
            right += ok
            total += len(verdicts)
            steady += len(set(verdicts)) == 1
            mark = "OK " if ok == RUNS else ("~  " if ok else "BAD")
            print(f"{mark} {item['spoken']:<12} ({item['label']:<5}) -> {Counter(verdicts).most_common()}  {notes[0][:90]}")
        print(f"{model}: {right}/{total} judgements right ({100 * right / total:.0f}%), "
              f"consistent on {steady}/{len(manifest)} takes")


if __name__ == "__main__":
    main()
