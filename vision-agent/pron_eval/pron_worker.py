"""Phoneme check worker for the hybrid Practice trial (server only).

Runs in its own venv (~/pron-eval-venv, with torch + transformers) so the
voice agent's environment stays untouched. The agent starts it as a child
process and talks over stdin/stdout, one JSON object per line. No network
listener.

Request:  {"id": 1, "line": "Baik, Bu Guru.", "pcm16": "<base64 16 kHz mono PCM16>"}
Response: {"id": 1, "correct": true, "problems": [], "heard": "b a i ...", "want": "b a i ʔ ..."}
"""

from __future__ import annotations

import base64
import json
import re
import sys

import numpy as np
import torch
from transformers import AutoProcessor, Wav2Vec2ForCTC

from phoneme_check import MODEL, check, expected_phones, normalize


def main() -> None:
    processor = AutoProcessor.from_pretrained(MODEL)
    model = Wav2Vec2ForCTC.from_pretrained(MODEL).eval()
    torch.set_num_threads(4)
    print(json.dumps({"ready": True}), flush=True)
    for raw in sys.stdin:
        try:
            request = json.loads(raw)
            audio = np.frombuffer(base64.b64decode(request["pcm16"]), dtype=np.int16).astype(np.float32) / 32768.0
            inputs = processor(audio, sampling_rate=16000, return_tensors="pt")
            with torch.no_grad():
                ids = torch.argmax(model(inputs.input_values).logits, dim=-1)
            heard = normalize(processor.batch_decode(ids)[0].split())
            want: list[str] = []
            for word in re.findall(r"[A-Za-z]+", request["line"]):
                want += expected_phones(word)
            ok, problems = check(want, heard)
            reply = {"id": request.get("id"), "correct": ok, "problems": problems,
                     "heard": " ".join(heard), "want": " ".join(want)}
        except Exception as e:  # noqa: BLE001 - answer every request
            reply = {"id": None, "error": str(e)[:200]}
        print(json.dumps(reply, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    main()
