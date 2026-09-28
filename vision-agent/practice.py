"""Latihan (practice) for a class-management comic: Listen → Repeat → Answer.

The server drives the steps. Script lines are voiced as written (GPT-Live
commentary); the model itself only praises or corrects each attempt.
"""

from __future__ import annotations

import asyncio
import logging
import time
from dataclasses import dataclass, field
from typing import Any, Awaitable, Callable, Optional

from feedback import _normalize
from roleplay import (
    CORRECTION_GRACE_SECONDS,
    SAFETY_RULES,
    RoleplayController,
    _clip,
    ai_accepted_answer,
    comic_correction_note,
    is_answer_attempt,
    objective_matched,
)

logger = logging.getLogger(__name__)

# After this many misses in one step, Bu Guru models the line and moves on.
MAX_STEP_ATTEMPTS = 3
# Longest wait for Bu Guru to finish a scripted line before opening the mic.
SPEECH_WAIT_SECONDS = 15.0


def build_comic_practice_prompt(
    turns: list[dict[str, Any]],
    help_language: str,
    topic_title: str = "",
) -> str:
    script = "\n".join(
        f'{index + 1}. TEACHER: "{turn["guru"]}" → STUDENT: "{turn["student"]}"'
        for index, turn in enumerate(turns)
    )
    title = f' ("{_clip(topic_title)}")' if topic_title else ""
    return (
        "You are Bu Guru, a warm, patient Indonesian primary-school teacher coaching a child "
        "who is a beginner (A1) learner of Bahasa Indonesia. Together you are practising the "
        f"lines of a short classroom comic{title}, one dialogue at a time.\n\n"
        f"COMIC SCRIPT:\n{script}\n\n"
        "HOW THIS SESSION WORKS:\n"
        "- The app walks through the steps (listen, repeat, answer from memory) and gives you "
        "the exact lines to say. Say them as given. NEVER start the next step, the next line "
        "or a new explanation on your own.\n"
        "- After each student attempt, react in ONE short reply:\n"
        "  • Right: only a few warm words (\"Bagus!\", \"Pintar!\"). Nothing else.\n"
        "  • Wrong words: start with \"Hampir!\", say the correct student line once, plus ONE "
        f"short tip in {help_language} about what was different.\n"
        "  • Clearly mispronounced word: start with \"Hampir!\", say that word slowly syllable by "
        f"syllable (e.g. \"Gu-ru\"), plus ONE short tip in {help_language} on how to say it.\n"
        "- Never praise and correct in the same reply. Only correct clear mistakes, never an accent.\n"
        f"- If the student asks something in {help_language}, answer in one short sentence.\n"
        "- You may get quiet CORRECTION notes; correct at most once per attempt.\n\n"
        f"{SAFETY_RULES}"
    )


def listen_line(turn: dict[str, Any]) -> str:
    meaning = f" 意思是「{turn['student_zh']}」。" if turn["student_zh"] else ""
    return (
        f'Dengar ya. Bu Guru bilang: "{turn["guru"]}". Kamu jawab: "{turn["student"]}".'
        f'{meaning} Sekarang tiru: "{turn["student"]}".'
    )


def answer_prompt_line(turn: dict[str, Any]) -> str:
    return f'Sekarang tanpa melihat teks. {turn["guru"]}'


def stars_for(wrong_attempts: int) -> int:
    if wrong_attempts == 0:
        return 3
    if wrong_attempts <= 2:
        return 2
    return 1


@dataclass
class ComicPractice:
    turns: list[dict[str, Any]]
    controller: RoleplayController
    send_event: Callable[[dict[str, Any]], Awaitable[None]]
    say: Callable[[str], Awaitable[None]]
    note: Optional[Callable[[str], Awaitable[None]]]
    help_language: str
    index: int = 0
    step: str = "listen"
    wrong: int = 0
    step_wrong: int = 0
    stars: list[int] = field(default_factory=list)
    _pending: Optional[asyncio.Task] = None

    async def start(self) -> None:
        await self._begin_dialogue(0)

    def close(self) -> None:
        if self._pending is not None:
            self._pending.cancel()

    async def on_answer(self, text: str) -> None:
        if self.step not in ("repeat", "answer") or not is_answer_attempt(text):
            return
        if self._pending is not None:
            self._pending.cancel()
        started_at = self.controller.user_started_at
        self._pending = asyncio.create_task(
            self._resolve(text, self.index, self.step, started_at)
        )

    async def _resolve(self, said: str, index: int, step: str, started_at: Optional[float]) -> None:
        # Let the AI react first: it hears the audio, the transcript may mishear.
        await asyncio.sleep(CORRECTION_GRACE_SECONDS)
        if (self.index, self.step) != (index, step):
            return
        turn = self.turns[index]
        agent_text = self.controller.agent_text_since(started_at) if started_at else ""
        if objective_matched(said, turn["answers"]) or ai_accepted_answer(agent_text):
            await self._passed()
            return

        self.wrong += 1
        self.step_wrong += 1
        await self.send_event({
            "type": "roleplay_correction",
            "turnIndex": index,
            "said": said[:120],
            "step": step,
            "attempt": self.step_wrong,
        })
        if self.step_wrong >= MAX_STEP_ATTEMPTS:
            await self._speak_and_wait(f'Dengar ya: "{turn["student"]}". Tidak apa-apa, kita lanjut.')
            await self._passed()
            return
        if self.note is not None:
            note = comic_correction_note(said, turn["student"], self.help_language, agent_text)
            if note:
                await self.note(note)

    async def _passed(self) -> None:
        turn = self.turns[self.index]
        self.step_wrong = 0
        if self.step == "repeat":
            await self._set_step("answer-intro")
            await self._speak_and_wait(answer_prompt_line(turn))
            await self._set_step("answer")
            return

        stars = stars_for(self.wrong)
        self.stars.append(stars)
        await self.send_event({"type": "practice_result", "turnIndex": self.index, "stars": stars})
        await self.controller.complete_current()
        if self.index + 1 < len(self.turns):
            await self._begin_dialogue(self.index + 1)
        else:
            await self._set_step("done")
            await self.say("Latihan selesai. Kamu hebat! Terima kasih sudah berlatih.")

    async def _begin_dialogue(self, index: int) -> None:
        self.index, self.wrong, self.step_wrong = index, 0, 0
        await self._set_step("listen")
        await self._speak_and_wait(listen_line(self.turns[index]))
        await self._set_step("repeat")

    async def _set_step(self, step: str) -> None:
        self.step = step
        await self.send_event({"type": "practice_step", "turnIndex": self.index, "step": step})

    async def _speak_and_wait(self, text: str) -> None:
        """Voice a script line, then wait until Bu Guru has finished saying it
        so the mic only opens when it's the student's turn. A short reaction
        ("Bagus!") finishing meanwhile must not count, so wait for speech that
        contains the line's last words."""
        # Compared without spaces: streamed fragments can split words ("melanjut" + "kan").
        tail = "".join(_normalize(text).split()[-2:])
        started = time.monotonic()
        deadline = started + SPEECH_WAIT_SECONDS
        await self.say(text)
        while time.monotonic() < deadline:
            self.controller.agent_spoke.clear()
            spoken = _normalize(self.controller.agent_text_since(started)).replace(" ", "")
            if tail and tail in spoken:
                return
            try:
                await asyncio.wait_for(
                    self.controller.agent_spoke.wait(), max(0.1, deadline - time.monotonic())
                )
            except asyncio.TimeoutError:
                break
        logger.warning("[practice] line not confirmed as spoken: %r", text[:40])
