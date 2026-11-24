"""Phoneme-level pronunciation check with wav2vec2 (runs on the server only).

    ~/pron-eval-venv/bin/python phoneme_check.py <samples dir>

A multilingual phoneme recognizer (facebook/wav2vec2-xlsr-53-espeak-cv-ft)
writes down the SOUNDS it hears in IPA. The expected sounds come from the KBBI
lafal in data/pronunciation.json (ê -> ə, é -> e). Both are aligned sound by
sound and the typical learner mistakes are flagged: e pepet said as e/a,
r as l, ng as n, b as p, d as t.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

import numpy as np
import torch
from transformers import AutoProcessor, Wav2Vec2ForCTC

MODEL = "facebook/wav2vec2-xlsr-53-espeak-cv-ft"
GUIDE = Path(os.environ.get("PRON_GUIDE") or Path(__file__).resolve().parents[2] / "data" / "pronunciation.json")

# Sound pairs that count as a real mistake when one is heard for the other.
CONFUSIONS = {
    ("ə", "e"): "e pepet said as e taling",
    ("ə", "a"): "e pepet said as a",
    ("ə", "o"): "e pepet said as o",
    ("r", "l"): "r said as l",
    ("ŋ", "n"): "ng said as n",
    ("b", "p"): "b said as p",
    ("d", "t"): "d said as t",
    ("e", "ə"): "e taling said as e pepet",
}


def load_audio(path: Path) -> np.ndarray:
    raw = subprocess.run(
        ["ffmpeg", "-v", "quiet", "-i", str(path), "-ac", "1", "-ar", "16000", "-f", "f32le", "-"],
        check=True, capture_output=True,
    ).stdout
    return np.frombuffer(raw, dtype=np.float32)


def normalize(phones: list[str]) -> list[str]:
    """Fold the recognizer's fine distinctions into the ones that matter here."""
    fold = {"ɛ": "e", "ɾ": "r", "ʁ": "r", "ɹ": "r", "ɐ": "a", "ɑ": "a", "ɔ": "o", "ɪ": "i", "ʊ": "u",
            "ɡ": "g", "ʲ": "", "ʰ": "", "ˈ": "", "ˌ": "", "ː": "", "ʃ": "ʃ"}
    out = []
    for p in phones:
        p = "".join(fold.get(ch, ch) for ch in p)
        if not p:
            continue
        # Affricates may come split.
        if out and out[-1] == "t" and p == "ʃ":
            out[-1] = "tʃ"
        elif out and out[-1] == "d" and p == "ʒ":
            out[-1] = "dʒ"
        else:
            out.append(p)
    return out


def expected_phones(word: str) -> list[str]:
    entry = json.loads(GUIDE.read_text(encoding="utf-8"))["words"].get(word.lower(), {})
    text = (entry.get("lafal") or word).strip("/").lower().replace(" ", "")
    phones, i = [], 0
    pairs = {"ng": "ŋ", "ny": "ɲ", "sy": "ʃ", "kh": "x"}
    single = {"c": "tʃ", "j": "dʒ", "y": "j", "ê": "ə", "é": "e", "e": "ə"}
    while i < len(text):
        if text[i:i + 2] in pairs:
            phones.append(pairs[text[i:i + 2]])
            i += 2
            continue
        phones.append(single.get(text[i], text[i]))
        i += 1
    if phones and phones[-1] == "k":
        phones[-1] = "ʔ"  # a final k is a glottal stop
    return phones


def align(expected: list[str], heard: list[str]) -> list[tuple[str | None, str | None]]:
    n, m = len(expected), len(heard)
    cost = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n + 1):
        cost[i][0] = i
    for j in range(m + 1):
        cost[0][j] = j
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            same = expected[i - 1] == heard[j - 1]
            cost[i][j] = min(cost[i - 1][j] + 1, cost[i][j - 1] + 1, cost[i - 1][j - 1] + (0 if same else 1))
    pairs, i, j = [], n, m
    while i > 0 or j > 0:
        if i > 0 and j > 0 and cost[i][j] == cost[i - 1][j - 1] + (0 if expected[i - 1] == heard[j - 1] else 1):
            pairs.append((expected[i - 1], heard[j - 1]))
            i, j = i - 1, j - 1
        elif i > 0 and cost[i][j] == cost[i - 1][j] + 1:
            pairs.append((expected[i - 1], None))
            i -= 1
        else:
            pairs.append((None, heard[j - 1]))
            j -= 1
    return pairs[::-1]


def check(expected: list[str], heard: list[str]) -> tuple[bool, list[str]]:
    problems = []
    for want, got in align(expected, heard):
        if want and got and want != got and (want, got) in CONFUSIONS:
            problems.append(CONFUSIONS[(want, got)])
        if want == "ʔ" or got == "ʔ":
            continue  # a final k may be heard as ʔ, k or nothing
    errors = sum(1 for w, g in align(expected, heard) if w != g and "ʔ" not in (w, g))
    rate = errors / max(1, len(expected))
    if rate > 0.4 and not problems:
        problems.append(f"many sounds differ ({rate:.0%})")
    return not problems, problems


def main() -> None:
    folder = Path(sys.argv[1])
    manifest = json.loads((folder / "manifest.json").read_text(encoding="utf-8"))
    processor = AutoProcessor.from_pretrained(MODEL)
    model = Wav2Vec2ForCTC.from_pretrained(MODEL).eval()
    right = 0
    for item in manifest:
        audio = load_audio(folder / item["file"])
        inputs = processor(audio, sampling_rate=16000, return_tensors="pt")
        with torch.no_grad():
            ids = torch.argmax(model(inputs.input_values).logits, dim=-1)
        heard_text = processor.batch_decode(ids)[0]
        heard = normalize(heard_text.split())
        want = expected_phones(item["word"])
        ok, problems = check(want, heard)
        expected_ok = item["label"] == "right"
        good = ok == expected_ok
        right += good
        print(f"{'OK ' if good else 'BAD'} {item['spoken']:<12} ({item['label']:<6}) want {' '.join(want):<24} "
              f"heard {' '.join(heard):<26} -> {'correct' if ok else 'WRONG: ' + '; '.join(problems)}")
    print(f"wav2vec2: {right}/{len(manifest)} right ({100 * right / len(manifest):.0f}%)")


if __name__ == "__main__":
    main()
