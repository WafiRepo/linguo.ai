"""Hybrid Practice engine (trial): recordings for Bu Guru, careful listening.

- Bu Guru's lines: line_voice recordings played into the call (no live AI
  voice, so nothing is improvised or skipped).
- The student: each hold-to-talk turn is cut out of the audio (the app
  sends silence while the face isn't held) and transcribed twice by
  gpt-4o-transcribe, language fixed to Indonesian:
    * with a hint (the line the student should say), so "Baik" isn't
      heard as "Bye";
    * without a hint, to tell whether the pronunciation was clear.
  The hinted text goes to the lesson flow; the plain one is kept for judging.
"""

from __future__ import annotations

import asyncio
import io
import logging
import re
import time
import wave
from typing import Any, AsyncIterator, Optional

import numpy as np
from getstream.video.rtc.track_util import PcmData
from vision_agents.core.edge.types import Participant
from vision_agents.core.llm import realtime
from vision_agents.core.llm.llm import LLMResponseFinal

import line_voice

logger = logging.getLogger(__name__)

TRANSCRIBE_MODEL = "gpt-4o-transcribe"
INPUT_RATE = 16000
# A held face sends real microphone samples; a released one sends silence.
ACTIVE_LEVEL = 40          # peak |sample| above this = the mic is open
END_SILENCE_SECONDS = 0.5  # this much silence after a turn ends it
MIN_TURN_SECONDS = 0.35    # shorter = a tap, not an answer
CHUNK_SECONDS = 0.1
VOICE_RMS = 300            # a 20 ms frame louder than this has a voice in it
MIN_VOICE_SECONDS = 0.15   # less voice than this = nothing was said
# While a turn is going on, its words are transcribed about this often.
PARTIAL_EVERY_SECONDS = 1.0
MIN_PARTIAL_SECONDS = 0.6


def _wav(pcm16: bytes, rate: int) -> io.BytesIO:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(pcm16)
    buf.name = "turn.wav"
    buf.seek(0)
    return buf


def is_speech(plain: str) -> bool:
    """The no-hint transcript has Latin words (Indonesian was spoken);
    silence and noise come back empty, as "咳咳" or in another script."""
    return bool(re.search(r"[A-Za-z]{2,}", plain or ""))


def voiced_seconds(pcm16: bytes, rate: int = 16000) -> float:
    """How long the audio is louder than a voice would be (20 ms frames)."""
    samples = np.frombuffer(pcm16, dtype=np.int16).astype(np.float32)
    frame = rate // 50
    count = samples.size // frame
    if count == 0:
        return 0.0
    rms = np.sqrt((samples[: count * frame].reshape(count, frame) ** 2).mean(axis=1))
    return float((rms > VOICE_RMS).sum()) / 50


def changed_words(expected: str, said: str) -> list[tuple[str, str]]:
    """The words of `expected` said differently or left out, with a reason
    for a child: [("salam", "說成 salah 了"), ("Kami", "漏掉了")]."""
    from difflib import SequenceMatcher

    want = re.findall(r"[A-Za-z']+", expected)
    got = re.findall(r"[A-Za-z']+", said)
    matcher = SequenceMatcher(None, [w.lower() for w in want], [w.lower() for w in got])
    out: list[tuple[str, str]] = []
    for op, i1, i2, j1, j2 in matcher.get_opcodes():
        if op == "replace":
            for k, word in enumerate(want[i1:i2]):
                instead = got[j1 + k] if j1 + k < j2 else ""
                out.append((word, f"說成 {instead} 了" if instead else "漏掉了"))
        elif op == "delete":
            out.extend((word, "漏掉了") for word in want[i1:i2])
    return out


def hint_prompt(expected: str) -> str:
    return (
        "A child in Taiwan practising Indonesian answers a teacher. "
        f'The expected answer is: "{expected}". Transcribe exactly what the child says, '
        "in Indonesian spelling."
    )


class HybridEngine(realtime.Realtime):
    provider_name = "hybrid"

    def __init__(self, voice: str = line_voice.FEMALE_VOICE):
        super().__init__(fps=1)
        self.voice = voice
        self._listening = False
        self._expected = ""
        self._turn: list[bytes] = []
        self._turn_samples = 0
        self._silent_since: Optional[float] = None
        self._plain: dict[str, str] = {}
        # The audio of each heard turn (for the pronunciation checks).
        self._audio: dict[str, bytes] = {}
        # Gemini's check of a turn, when it already ran (unsure it was speech).
        self._gemini: dict[str, dict[str, Any]] = {}
        self._openai: Any = None
        # Testers see what was heard and the verdict (set by main.py).
        self.debug_sink: Any = None
        # Gemini's notes on the latest answer, per dialogue: the words with a
        # problem, why (for a child) and what it really heard.
        self.pron_notes: dict[int, dict[str, Any]] = {}
        # Live words while the student talks (set by main.py).
        self.partial_sink: Any = None
        # False: no words while the student talks (only Gemini's, afterwards).
        self.live_words = True
        self._turn_id = 0
        self._partial_busy = False
        self._last_partial_at = 0.0

    # ---- lifecycle ----
    async def connect(self) -> None:
        self._on_connected(session_config={"voice": self.voice}, capabilities=["audio"])

    async def close(self) -> None:
        await self._close_audio_input()
        if self.connected:
            self._on_disconnected()

    async def watch_video_track(self, track: Any, shared_forwarder: Any = None) -> None:
        return None

    # ---- what the lesson flow calls ----
    async def simple_response(self, text: str, participant: Optional[Participant] = None) -> AsyncIterator[LLMResponseFinal]:
        """Bu Guru says a script line: its recording, played in real time."""
        await self.say(text)
        yield LLMResponseFinal()

    async def say(self, text: str) -> None:
        pcm = await line_voice.line_audio(text, self.voice)
        self._emit_agent_speech_started()
        self._emit_agent_speech_transcription(text, mode="delta")
        if pcm:
            step = int(line_voice.SAMPLE_RATE * CHUNK_SECONDS) * 2
            started = time.monotonic()
            for offset in range(0, len(pcm), step):
                chunk = pcm[offset:offset + step]
                if len(chunk) % 2:
                    chunk = chunk[:-1]
                self._emit_audio_output_event(
                    PcmData.from_bytes(chunk, sample_rate=line_voice.SAMPLE_RATE, format="s16", channels=1)
                )
                # Keep pace with real time (a little ahead, so playback never starves).
                ahead = (offset / 2) / line_voice.SAMPLE_RATE - (time.monotonic() - started)
                if ahead > 0.3:
                    await asyncio.sleep(ahead - 0.3)
            rest = (len(pcm) / 2) / line_voice.SAMPLE_RATE - (time.monotonic() - started)
            if rest > 0:
                await asyncio.sleep(rest)
        else:
            logger.error("[hybrid] no recording for %r", text[:50])
        self._emit_audio_output_done_event()
        self._emit_agent_speech_transcription(text, mode="final")
        self._emit_agent_speech_ended()

    async def append_thinking(self, content: str) -> None:
        return None

    async def append_instructions(self, content: str) -> None:
        return None

    async def set_listening(self, listening: bool) -> None:
        self._listening = listening
        if not listening:
            self._reset_turn()

    def expect(self, line: str) -> None:
        """The line the student should say next (the transcription hint)."""
        self._expected = line

    def audio_for(self, hinted: str) -> Optional[bytes]:
        """The audio (16 kHz PCM16) of the turn that was heard as `hinted`."""
        return self._audio.get(hinted.strip())

    def gemini_for(self, hinted: str) -> Optional[dict[str, Any]]:
        """Gemini's check of the turn heard as `hinted`, if it already ran."""
        return self._gemini.get(hinted.strip())

    def plain_for(self, hinted: str) -> Optional[str]:
        """The no-hint transcription of the turn that was heard as `hinted`."""
        return self._plain.get(hinted.strip())

    # ---- listening ----
    async def simple_audio_response(self, pcm: PcmData, participant: Optional[Participant] = None) -> None:
        self._current_participant = participant
        if not self._listening:
            return
        mono = pcm.resample(target_sample_rate=INPUT_RATE, target_channels=1)
        samples = mono.samples
        active = samples.size > 0 and int(np.abs(samples).max()) > ACTIVE_LEVEL
        now = time.monotonic()
        if active:
            if not self._turn:
                self._turn_id += 1
                self._last_partial_at = now
                self._emit_user_speech_started()
            self._turn.append(samples.astype(np.int16).tobytes())
            self._turn_samples += samples.size
            self._silent_since = None
            if (
                self.partial_sink is not None
                and self.live_words
                and not self._partial_busy
                and now - self._last_partial_at >= PARTIAL_EVERY_SECONDS
                and self._turn_samples / INPUT_RATE >= MIN_PARTIAL_SECONDS
            ):
                self._last_partial_at = now
                self._partial_busy = True
                asyncio.create_task(self._live_words(b"".join(self._turn), self._turn_id, self._expected))
            return
        if not self._turn:
            return
        if self._silent_since is None:
            self._silent_since = now
        elif now - self._silent_since >= END_SILENCE_SECONDS:
            audio = b"".join(self._turn)
            seconds = self._turn_samples / INPUT_RATE
            self._reset_turn()
            self._emit_user_speech_ended()
            if seconds >= MIN_TURN_SECONDS:
                asyncio.create_task(self._transcribe_turn(audio, self._expected))

    async def _live_words(self, audio: bytes, turn_id: int, expected: str) -> None:
        """The words so far, shown under the voice wave while the student talks."""
        try:
            text = (await self._transcribe(audio, hint_prompt(expected) if expected else None)).strip()
            # Only for the turn still going on (its final text wins afterwards).
            if text and turn_id == self._turn_id and self._turn and self.partial_sink is not None:
                await self.partial_sink({"type": "transcript_partial", "speaker": "user", "text": text})
        except Exception as e:  # noqa: BLE001
            logger.warning("[hybrid] live words failed: %s", e)
        finally:
            self._partial_busy = False

    def _reset_turn(self) -> None:
        self._turn = []
        self._turn_samples = 0
        self._silent_since = None

    async def _transcribe_turn(self, audio: bytes, expected: str) -> None:
        hinted, plain = await asyncio.gather(
            self._transcribe(audio, hint_prompt(expected) if expected else None),
            self._transcribe(audio, None),
        )
        hinted = (hinted or "").strip()
        plain = (plain or "").strip()
        logger.info("[hybrid] heard %r (no hint: %r), expected %r", hinted, plain, expected)
        print(f"[hybrid] heard {hinted!r} (no hint: {plain!r}), expected {expected!r}")
        if not hinted:
            return
        if not is_speech(plain):
            # Maybe nothing was said (a tap, a cough): with the hint the
            # transcriber invents the expected line. Without it, it sometimes
            # writes real speech in another script. Too quiet: nothing said
            # (Gemini, too, imagines the line in silence); else Gemini decides.
            voice = voiced_seconds(audio)
            if voice < MIN_VOICE_SECONDS:
                print(f"[hybrid] no speech in this turn, ignored (voice {voice:.2f} s)")
                return
            import pron_check

            check = await pron_check.gemini_check(audio, expected)
            if check.get("speech") is False or "error" in check:
                print(f"[hybrid] no speech in this turn, ignored ({check.get('problem') or check.get('error')})")
                return
            self._gemini[hinted] = check
        self._plain[hinted] = plain
        self._audio[hinted] = audio
        self._emit_user_speech_transcription(hinted, mode="delta")
        self._emit_user_speech_transcription(hinted, mode="final")

    async def _transcribe(self, audio: bytes, prompt: Optional[str]) -> str:
        from openai import AsyncOpenAI

        if self._openai is None:
            self._openai = AsyncOpenAI()
        try:
            kwargs: dict[str, Any] = {"model": TRANSCRIBE_MODEL, "file": _wav(audio, INPUT_RATE), "language": "id"}
            if prompt:
                kwargs["prompt"] = prompt
            result = await self._openai.audio.transcriptions.create(**kwargs)
            return result.text
        except Exception as e:  # noqa: BLE001
            logger.warning("[hybrid] transcription failed: %s", e)
            return ""


# ---- Judging an answer (hybrid Practice) ----
GRAY_ZONE_SIMILARITY = 0.5
JUDGE_MODEL = "gpt-4o-mini"


def make_judge(engine: "HybridEngine", tracker: Any, turns: list[dict[str, Any]]):
    """judge(said, index) -> "pass" | "unclear" | "wrong".

    Judged on the hinted transcript (accurate for the words). An answer fits
    only when ALL its words are one of the accepted answers (the comic line,
    or a shorter accepted one like "Baik"): a different word ("Kita" for
    "Kami") or a garbled one ("Bu Kulu") does not fit.
    - it fits: pass
    - it doesn't but it's close: a text model decides, quietly; a word that
      changes the meaning is wrong
    - otherwise: wrong
    The no-hint transcript is NOT used for the grade (on short lines like
    "Baik, Bu Guru" it garbled right answers too).
    Pronunciation: when the words fit, Gemini listens to the audio once; if
    it hears a clear sound error the answer is "unclear" (Bu Guru models the
    line and the student says it again).
    """
    from difflib import SequenceMatcher

    from feedback import _normalize

    def fits(text: str, index: int) -> bool:
        heard = _normalize(text)
        answers = [turns[index]["student"], *(turns[index].get("answers") or [])]
        return bool(heard) and any(heard == _normalize(answer) for answer in answers)

    async def judge(said: str, index: int) -> str:
        expected = turns[index]["student"]
        plain = engine.plain_for(said) or ""
        audio = engine.audio_for(said) if hasattr(engine, "audio_for") else None
        notes = engine.pron_notes if hasattr(engine, "pron_notes") else {}
        notes.pop(index, None)

        async def gemini() -> Optional[dict[str, Any]]:
            # Gemini listens to every answer: the transcript (nudged by the
            # hint) hides sound errors, and Gemini names every wrong word.
            if not audio:
                return None
            import pron_check

            early = engine.gemini_for(said) if hasattr(engine, "gemini_for") else None
            if early is not None:
                return early
            return await pron_check.gemini_verdict(audio, expected)

        async def words_ok() -> bool:
            if fits(said, index):
                return True
            if SequenceMatcher(None, _normalize(said), _normalize(expected)).ratio() >= GRAY_ZONE_SIMILARITY:
                return await _model_accepts(turns[index], said)
            return False

        ok, pron = await asyncio.gather(words_ok(), gemini())
        sound_error = pron is not None and pron.get("correct") is False
        only_final = bool(pron and pron.get("problems")) and all(
            p.get("final_only") for p in (pron or {}).get("problems", []))
        if ok and sound_error and only_final and fits(plain, index):
            # Heard exactly right even without the hint, and Gemini only
            # complains about soft final consonants (the r of "belajar"): it
            # is too strict there. Other errors stand even then: the
            # transcriber spells "inggat" as "ingat".
            print(f"[hybrid] dialogue {index}: no-hint transcript is exact, Gemini overruled ({pron.get('problem')})")
            sound_error = False
            overruled = True
        else:
            overruled = False
        if not ok:
            verdict = "wrong"
        elif sound_error:
            verdict = "unclear"
        else:
            verdict = "pass"
        if sound_error and pron is not None:
            problems = pron.get("problems") or (
                [{"word": pron.get("word", ""), "problem_zh": pron.get("problem_zh", "")}] if pron.get("word") else [])
            notes[index] = {
                "words": [p["word"] for p in problems if p.get("word")],
                "problem": "；".join(
                    f"{p['word']}：{p['problem_zh']}" if p.get("word") else p["problem_zh"]
                    for p in problems if p.get("problem_zh")
                ),
                # What Gemini heard in plain letters (it matches the correction);
                # the no-hint transcript if it gave none.
                "heard": pron.get("heard_text") or plain,
            }
        if verdict == "wrong":
            # A different word ("salah" for "salam") shows in the transcript;
            # Gemini, expecting the line, may not name it. Mark it too.
            swapped = changed_words(expected, said)
            if swapped:
                note = notes.setdefault(index, {"words": [], "problem": "",
                                                "heard": (pron or {}).get("heard_text") or said})
                for word, reason in swapped:
                    if word not in note["words"]:
                        note["words"].append(word)
                        note["problem"] = "；".join(filter(None, [note["problem"], f"{word}：{reason}"]))
        # "You:" shows what Gemini heard for every answer (the hinted
        # transcript leans toward the right line); when Gemini was overruled,
        # the exact no-hint transcript.
        # If Gemini gave nothing (an error, a timeout), the transcript.
        heard_text = (plain if overruled else (pron or {}).get("heard_text", "")) or said
        sink_words = getattr(engine, "partial_sink", None)
        if heard_text and sink_words is not None:
            try:
                await sink_words({"type": "user_heard", "turnIndex": index, "text": heard_text})
            except Exception as e:  # noqa: BLE001
                logger.warning("[hybrid] heard event failed: %s", e)
        problem = f" ({pron.get('problem')})" if sound_error and pron else ""
        print(f"[hybrid] judge dialogue {index}: {said!r} / plain {plain!r} -> {verdict}{problem}")
        sink = getattr(engine, "debug_sink", None)
        if sink is not None:
            try:
                await sink({"type": "hearing", "turnIndex": index, "expected": expected,
                            "hinted": said, "plain": plain, "verdict": verdict})
            except Exception as e:  # noqa: BLE001
                logger.warning("[hybrid] hearing event failed: %s", e)
            if audio:
                asyncio.create_task(_pronunciation_report(sink, index, said, expected, audio, pron))
        return verdict

    return judge


async def _pronunciation_report(
    sink: Any, index: int, said: str, expected: str, audio: bytes, pron: Optional[dict[str, Any]]
) -> None:
    """Gemini (from the judge) and wav2vec2: logged and shown to testers."""
    import pron_check

    phonemes = await pron_check.WORKER.check(audio, expected)
    if pron is None:
        gemini: dict[str, Any] = {"note": "words did not fit; sounds not checked"}
    else:
        first = (pron.get("runs") or [{}])[0]
        gemini = {"correct": pron["correct"], "problem": pron.get("problem") or first.get("problem", ""),
                  "heard": first.get("heard", ""), "runs": [r.get("correct") for r in pron.get("runs", [])]}
    print(f"[pron] dialogue {index} {said!r}: gemini {gemini} | phonemes {phonemes}")
    try:
        await sink({"type": "hearing_pron", "turnIndex": index, "hinted": said,
                    "gemini": gemini, "phonemes": phonemes})
    except Exception as e:  # noqa: BLE001
        logger.warning("[hybrid] pronunciation event failed: %s", e)


async def _model_accepts(turn: dict[str, Any], said: str) -> bool:
    from openai import AsyncOpenAI

    accepted = ", ".join(f'"{a}"' for a in turn.get("answers") or []) or "none"
    question = (
        "A child practising Indonesian answers the teacher in a comic dialogue.\n"
        f'Teacher: "{turn["guru"]}"\nComic answer: "{turn["student"]}"\n'
        f"Also accepted: {accepted}\nThe child said: \"{said}\"\n"
        "Is the child's answer acceptable? It must mean exactly the same as the comic answer in "
        "correct Indonesian. A missing or added polite word (Bu Guru, Pak Guru) is fine. A word "
        "that changes the meaning is NOT fine (e.g. 'kita' vs 'kami', 'sudah' vs 'belum', "
        "another person or object). Reply only yes or no."
    )
    try:
        result = await AsyncOpenAI().chat.completions.create(
            model=JUDGE_MODEL,
            messages=[{"role": "user", "content": question}],
            max_tokens=3,
            temperature=0,
        )
        return (result.choices[0].message.content or "").strip().lower().startswith("y")
    except Exception as e:  # noqa: BLE001
        logger.warning("[hybrid] judge model failed: %s", e)
        return False
