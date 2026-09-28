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
from pronunciation import indonesian_pronunciation_rules
from roleplay import (
    CORRECTION_GRACE_SECONDS,
    SAFETY_RULES,
    RoleplayController,
    _clip,
    ai_accepted_answer,
    ai_corrected_answer,
    comic_correction_note,
    comic_phrases,
    is_answer_attempt,
    is_chinese_help,
    objective_hit,
)

logger = logging.getLogger(__name__)

# After this many misses in one step, Bu Guru models the line and moves on.
MAX_STEP_ATTEMPTS = 3
# Longest wait for Bu Guru to finish a scripted line before it's the
# student's turn (the listen line alone runs ~12 s, and she may start late).
SPEECH_WAIT_SECONDS = 30.0
# If Bu Guru hasn't made a sound this long after a script line, resend it once.
SILENT_RESEND_SECONDS = 12.0
# When the transcript already matches, give the AI this long to object
# (she hears pronunciation we can't) before moving on.
MATCH_OBJECTION_SECONDS = 0.8
VERDICT_POLL_SECONDS = 0.2
# Steps where the model hears the student; otherwise its input is muted so
# room noise can't interrupt Bu Guru mid-line.
LISTENING_STEPS = ("repeat", "answer")


def build_comic_practice_prompt(
    turns: list[dict[str, Any]],
    help_language: str,
    topic_title: str = "",
    teacher_name: str = "Bu Guru",
) -> str:
    script = "\n".join(
        f'{index + 1}. TEACHER: "{turn["guru"]}" → STUDENT: "{turn["student"]}"'
        for index, turn in enumerate(turns)
    )
    title = f' ("{_clip(topic_title)}")' if topic_title else ""
    zh = is_chinese_help(help_language)
    praise_example = "「很好！」「好棒！」" if zh else '"Great!", "Well done!"'
    almost_example = "「差一點！」" if zh else '"Almost!"'
    return (
        f"You are {teacher_name}, a warm, patient Indonesian primary-school teacher coaching a child "
        "who is a beginner (A1) learner of Bahasa Indonesia. Together you are practising the "
        f"lines of a short classroom comic{title}, one dialogue at a time.\n\n"
        f"COMIC SCRIPT:\n{script}\n\n"
        "HOW THIS SESSION WORKS:\n"
        "- The app walks through the steps (listen, repeat, answer from memory) and gives you "
        "the exact lines to say. Say them as given. NEVER start the next step, the next line "
        "or a new explanation on your own.\n"
        f"- LANGUAGE: everything you say yourself — praise, corrections, tips — is in "
        f"{help_language}. Only the Indonesian comic lines being practised are in Indonesian.\n"
        "- After each student attempt, react in ONE short reply:\n"
        f"  • Right: only a few warm words in {help_language} (e.g. {praise_example}). Nothing "
        "else.\n"
        f"  • Wrong words: start gently in {help_language} (e.g. {almost_example}), say the "
        "correct Indonesian student line once, plus ONE short tip about what was different.\n"
        "  • Clearly mispronounced word: start the same way, say that word slowly syllable by "
        "syllable (e.g. \"Gu-ru\"), plus ONE short tip on how to say it.\n"
        "- Never praise and correct in the same reply. Only correct clear mistakes, never an accent.\n"
        f"- If the student asks something in {help_language}, answer in one short sentence.\n"
        "- You may get quiet CORRECTION notes; correct at most once per attempt.\n\n"
        f"{indonesian_pronunciation_rules(comic_phrases(turns), help_language)}\n\n"
        f"{SAFETY_RULES}"
    )


# Script lines are framed in the help language (the child's language); only the
# Indonesian comic lines stay Indonesian. No punctuation after quoted lines:
# Bu Guru reads them out, and `"…".` / `「…。」。` came out doubled.
def listen_line(turn: dict[str, Any], help_language: str) -> str:
    guru, student = turn["guru"], turn["student"]
    if is_chinese_help(help_language):
        meaning_zh = turn["student_zh"].rstrip("。.")
        meaning = f"意思是「{meaning_zh}」。" if meaning_zh else ""
        return f"仔細聽。老師說：「{guru}」你回答：「{student}」{meaning}現在跟著說：「{student}」"
    return f'Listen. The teacher says: "{guru}" You answer: "{student}" Now repeat: "{student}"'


def answer_prompt_line(turn: dict[str, Any], help_language: str) -> str:
    if is_chinese_help(help_language):
        return f"現在不看文字。{turn['guru']}"
    return f"Now without the text. {turn['guru']}"


def modeled_line(turn: dict[str, Any], help_language: str) -> str:
    if is_chinese_help(help_language):
        return f"聽好：「{turn['student']}」沒關係，我們繼續。"
    return f'Listen: "{turn["student"]}" That\'s okay, let\'s go on.'


def closing_line(help_language: str) -> str:
    if is_chinese_help(help_language):
        return "練習完成了，你很棒！謝謝你認真練習。"
    return "Practice finished. You did great! Thank you for practising."


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
    # Turns the model's hearing of the student on/off (None: always on).
    set_listening: Optional[Callable[[bool], Awaitable[None]]] = None
    index: int = 0
    step: str = "listen"
    wrong: int = 0
    step_wrong: int = 0
    stars: list[int] = field(default_factory=list)
    _pending: Optional[asyncio.Task] = None
    _attempt_parts: list[str] = field(default_factory=list)
    _attempt_started_at: Optional[float] = None

    async def start(self) -> None:
        await self._begin_dialogue(0)

    def close(self) -> None:
        if self._pending is not None:
            self._pending.cancel()

    async def on_answer(self, text: str) -> None:
        if self.step not in ("repeat", "answer") or not is_answer_attempt(text):
            return
        # A pause splits one answer into pieces ("Selamat" … "pagi"). Pieces
        # arriving while the previous one is still being judged belong to the
        # same attempt, so judge them together.
        if self._pending is not None and not self._pending.done():
            self._pending.cancel()
            self._attempt_parts.append(text)
        else:
            self._attempt_parts = [text]
            self._attempt_started_at = self.controller.user_started_at
        self._pending = asyncio.create_task(
            self._resolve(
                " ".join(self._attempt_parts), self.index, self.step, self._attempt_started_at
            )
        )

    async def _resolve(self, said: str, index: int, step: str, started_at: Optional[float]) -> None:
        turn = self.turns[index]
        objective = self.controller.tracker.objectives[index]
        matched = objective_hit(objective, said)
        agent_text = await self._await_ai_verdict(matched, started_at)
        if (self.index, self.step) != (index, step):
            return
        # The AI hears the audio while we only have a transcript: a correction
        # from it wins over a text match, and its praise wins over a mismatch.
        if (matched and not ai_corrected_answer(agent_text)) or ai_accepted_answer(agent_text):
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
            await self._speak_and_wait(
                modeled_line(turn, self.help_language), confirm=turn["student"]
            )
            await self._passed()
            return
        if self.note is not None:
            note = comic_correction_note(said, turn["student"], self.help_language, agent_text)
            if note:
                await self.note(note)

    async def _await_ai_verdict(self, matched: bool, started_at: Optional[float]) -> str:
        """Wait (at most the grace period) for the AI's reaction to the answer
        and return what it said. Stops early once the outcome is clear, so a
        right answer moves on right after the praise instead of after a fixed
        pause: the AI praised or corrected, or the transcript already matched
        and the AI had a brief moment to object."""
        started = time.monotonic()
        deadline = started + CORRECTION_GRACE_SECONDS
        while True:
            agent_text = self.controller.agent_text_since(started_at) if started_at else ""
            if ai_accepted_answer(agent_text) or ai_corrected_answer(agent_text):
                return agent_text
            now = time.monotonic()
            if (matched and now - started >= MATCH_OBJECTION_SECONDS) or now >= deadline:
                return agent_text
            await asyncio.sleep(VERDICT_POLL_SECONDS)

    async def _passed(self) -> None:
        turn = self.turns[self.index]
        self.step_wrong = 0
        if self.step == "repeat":
            await self._set_step("answer-intro")
            await self._speak_and_wait(
                answer_prompt_line(turn, self.help_language), confirm=turn["guru"]
            )
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
            await self.say(closing_line(self.help_language))

    async def _begin_dialogue(self, index: int) -> None:
        self.index, self.wrong, self.step_wrong = index, 0, 0
        await self._set_step("listen")
        turn = self.turns[index]
        await self._speak_and_wait(
            listen_line(turn, self.help_language), confirm=turn["student"]
        )
        await self._set_step("repeat")

    async def _set_step(self, step: str) -> None:
        self.step = step
        if self.set_listening is not None:
            await self.set_listening(step in LISTENING_STEPS)
        await self.send_event({"type": "practice_step", "turnIndex": self.index, "step": step})

    async def _speak_and_wait(self, text: str, confirm: str) -> None:
        """Voice a script line, then wait until Bu Guru has said `confirm` (its
        Indonesian key line) so it's only the student's turn once she's done.
        She often voices the framing words in Chinese, so only the Indonesian
        line is checked. If she stays completely silent, send it once more."""
        # Compared without spaces: streamed fragments can split words ("melanjut" + "kan").
        tail = "".join(_normalize(confirm).split()[-2:])
        started = time.monotonic()
        deadline = started + SPEECH_WAIT_SECONDS
        resent = False
        await self.say(text)
        while time.monotonic() < deadline:
            self.controller.agent_spoke.clear()
            spoken_raw = self.controller.agent_text_since(started)
            if tail and tail in _normalize(spoken_raw).replace(" ", ""):
                return
            now = time.monotonic()
            if not resent and not spoken_raw.strip() and now - started >= SILENT_RESEND_SECONDS:
                logger.warning("[practice] silent after %r; sending it again", text[:40])
                resent = True
                await self.say(text)
                continue
            resend_at = started + SILENT_RESEND_SECONDS
            wake_at = resend_at if (not resent and now < resend_at) else deadline
            try:
                await asyncio.wait_for(
                    self.controller.agent_spoke.wait(), max(0.1, wake_at - now)
                )
            except asyncio.TimeoutError:
                continue
        logger.warning("[practice] line not confirmed as spoken: %r", text[:40])
