"""Original background music for the onboarding video (no third-party audio).

A light, cheerful loop at 104 BPM in C major: soft pad chords
(C - G - Am - F), a round bass, a plucked marimba-like melody and a gentle
shaker. Written to public/onboarding/music.mp3 (via ffmpeg).

    py -3 scripts/make_onboarding_music.py
"""

import subprocess
import wave
from pathlib import Path

import numpy as np

RATE = 44100
BPM = 104
BEAT = 60 / BPM
SECONDS = 54
OUT = Path(__file__).resolve().parent.parent / "public" / "onboarding"

N = int(RATE * SECONDS)
left = np.zeros(N)
right = np.zeros(N)


def note_freq(name: str) -> float:
    names = {"C": -9, "D": -7, "E": -5, "F": -4, "G": -2, "A": 0, "B": 2}
    letter, octave = name[0], int(name[-1])
    semis = names[letter] + (1 if "#" in name else 0) + (octave - 4) * 12
    return 440.0 * 2 ** (semis / 12)


def add(signal: np.ndarray, start: float, pan: float = 0.0, gain: float = 1.0) -> None:
    i = int(start * RATE)
    if i >= N:
        return
    seg = signal[: N - i] * gain
    left[i:i + len(seg)] += seg * (1 - pan) / 2 * 2 ** 0.5
    right[i:i + len(seg)] += seg * (1 + pan) / 2 * 2 ** 0.5


def env(length: float, attack: float, release: float) -> np.ndarray:
    n = int(length * RATE)
    e = np.ones(n)
    a = max(1, int(attack * RATE))
    r = max(1, int(release * RATE))
    e[:a] = np.linspace(0, 1, a)
    e[-r:] *= np.linspace(1, 0, r)
    return e


def pad(freqs: list[float], length: float) -> np.ndarray:
    t = np.arange(int(length * RATE)) / RATE
    s = sum(np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2 * f * t + 0.5) for f in freqs)
    return s / len(freqs) * env(length, 0.25, 0.6) * 0.16


def pluck(f: float, length: float = 0.5) -> np.ndarray:
    t = np.arange(int(length * RATE)) / RATE
    s = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 4 * f * t) * np.exp(-t * 30)
    return s * np.exp(-t * 7) * 0.32


def bass(f: float, length: float) -> np.ndarray:
    t = np.arange(int(length * RATE)) / RATE
    s = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * 2 * f * t)
    return s * env(length, 0.01, 0.15) * np.exp(-t * 1.5) * 0.3


def shaker(length: float = 0.08) -> np.ndarray:
    n = int(length * RATE)
    noise = np.random.default_rng(7).normal(0, 1, n)
    noise = np.diff(noise, prepend=0)  # brighter
    return noise * np.exp(-np.arange(n) / RATE * 60) * 0.05


CHORDS = [
    (["C4", "E4", "G4"], "C2"),
    (["B3", "D4", "G4"], "G2"),
    (["C4", "E4", "A4"], "A2"),
    (["C4", "F4", "A4"], "F2"),
]
# One bar of melody per chord (eighth notes; None = rest).
MELODY = [
    ["E5", None, "G5", "E5", "D5", None, "C5", "D5"],
    ["D5", None, "B4", "D5", "G5", None, "D5", None],
    ["C5", None, "E5", "A5", "G5", "E5", "C5", None],
    ["A4", "C5", "F5", None, "E5", "D5", "C5", None],
]
MELODY_B = [
    ["G5", "E5", "C5", "E5", "G5", None, "A5", "G5"],
    ["D5", None, "G5", None, "B4", "D5", "G4", None],
    ["E5", "C5", "A4", "C5", "E5", None, "D5", "C5"],
    ["F5", None, "A5", "F5", "E5", None, "D5", None],
]

bar = BEAT * 4
t = 0.0
bar_index = 0
while t < SECONDS:
    chord, root = CHORDS[bar_index % 4]
    add(pad([note_freq(n) for n in chord], bar + 0.3), t, pan=0.0)
    add(bass(note_freq(root), BEAT * 1.8), t)
    add(bass(note_freq(root), BEAT * 1.8), t + BEAT * 2)
    if bar_index >= 2:  # the melody joins after two bars
        melody = (MELODY if (bar_index // 4) % 2 == 0 else MELODY_B)[bar_index % 4]
        for k, n in enumerate(melody):
            if n:
                add(pluck(note_freq(n)), t + k * BEAT / 2, pan=0.25 if k % 2 else -0.25)
    if bar_index >= 1:
        for k in range(8):
            add(shaker(), t + k * BEAT / 2, pan=-0.4 if k % 2 else 0.4, gain=1.4 if k % 2 else 0.8)
    t += bar
    bar_index += 1

# Fade in and out, normalise gently.
fade_in = int(1.5 * RATE)
fade_out = int(3.0 * RATE)
for ch in (left, right):
    ch[:fade_in] *= np.linspace(0, 1, fade_in)
    ch[-fade_out:] *= np.linspace(1, 0, fade_out)
peak = max(np.abs(left).max(), np.abs(right).max())
stereo = np.stack([left, right], axis=1) / peak * 0.8
pcm = (stereo * 32767).astype("<i2")

OUT.mkdir(parents=True, exist_ok=True)
wav_path = OUT / "music.wav"
with wave.open(str(wav_path), "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(RATE)
    w.writeframes(pcm.tobytes())
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(wav_path), "-b:a", "192k", str(OUT / "music.mp3")], check=True)
wav_path.unlink()
print("wrote", OUT / "music.mp3")
