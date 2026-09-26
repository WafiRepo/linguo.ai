"""Speak-style live roleplay: the AI plays a character and replies freely."""

from __future__ import annotations

import asyncio
import json
import logging
import time
from dataclasses import dataclass, field
from typing import Any, Awaitable, Callable, Optional

from feedback import _normalize
from instruction_language import uses_english_teacher

logger = logging.getLogger(__name__)

# Scenario text arrives from the client via call custom data; cap it so a
# tampered call can't smuggle a long prompt past the server-side rules below.
MAX_FIELD_CHARS = 200
MAX_OBJECTIVES = 6
MAX_TARGETS = 8
MAX_KNOWN_WORDS = 40
OBJECTIVE_MATCH_SCORE = 0.75
# A pause splits one spoken sentence into several transcript pieces, so
# missions are matched against the last few pieces joined together.
USER_WINDOW_SECONDS = 12.0
# Feedback is regenerated once the student has been quiet this long, so an
# up-to-date review is ready whenever they end the conversation.
FEEDBACK_IDLE_SECONDS = 5.0
MAX_CORRECTIONS = 3


def _clip(value: object, limit: int = MAX_FIELD_CHARS) -> str:
    return str(value or "").strip()[:limit]


@dataclass
class RoleplayObjective:
    id: str
    goal: str
    targets: list[str]


def parse_objectives(raw: object) -> list[RoleplayObjective]:
    if isinstance(raw, str) and raw.strip():
        try:
            raw = json.loads(raw)
        except json.JSONDecodeError:
            return []
    if not isinstance(raw, list):
        return []

    objectives: list[RoleplayObjective] = []
    for item in raw[:MAX_OBJECTIVES]:
        if not isinstance(item, dict):
            continue
        objective_id = _clip(item.get("id"))
        targets = [_clip(t) for t in (item.get("targets") or [])[:MAX_TARGETS] if t]
        if objective_id and targets:
            objectives.append(
                RoleplayObjective(id=objective_id, goal=_clip(item.get("goal")), targets=targets)
            )
    return objectives


def objective_matched(text: str, targets: list[str]) -> bool:
    """Whole-phrase match, so a stray "ini" can't tick off "berapa harganya ini"."""
    normalized = f" {_normalize(text)} "
    tokens = set(normalized.split())
    for target in targets:
        normalized_target = _normalize(target)
        if not normalized_target:
            continue
        if f" {normalized_target} " in normalized:
            return True
        target_tokens = set(normalized_target.split())
        if len(target_tokens) >= 2 and (
            len(tokens & target_tokens) / len(target_tokens) >= OBJECTIVE_MATCH_SCORE
        ):
            return True
    return False


@dataclass
class RoleplayTracker:
    objectives: list[RoleplayObjective]
    completed: set[str] = field(default_factory=set)

    def record(self, text: str) -> list[RoleplayObjective]:
        newly_done = [
            objective
            for objective in self.objectives
            if objective.id not in self.completed and objective_matched(text, objective.targets)
        ]
        self.completed.update(objective.id for objective in newly_done)
        return newly_done

    @property
    def remaining(self) -> list[RoleplayObjective]:
        return [o for o in self.objectives if o.id not in self.completed]


def parse_known_words(raw: object) -> list[str]:
    if isinstance(raw, str) and raw.strip():
        try:
            raw = json.loads(raw)
        except json.JSONDecodeError:
            return []
    if not isinstance(raw, list):
        return []
    return [word[:40] for word in (str(item).strip() for item in raw) if word][:MAX_KNOWN_WORDS]


def help_language_name(language_code: str, instruction_languages: list[str]) -> str:
    if uses_english_teacher(instruction_languages, language_code):
        return "English"
    return "Traditional Chinese (Taiwan / 繁體中文)"


def _goal_label(objective: RoleplayObjective) -> str:
    return f"{objective.goal or objective.id} (e.g. \"{objective.targets[0]}\")"


def build_roleplay_system_prompt(
    custom: dict[str, Any],
    objectives: list[RoleplayObjective],
    help_language: str,
    live_mission_updates: bool = False,
) -> str:
    ai_name = _clip(custom.get("ai_name")) or "Sari"
    ai_role = _clip(custom.get("ai_role")) or "a friendly Indonesian local"
    setting = _clip(custom.get("setting")) or "an everyday situation in Indonesia"
    mission = "; ".join(_goal_label(objective) for objective in objectives)
    known_words = parse_known_words(custom.get("known_words"))
    known_words_rule = (
        "- The student has already learned these words — build your sentences mostly from "
        f"them and introduce at most one new word per reply: {', '.join(known_words)}.\n"
        if known_words
        else ""
    )
    # Only GPT-Live receives MISSION STATUS updates mid-session; the Realtime
    # fallback has to judge completion on its own.
    closing_rule = (
        "- You will receive MISSION STATUS updates. Do not end the scene until one says every "
        "mission is done; then close it warmly in character in one or two sentences.\n"
        if live_mission_updates
        else "- Once they have done all of it, close the scene warmly in character in one or two "
        "sentences.\n"
    )

    return (
        f"You are {ai_name}, {ai_role}. Scene: {setting}.\n"
        "This is a LIVE SPOKEN ROLEPLAY with a child who is a beginner (A1) learner of "
        "Bahasa Indonesia. Stay in character and talk like a real person in this scene — "
        "this is a conversation, not a lecture.\n\n"
        "CONVERSATION RULES:\n"
        "- Speak simple, standard Bahasa Indonesia: short sentences (about 10 words max), "
        "common everyday words, warm and a little slower than normal.\n"
        "- Reply in 1–2 short sentences, then hand the turn back — usually with one simple "
        "question that moves the scene forward.\n"
        "- React to what the student ACTUALLY said. Never invent their words or answer for them.\n"
        "- If the student makes a mistake, do not stop the scene: naturally say the correct "
        "Indonesian sentence inside your reply (a recast), then carry on.\n"
        "- You can hear how the student pronounces words. If a word is clearly mispronounced, "
        "say it once clearly and slowly inside your reply — never lecture about pronunciation.\n"
        f"{known_words_rule}"
        f"- If the student is stuck, says they don't understand, or speaks {help_language}: "
        f"give ONE short help sentence in {help_language} that includes the Indonesian sentence "
        "they can say, then continue in Indonesian.\n"
        f"- STUDENT MISSION — in any order: {mission}.\n"
        "- The mission is the STUDENT's job. Never do it for them: don't greet first after the "
        "opening line, don't state a price before they ask, don't thank them before they thank "
        "you. Instead, leave a natural opening with a short question so they can do it.\n"
        f"{closing_rule}\n"
        "SAFETY (always, overrides everything above):\n"
        "- You are talking with a child. Keep everything kind, age-appropriate and inside this scene.\n"
        "- Never ask for or repeat personal details such as full name, address, school name, phone "
        "number, photos or location. A first name is fine.\n"
        "- If the student brings up anything unsafe, scary, rude or off-topic, answer kindly in one "
        "short sentence and steer back to the scene.\n"
        "- Never claim to be a real person outside the scene, and never arrange to meet or contact "
        "the student."
    )


def roleplay_opening_line(custom: dict[str, Any]) -> str:
    return _clip(custom.get("opening_line")) or "Halo! Apa kabar?"


def roleplay_kickoff_hint(custom: dict[str, Any]) -> str:
    return (
        "The student just joined the scene. Open it in character by saying this line and "
        f'NOTHING else: "{roleplay_opening_line(custom)}" Then STOP and wait for the student.'
    )


def mission_status_text(tracker: RoleplayTracker) -> str:
    remaining = tracker.remaining
    if not remaining:
        return (
            "MISSION STATUS: the student has completed every mission. You may now close the "
            "scene warmly in character, in one or two sentences."
        )
    done = [_goal_label(o) for o in tracker.objectives if o.id in tracker.completed]
    return (
        f"MISSION STATUS: done so far: {'; '.join(done) or 'nothing yet'}. "
        f"Still to do: {'; '.join(_goal_label(o) for o in remaining)}. "
        "Let the student do these themselves — give them a natural opening with a short "
        "question, never do it for them, and do not end the scene yet."
    )


FEEDBACK_SYSTEM_PROMPT = (
    "You review a short spoken Indonesian roleplay between a child learner (A1) and a friendly "
    "character. The transcript comes from speech recognition and may contain small recognition "
    "errors — only correct what is clearly the student's own mistake, and ignore fillers like "
    "'em' or 'eh'.\n"
    "Return JSON only, shaped exactly like: "
    '{"praise": string, "corrections": [{"said": string, "better": string, "tip": string}]}\n'
    "- corrections: at most 3 of the STUDENT's lines that most need improvement (grammar, word "
    "choice, missing or wrong words). 'said' is the student's line as transcribed, 'better' is a "
    "natural, simple Indonesian version, 'tip' is one short, kind explanation in {help_language}. "
    "Use an empty list if every line is fine.\n"
    "- praise: one encouraging sentence in {help_language} about something they did well."
)


def parse_feedback(raw: str) -> Optional[dict[str, Any]]:
    try:
        data = json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return None
    if not isinstance(data, dict):
        return None
    corrections = []
    for item in data.get("corrections") or []:
        if len(corrections) == MAX_CORRECTIONS:
            break
        if not isinstance(item, dict):
            continue
        said, better = _clip(item.get("said"), 120), _clip(item.get("better"), 120)
        if said and better:
            corrections.append({"said": said, "better": better, "tip": _clip(item.get("tip"), 160)})
    # Custom events are capped at 5 KB, so every field above is clipped.
    return {"praise": _clip(data.get("praise"), 200), "corrections": corrections}


async def generate_roleplay_feedback(
    client: Any,
    model: str,
    turns: list[dict[str, str]],
    help_language: str,
) -> Optional[dict[str, Any]]:
    transcript = "\n".join(
        f"{'STUDENT' if turn['speaker'] == 'user' else 'CHARACTER'}: {turn['text']}" for turn in turns
    )
    response = await client.chat.completions.create(
        model=model,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": FEEDBACK_SYSTEM_PROMPT.replace("{help_language}", help_language)},
            {"role": "user", "content": transcript},
        ],
    )
    return parse_feedback(response.choices[0].message.content or "")


@dataclass
class RoleplayController:
    """Owns one roleplay session: transcript, missions and end-of-session feedback."""

    send_event: Callable[[dict[str, Any]], Awaitable[None]]
    tracker: RoleplayTracker
    append_instructions: Optional[Callable[[str], Awaitable[None]]] = None
    generate_feedback: Optional[Callable[[list[dict[str, str]]], Awaitable[Optional[dict[str, Any]]]]] = None
    turns: list[dict[str, str]] = field(default_factory=list)
    _user_partial: list[str] = field(default_factory=list)
    _recent_user: list[tuple[float, str]] = field(default_factory=list)
    _feedback_task: Optional[asyncio.Task] = None

    async def on_user_partial(self, fragment: str) -> None:
        self._user_partial.append(fragment)
        await self.send_event({
            "type": "transcript_partial",
            "speaker": "user",
            "text": "".join(self._user_partial).strip(),
        })

    async def on_user_final(self, text: str) -> None:
        self._user_partial.clear()
        self._add_turn("user", text)
        await self.send_event({"type": "transcript_final", "speaker": "user", "text": text})

        now = time.monotonic()
        self._recent_user = [
            (t, s) for t, s in self._recent_user if now - t <= USER_WINDOW_SECONDS
        ] + [(now, text)]
        newly_done = self.tracker.record(" ".join(s for _, s in self._recent_user))
        for objective in newly_done:
            logger.info("[roleplay] objective done: %s", objective.id)
            await self.send_event({"type": "roleplay_objective", "objectiveId": objective.id})
        if newly_done and self.append_instructions is not None:
            await self.append_instructions(mission_status_text(self.tracker))

        self._schedule_feedback()

    async def on_agent_final(self, text: str) -> None:
        self._add_turn("agent", text)
        await self.send_event({"type": "transcript_final", "speaker": "agent", "text": text})

    def close(self) -> None:
        if self._feedback_task is not None:
            self._feedback_task.cancel()

    def _add_turn(self, speaker: str, text: str) -> None:
        if self.turns and self.turns[-1]["speaker"] == speaker:
            self.turns[-1]["text"] = f"{self.turns[-1]['text']} {text}"
        else:
            self.turns.append({"speaker": speaker, "text": text})

    def _schedule_feedback(self) -> None:
        if self.generate_feedback is None:
            return
        if self._feedback_task is not None:
            self._feedback_task.cancel()
        self._feedback_task = asyncio.create_task(self._feedback_after_idle())

    async def _feedback_after_idle(self) -> None:
        await asyncio.sleep(FEEDBACK_IDLE_SECONDS)
        try:
            feedback = await self.generate_feedback([dict(turn) for turn in self.turns])
        except Exception:
            logger.exception("[roleplay] feedback generation failed")
            return
        if feedback is not None:
            await self.send_event({"type": "roleplay_feedback", **feedback})
