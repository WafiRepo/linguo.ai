"""Speak-style live roleplay: the AI plays a character and replies freely."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any

from feedback import _normalize
from instruction_language import uses_english_teacher

# Scenario text arrives from the client via call custom data; cap it so a
# tampered call can't smuggle a long prompt past the server-side rules below.
MAX_FIELD_CHARS = 200
MAX_OBJECTIVES = 6
MAX_TARGETS = 8
MAX_KNOWN_WORDS = 40
OBJECTIVE_MATCH_SCORE = 0.75


def _clip(value: object) -> str:
    return str(value or "").strip()[:MAX_FIELD_CHARS]


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


def build_roleplay_system_prompt(
    custom: dict[str, Any],
    objectives: list[RoleplayObjective],
    help_language: str,
) -> str:
    ai_name = _clip(custom.get("ai_name")) or "Sari"
    ai_role = _clip(custom.get("ai_role")) or "a friendly Indonesian local"
    setting = _clip(custom.get("setting")) or "an everyday situation in Indonesia"
    mission = "; ".join(
        f"{objective.goal or objective.id} (e.g. \"{objective.targets[0]}\")"
        for objective in objectives
    )
    known_words = parse_known_words(custom.get("known_words"))
    known_words_rule = (
        "- The student has already learned these words — build your sentences mostly from "
        f"them and introduce at most one new word per reply: {', '.join(known_words)}.\n"
        if known_words
        else ""
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
        f"- STUDENT MISSION — guide the scene so they get a natural chance to do each, in any "
        f"order: {mission}.\n"
        "- Once they have done all of it, close the scene warmly in character in one or two "
        "sentences.\n\n"
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
