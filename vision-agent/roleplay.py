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
# What the AI said this recently counts as "already said" when deciding
# whether a status note would only make it repeat itself.
AGENT_RECENT_SECONDS = 8.0
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
    # Phrases that must not count as doing the objective — for comics, the
    # teacher's own line ("Selamat pagi, anak-anak" contains "Selamat pagi").
    exclude: list[str] = field(default_factory=list)


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


MIN_COMPACT_MATCH_CHARS = 4


def objective_matched(text: str, targets: list[str]) -> bool:
    """Whole-phrase match, so a stray "ini" can't tick off "berapa harganya ini"."""
    normalized = f" {_normalize(text)} "
    tokens = set(normalized.split())
    # Learners often say a word syllable by syllable ("Su- dah"), which the
    # transcript splits apart; compare with spaces removed as well.
    compact = normalized.replace(" ", "")
    for target in targets:
        normalized_target = _normalize(target)
        if not normalized_target:
            continue
        if f" {normalized_target} " in normalized:
            return True
        compact_target = normalized_target.replace(" ", "")
        if len(compact_target) >= MIN_COMPACT_MATCH_CHARS and compact_target in compact:
            return True
        target_tokens = set(normalized_target.split())
        if len(target_tokens) >= 2 and (
            len(tokens & target_tokens) / len(target_tokens) >= OBJECTIVE_MATCH_SCORE
        ):
            return True
    return False


def objective_hit(objective: RoleplayObjective, text: str) -> bool:
    """Matches a target, unless it's really an excluded phrase (the student
    echoing the teacher) — the full first target still counts."""
    if not objective_matched(text, objective.targets):
        return False
    if objective.exclude and objective_matched(text, objective.exclude):
        return objective_matched(text, objective.targets[:1])
    return True


@dataclass
class RoleplayTracker:
    objectives: list[RoleplayObjective]
    completed: set[str] = field(default_factory=set)
    # Comic dialogues must happen in order, so only the current line counts.
    sequential: bool = False

    def record(self, text: str) -> list[RoleplayObjective]:
        if self.sequential:
            return self._record_in_order(text)
        newly_done = [
            objective
            for objective in self.objectives
            if objective.id not in self.completed and objective_hit(objective, text)
        ]
        self.completed.update(objective.id for objective in newly_done)
        return newly_done

    def _record_in_order(self, text: str) -> list[RoleplayObjective]:
        remaining = self.remaining
        if remaining and objective_hit(remaining[0], text):
            newly_done = remaining[:1]
        # The AI moves on after a student is stuck twice; when they answer the
        # next line, count the skipped one too so the comic panel catches up.
        elif len(remaining) > 1 and objective_hit(remaining[1], text):
            newly_done = remaining[:2]
        else:
            return []
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
        f"{SAFETY_RULES}"
    )


SAFETY_RULES = (
    "SAFETY (always, overrides everything above):\n"
    "- You are talking with a child. Keep everything kind, age-appropriate and inside this scene.\n"
    "- Never ask for or repeat personal details such as full name, address, school name, phone "
    "number, photos or location. A first name is fine.\n"
    "- If the student brings up anything unsafe, scary, rude or off-topic, answer kindly in one "
    "short sentence and steer back to the scene.\n"
    "- Never claim to be a real person outside the scene, and never arrange to meet or contact "
    "the student."
)

MAX_COMIC_TURNS = 15


def comic_turns(raw_turns: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Normalize the class_turns sent by the app (clipped, capped)."""
    turns = []
    for turn in raw_turns[:MAX_COMIC_TURNS]:
        guru, student = _clip(turn.get("guruLine")), _clip(turn.get("studentLine"))
        if not guru or not student:
            continue
        answers = [_clip(a) for a in (turn.get("expectedAnswers") or [])[:MAX_TARGETS] if a]
        turns.append({
            "guru": guru,
            "guru_zh": _clip(turn.get("guruLineZh")),
            "student": student,
            "student_zh": _clip(turn.get("studentLineZh")),
            "answers": answers or [student],
        })
    return turns


def comic_objectives(turns: list[dict[str, Any]]) -> list[RoleplayObjective]:
    return [
        RoleplayObjective(
            id=f"turn-{index}",
            goal=f'answer as the student: "{turn["student"]}"',
            # The full comic line first: it always counts, even if it happens
            # to contain words of the teacher's line.
            targets=[turn["student"], *turn["answers"]],
            exclude=[turn["guru"]],
        )
        for index, turn in enumerate(turns)
    ]


def build_comic_roleplay_prompt(
    turns: list[dict[str, Any]],
    help_language: str,
    topic_title: str = "",
) -> str:
    script = "\n".join(
        f'{index + 1}. TEACHER: "{turn["guru"]}"'
        + (f" (中文: {turn['guru_zh']})" if turn["guru_zh"] else "")
        + f' → STUDENT answers: "{turn["student"]}"'
        for index, turn in enumerate(turns)
    )
    title = f' ("{_clip(topic_title)}")' if topic_title else ""
    return (
        "You are Bu Guru, a warm Indonesian primary-school teacher. You and a child who is a "
        f"beginner (A1) learner of Bahasa Indonesia are acting out a short classroom comic{title} "
        "as a LIVE SPOKEN ROLEPLAY. You play the TEACHER; the child plays the STUDENT.\n\n"
        f"COMIC SCRIPT, in order:\n{script}\n\n"
        "RULES:\n"
        "- Say each TEACHER line exactly as written, in a natural classroom voice, one line at a "
        "time — then stop and wait for the student.\n"
        "- Never say the student's line before they have tried. Go to the next TEACHER line only "
        "after the student has said their line or something very close to it.\n"
        "- Whenever you move to the next dialogue, ALWAYS say its TEACHER line first, exactly as "
        "written. Never ask for a student line whose TEACHER line you have not said yet.\n"
        "- WRONG SENTENCE (wrong or missing words): say one short encouraging word, then the "
        "correct student line (\"Coba bilang: ...\"), plus ONE short tip in "
        f"{help_language} about what was different. Let them try again. After two tries, say it "
        "together with them and move on.\n"
        "- WRONG PRONUNCIATION (right words, clearly mispronounced — you can hear it): say that "
        "word slowly, syllable by syllable (e.g. \"Gu-ru\"), give ONE short tip in "
        f"{help_language} on how to say it, and ask them to say the line once more. Only correct "
        "clear mistakes — never nitpick an accent.\n"
        "- Praise (\"Bagus!\") ONLY a right answer. For a wrong one, start gently with "
        "\"Hampir!\" instead — never praise and correct in the same reply.\n"
        "- You may receive quiet CORRECTION notes when the student's answer did not match the "
        "comic. Correct at most ONCE per answer: if you already corrected or accepted it, "
        "ignore the note.\n"
        f"- If the student is stuck or speaks {help_language}: give ONE short help sentence in "
        f"{help_language} that includes the Indonesian student line, then continue in Indonesian.\n"
        "- Keep reactions tiny (like \"Bagus!\"). This is acting out the comic, not a lesson: no "
        "explanations, no other topics, no new vocabulary.\n"
        "- Quiet TURN STATUS notes tell you where you are in the script. Use them to stay on "
        "track, but never repeat a line you have already said.\n"
        "- After the last dialogue, close warmly in one short sentence.\n\n"
        f"{SAFETY_RULES}"
    )


FILLER_WORDS = {"em", "emm", "eh", "ehm", "hmm", "uh", "um", "ah", "oh", "hm"}

# gpt-live-1 hears the audio itself, while our check reads a transcript that
# can be wrong ("Ha- e- i" for "Baik"). Before treating an answer as wrong,
# wait this long and let the AI's own reaction decide.
CORRECTION_GRACE_SECONDS = 3.0
PRAISE_WORDS = ("bagus", "pintar", "hebat", "benar", "betul", "terima kasih", "mantap")
CORRECTION_WORDS = ("coba", "bilang", "hampir", "ulang")


def ai_accepted_answer(agent_text: str, next_teacher_line: str = "") -> bool:
    """True when the AI's reaction shows it judged the answer right: it moved
    on to the next teacher line, or praised without correcting."""
    text = _normalize(agent_text)
    if next_teacher_line and _normalize(next_teacher_line) in text:
        return True
    words = text.split()
    corrected = any(word in words for word in CORRECTION_WORDS)
    praised = any(f" {phrase} " in f" {text} " for phrase in PRAISE_WORDS)
    return praised and not corrected


def is_answer_attempt(text: str) -> bool:
    """Fillers ("em", "eh") and help requests in Chinese are not answer attempts."""
    if any("一" <= ch <= "鿿" for ch in text):
        return False
    return any(word not in FILLER_WORDS for word in _normalize(text).split())


def comic_correction_note(
    said: str,
    expected: str,
    help_language: str,
    recent_agent_text: str = "",
) -> Optional[str]:
    """Quiet note so a wrong answer always gets corrected, or None if the AI
    already modeled the right line on its own."""
    if _normalize(expected) in _normalize(recent_agent_text):
        return None
    return (
        "CORRECTION (for your information, do not read aloud): the student said "
        f'"{said}" but their comic line is "{expected}". If you have not corrected them yet, '
        f'kindly do it now: model the line once ("Coba bilang: {expected}") with one short tip in '
        f"{help_language}, then wait. Do not move to the next TEACHER line yet."
    )


MAX_WRONG_ATTEMPTS = 2


def comic_move_on_line(turns: list[dict[str, Any]], index: int) -> str:
    """What Bu Guru says after the student has missed a dialogue twice: say
    it together, then continue with the next teacher line (or close)."""
    together = f'Tidak apa-apa, kita bilang sama-sama: "{turns[index]["student"]}".'
    if index + 1 < len(turns):
        return f'{together} {turns[index + 1]["guru"]}'
    return f"{together} Terima kasih, kamu sudah berusaha dengan baik!"


def comic_status_text(
    tracker: RoleplayTracker,
    turns: list[dict[str, Any]],
    recent_agent_text: str = "",
) -> Optional[str]:
    """Quiet position note for the model, or None when it is already on track.

    gpt-live-1 usually moves to the next line by itself right after the
    student answers; telling it that line again made it say it twice.
    """
    remaining = tracker.remaining
    if not remaining:
        return (
            "TURN STATUS (for your information, do not read aloud): the student has finished "
            "every dialogue in the comic. If you have already praised them or said goodbye, say "
            "nothing more; otherwise close warmly in one short sentence."
        )
    next_index = tracker.objectives.index(remaining[0])
    next_line = turns[next_index]["guru"]
    if _normalize(next_line) in _normalize(recent_agent_text):
        return None
    return (
        f"TURN STATUS (for your information, do not read aloud): dialogue {next_index} of "
        f'{len(turns)} is done. The next TEACHER line is: "{next_line}". If you have already '
        "said it, do NOT say it again — just wait for the student."
    )


def roleplay_opening_line(custom: dict[str, Any]) -> str:
    return _clip(custom.get("opening_line")) or "Halo! Apa kabar?"


def roleplay_kickoff_hint(custom: dict[str, Any]) -> str:
    return (
        "The student just joined the scene. Open it in character by saying this line and "
        f'NOTHING else: "{roleplay_opening_line(custom)}" Then STOP and wait for the student.'
    )


def mission_status_text(tracker: RoleplayTracker, recent_agent_text: str = "") -> str:
    remaining = tracker.remaining
    if not remaining:
        return (
            "MISSION STATUS (for your information, do not read aloud): the student has "
            "completed every mission. If you have not closed the scene yet, close it warmly in "
            "character in one or two sentences; otherwise say nothing more."
        )
    done = [_goal_label(o) for o in tracker.objectives if o.id in tracker.completed]
    return (
        "MISSION STATUS (for your information, do not read aloud): "
        f"done so far: {'; '.join(done) or 'nothing yet'}. "
        f"Still to do: {'; '.join(_goal_label(o) for o in remaining)}. "
        "Let the student do these themselves — give them a natural opening with a short "
        "question, never do it for them, and do not end the scene yet. Never repeat something "
        "you have just said."
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
    status_text: Callable[[RoleplayTracker, str], Optional[str]] = mission_status_text
    # Called when a student answer completes nothing: (answer, recent AI speech).
    on_unmatched: Optional[Callable[[str, str], Awaitable[None]]] = None
    # When set, it evaluates every student answer instead of the mission tracker
    # (Latihan's step-by-step practice owns its own flow).
    on_user_answer: Optional[Callable[[str], Awaitable[None]]] = None
    # Set each time the AI finishes an utterance.
    agent_spoke: asyncio.Event = field(default_factory=asyncio.Event)
    turns: list[dict[str, str]] = field(default_factory=list)
    _user_partial: list[str] = field(default_factory=list)
    _recent_user: list[tuple[float, str]] = field(default_factory=list)
    _recent_agent: list[tuple[float, str]] = field(default_factory=list)
    _feedback_task: Optional[asyncio.Task] = None
    # When the student started their current/latest answer.
    user_started_at: Optional[float] = None

    async def on_user_partial(self, fragment: str) -> None:
        if not self._user_partial:
            self.user_started_at = time.monotonic()
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

        if self.on_user_answer is not None:
            await self.on_user_answer(text)
            self._schedule_feedback()
            return

        now = time.monotonic()
        self._recent_user = [
            (t, s) for t, s in self._recent_user if now - t <= USER_WINDOW_SECONDS
        ] + [(now, text)]
        newly_done = self.tracker.record(" ".join(s for _, s in self._recent_user))
        for objective in newly_done:
            logger.info("[roleplay] objective done: %s", objective.id)
            await self.send_event({"type": "roleplay_objective", "objectiveId": objective.id})
        recent = " ".join(s for t, s in self._recent_agent if now - t <= AGENT_RECENT_SECONDS)
        if newly_done and self.append_instructions is not None:
            status = self.status_text(self.tracker, recent)
            if status:
                await self.append_instructions(status)
        if not newly_done and self.on_unmatched is not None and self.tracker.remaining:
            await self.on_unmatched(text, recent)

        self._schedule_feedback()

    def on_agent_partial(self, fragment: str) -> None:
        now = time.monotonic()
        self._recent_agent = [(t, s) for t, s in self._recent_agent if now - t <= 60] + [
            (now, fragment)
        ]

    def agent_text_since(self, since: float) -> str:
        return " ".join(s for t, s in self._recent_agent if t >= since)

    async def complete_current(self) -> None:
        """Mark the current in-order objective done because the AI accepted
        the answer even though the transcript didn't match."""
        remaining = self.tracker.remaining
        if not remaining:
            return
        self.tracker.completed.add(remaining[0].id)
        await self.send_event({"type": "roleplay_objective", "objectiveId": remaining[0].id})

    async def on_agent_final(self, text: str) -> None:
        self.agent_spoke.set()
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
