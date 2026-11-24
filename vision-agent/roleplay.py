"""Live comic sessions for AI Teacher (Role Play and Latihan): prompts, answer
matching, transcripts and end-of-session feedback."""

from __future__ import annotations

import asyncio
import json
import re
import logging
import time
from dataclasses import dataclass, field
from typing import Any, Awaitable, Callable, Optional

from feedback import _normalize
from instruction_language import uses_english_teacher
from pronunciation import indonesian_pronunciation_rules, slow_line

logger = logging.getLogger(__name__)

# Comic text arrives from the client via call custom data; cap it so a
# tampered call can't smuggle a long prompt past the server-side rules below.
MAX_FIELD_CHARS = 200
MAX_TARGETS = 8
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
    # Share of a target's words that must be said. Comics need every word:
    # "Saya tahu" is 4/5 of "Saya tidak tahu, Pak Guru" but means the opposite.
    min_overlap: float = OBJECTIVE_MATCH_SCORE


MIN_COMPACT_MATCH_CHARS = 4


def objective_matched(
    text: str,
    targets: list[str],
    min_overlap: float = OBJECTIVE_MATCH_SCORE,
) -> bool:
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
            len(tokens & target_tokens) / len(target_tokens) >= min_overlap
        ):
            return True
    return False


def objective_hit(objective: RoleplayObjective, text: str) -> bool:
    """Matches a target, unless it's really an excluded phrase (the student
    echoing the teacher) — the full first target still counts."""
    if not objective_matched(text, objective.targets, objective.min_overlap):
        return False
    if objective.exclude and objective_matched(text, objective.exclude):
        return objective_matched(text, objective.targets[:1], objective.min_overlap)
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


def help_language_name(language_code: str, instruction_languages: list[str]) -> str:
    if uses_english_teacher(instruction_languages, language_code):
        return "English"
    return "Traditional Chinese (Taiwan / 繁體中文)"


def is_chinese_help(help_language: str) -> bool:
    return help_language != "English"


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


def comic_phrases(turns: list[dict[str, Any]]) -> list[str]:
    """Every Indonesian line of a comic, for the pronunciation guide."""
    return [line for turn in turns for line in (turn["guru"], turn["student"])]


def comic_objectives(turns: list[dict[str, Any]]) -> list[RoleplayObjective]:
    return [
        RoleplayObjective(
            id=f"turn-{index}",
            goal=f'answer as the student: "{turn["student"]}"',
            # The full comic line first: it always counts, even if it happens
            # to contain words of the teacher's line.
            targets=[turn["student"], *turn["answers"]],
            exclude=[turn["guru"]],
            min_overlap=1.0,
        )
        for index, turn in enumerate(turns)
    ]


def build_comic_roleplay_prompt(
    turns: list[dict[str, Any]],
    help_language: str,
    topic_title: str = "",
    teacher_name: str = "Bu Guru",
) -> str:
    script = "\n".join(
        f'{index + 1}. TEACHER: "{turn["guru"]}"'
        + (f" (中文: {turn['guru_zh']})" if turn["guru_zh"] else "")
        + f' → STUDENT answers: "{turn["student"]}"'
        for index, turn in enumerate(turns)
    )
    title = f' ("{_clip(topic_title)}")' if topic_title else ""
    # Reactions are in the child's language; only the comic lines are Indonesian.
    zh = is_chinese_help(help_language)
    praise_example = "「很好！」" if zh else '"Great!"'
    almost_example = "「差一點！」" if zh else '"Almost!"'
    model_example = "「跟著我說：…」" if zh else '"Say it like this: ..."'
    return (
        f"You are {teacher_name}, a warm Indonesian primary-school teacher. You and a child who is a "
        f"beginner (A1) learner of Bahasa Indonesia are acting out a short classroom comic{title} "
        "as a LIVE SPOKEN ROLEPLAY. You play the TEACHER; the child plays the STUDENT.\n\n"
        f"COMIC SCRIPT, in order:\n{script}\n\n"
        "RULES:\n"
        "- The lesson system gives you each TEACHER line to say, one at a time, in the right "
        "order. Say it exactly as written, in a natural classroom voice, then stop and wait for "
        "the student.\n"
        "- NEVER say a TEACHER line on your own, and never start the next dialogue yourself: "
        "after reacting to the student's answer, STOP. The next TEACHER line comes to you.\n"
        "- Never say the student's line before they have tried.\n"
        "- RIGHT ANSWERS: the comic's student line is ONE good answer, not the only one. Any answer "
        "that is correct Indonesian, answers your TEACHER line and fits the comic's situation is "
        "RIGHT, even with other words (e.g. 'Kemarin kita belajar salam' for 'Kami belajar "
        "salam.'). For such an answer: give one short praise in "
        f"{help_language}, then STOP (the next TEACHER line comes to you). Do NOT say the comic's "
        "version (the app shows it later), never say 'almost' and never ask them to repeat it.\n"
        "- A name or greeting alone ('Bu Guru') or one unrelated word is NOT an answer: treat it "
        "as a WRONG SENTENCE.\n"
        f"- LANGUAGE: every reaction, praise, correction and tip you say yourself is in "
        f"{help_language}. Only the comic lines (the TEACHER lines, and the student line when "
        "you model it) are in Indonesian.\n"
        f"- Never put Indonesian words inside a {help_language} sentence: finish the "
        f"{help_language} sentence, pause, then say the Indonesian line as its own sentence with a "
        "natural native Indonesian accent and rhythm (like a teacher from Jakarta), never with a "
        f"{help_language} accent.\n"
        f"- WRONG SENTENCE (wrong meaning, wrong or missing words that make it incorrect, or not "
        f"Indonesian): say one short encouraging word in "
        f"{help_language}, then the correct Indonesian student line (e.g. {model_example}), "
        "plus ONE short tip in "
        f"{help_language} about what was different. Let them try again (the lesson system "
        "helps them say it together after two tries).\n"
        "- WRONG PRONUNCIATION (right words, clearly mispronounced — you can hear it): say that "
        "word by its syllables from the guide (e.g. \"Gu… ru\"), then the whole word normally, "
        "give ONE short tip in "
        f"{help_language} on how to say it, and ask them to say the line once more. Only correct "
        "clear mistakes — never nitpick an accent.\n"
        f"- Praise (e.g. {praise_example}) ONLY a right answer. For a wrong one, start gently "
        f"with {almost_example} instead — never praise and correct in the same reply.\n"
        "- You may receive quiet CORRECTION notes when the student's answer did not match the "
        "comic. Correct at most ONCE per answer: if you already corrected or accepted it, "
        "ignore the note.\n"
        f"- If the student is stuck or speaks {help_language}: give ONE short help sentence in "
        f"{help_language} that includes the Indonesian student line, then wait.\n"
        f"- Keep reactions tiny (like {praise_example}). This is acting out the comic, not a "
        "lesson: no "
        "explanations, no other topics, no new vocabulary.\n"
        f"- After the student's answer to the LAST dialogue, praise and close warmly in one "
        f"short sentence in {help_language}.\n\n"
        f"{indonesian_pronunciation_rules(comic_phrases(turns), help_language)}\n\n"
        f"{SAFETY_RULES}"
    )


FILLER_WORDS = {"em", "emm", "eh", "ehm", "hmm", "uh", "um", "ah", "oh", "hm"}

# gpt-live-1 hears the audio itself, while our check reads a transcript that
# can be wrong ("Ha- e- i" for "Baik"). Before treating an answer as wrong,
# wait this long and let the AI's own reaction decide.
CORRECTION_GRACE_SECONDS = 3.0
PRAISE_WORDS = ("bagus", "pintar", "hebat", "benar", "betul", "terima kasih", "mantap",
                "great", "well done", "good job", "correct")
CORRECTION_WORDS = ("coba", "bilang", "hampir", "ulang", "almost", "try again")
# Chinese has no spaces between words, so these are matched as substrings.
PRAISE_WORDS_ZH = ("很好", "很棒", "好棒", "太棒", "答對", "正確", "說得好")
CORRECTION_WORDS_ZH = ("差一點", "再試", "再說一次", "應該", "不是", "跟著我說")


def says_line(agent_text: str, line: str) -> bool:
    """True when the AI's speech contains the start of this (comic) line:
    its first three words (all of a shorter line), so a small change at the
    end ('Siapa yang masih ingat?' for 'Siapa yang masih ingat pelajaran kemarin?') still counts."""
    words = _latin_words(line)
    if not words:
        return False
    start = " ".join(words[: min(3, len(words))])
    return f" {start} " in f" {' '.join(_latin_words(agent_text))} "


def _latin_words(text: str) -> list[str]:
    """Indonesian words only. Chinese and punctuation are separators, because
    Bu Guru runs them together ("接著聽老師說。Tekan tombolnya"), which made
    "說。tekan" one word and hid the line."""
    return re.sub(r"[^a-z0-9]+", " ", text.lower()).split()


def ai_corrected_answer(agent_text: str) -> bool:
    """True when the AI's reaction contains a correction ("差一點", "Hampir")."""
    text = _normalize(agent_text)
    return any(f" {w} " in f" {text} " for w in CORRECTION_WORDS) or any(
        w in text for w in CORRECTION_WORDS_ZH
    )


def ai_accepted_answer(agent_text: str, next_teacher_line: str = "") -> bool:
    """True when the AI's reaction shows it judged the answer right: it moved
    on to the next teacher line, or praised without correcting."""
    text = _normalize(agent_text)
    if next_teacher_line and _normalize(next_teacher_line) in text:
        return True
    praised = any(f" {w} " in f" {text} " for w in PRAISE_WORDS) or any(
        w in text for w in PRAISE_WORDS_ZH
    )
    return praised and not ai_corrected_answer(agent_text)


def repeats_previous_line(tracker: RoleplayTracker, text: str) -> bool:
    """True when the student says the dialogue they just finished again, e.g.
    after Bu Guru corrected how they said it. That is not an answer to the
    next dialogue, so it must not be marked wrong there."""
    remaining = tracker.remaining
    if not remaining:
        return False
    index = tracker.objectives.index(remaining[0])
    return index > 0 and objective_hit(tracker.objectives[index - 1], text)


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
        f'kindly do it now: model the line "{expected}" (natural speed, then once more slowly, '
        f'word by word), with one short tip in '
        f"{help_language}, then wait. Do not move to the next TEACHER line yet."
    )


MAX_WRONG_ATTEMPTS = 2


def comic_move_on_line(turns: list[dict[str, Any]], index: int, help_language: str) -> str:
    """What Bu Guru says after the student has missed a dialogue twice: say
    it together, then continue with the next teacher line (or close). Only
    the comic lines are Indonesian; the framing is in the help language."""
    line = turns[index]["student"]
    if is_chinese_help(help_language):
        together = f"沒關係，我們一起說：「{line}」慢慢再說一次：「{slow_line(line)}」"
        closing = "謝謝你，你很認真，做得很好！"
    else:
        together = f"That's okay, let's say it together: \"{line}\" Once more, slowly: \"{slow_line(line)}\""
        closing = "Thank you, you tried really hard. Well done!"
    if index + 1 < len(turns):
        return together  # the turn director says the next TEACHER line
    return f"{together} {closing}"


def comic_ask_again_line(turns: list[dict[str, Any]], index: int, help_language: str) -> str:
    """What Bu Guru says when the student answers the dialogue they already
    finished while she is asking the next one: point it out kindly and ask
    the current line again, so the lesson stays in order."""
    line = turns[index]["guru"]
    if is_chinese_help(help_language):
        return f"這一句我們剛剛說過了喔。老師再問一次：{line}"
    return f"We just said that one. Listen again: {line}"


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

# Added when the session follows a fixed comic script (Latihan / Role Play).
COMIC_FEEDBACK_RULES = (
    "\nThis was a practice of a FIXED comic script; the script is given before the transcript. "
    "Judge every STUDENT line only against the script line the student was answering:\n"
    "- A line that already says the script's student line or one of its accepted answers "
    "(ignoring capitals, punctuation and fillers like 'oh', 'eh', 'em') is CORRECT: never "
    "correct it.\n"
    "- 'better' MUST be exactly that script student line. Never add words, greetings or polite "
    "phrases that are not in the script (for example, do not add 'terima kasih').\n"
    "- Repeated words from speech recognition (like 'Baik Baik') are not mistakes.\n"
    "- An answer with OTHER words that is still correct Indonesian, answers the teacher and fits "
    "the situation (e.g. 'Kemarin kita belajar salam' for 'Kami belajar salam.') is RIGHT: do "
    "not correct it. Put it in 'alternatives' instead: {\"said\": the student's line, "
    "\"comic\": the script student line}, at most 3.\n"
    "- Only correct a line that is wrong: wrong meaning, wrong or missing words that make it "
    "incorrect, or not Indonesian."
)

# Fillers that never make an answer wrong. Not 'oke'/'ya': they can be script answers.
_FILLERS = {"oh", "eh", "em", "emm", "hmm", "uh", "um", "ah"}


def _comparable(text: str) -> str:
    """Lower-case words without punctuation, fillers or immediate repeats."""
    words = [w for w in _normalize(text).split() if w not in _FILLERS]
    deduped = [w for i, w in enumerate(words) if i == 0 or w != words[i - 1]]
    return " ".join(deduped)


def filter_comic_corrections(
    corrections: list[dict[str, str]], script: list[dict[str, Any]]
) -> list[dict[str, str]]:
    """Safety net after the model: keep only corrections that make sense for the script.

    Drops a correction when the student's line already matches an accepted answer,
    or when the suggested line is not one of the script's student lines.
    """
    accepted = {_comparable(a) for turn in script for a in [turn["student"], *turn["answers"]]}
    script_lines = {_comparable(turn["student"]): turn["student"] for turn in script}
    script_lines.update({_comparable(a): turn["student"] for turn in script for a in turn["answers"]})
    kept = []
    for item in corrections:
        said, better = _comparable(item["said"]), _comparable(item["better"])
        if said in accepted or better not in script_lines:
            continue
        # Show the script's own spelling and punctuation.
        kept.append({**item, "better": script_lines[better]})
    return kept


def align_with_live_misses(
    corrections: list[dict[str, str]],
    script: list[dict[str, Any]],
    live_misses: dict[int, str],
    help_language: str,
) -> list[dict[str, str]]:
    """The score counts corrections, so they must match what happened in the
    lesson: only dialogues Bu Guru actually corrected count. An answer she
    accepted ("Saya sudah siap" for "Ya, kami siap") is not a mistake, and a
    dialogue she did correct is listed even when the report model missed it."""
    kept: list[dict[str, str]] = []
    covered: set[int] = set()
    for item in corrections:
        better = _comparable(item["better"])
        # "Hadir." can be the line of several dialogues.
        indexes = {i for i, turn in enumerate(script) if _comparable(turn["student"]) == better}
        hit = indexes & set(live_misses) - covered
        if not hit:
            continue
        covered.add(min(hit))
        kept.append(item)
    tip = "照著漫畫的句子再說一次。" if is_chinese_help(help_language) else "Say it like the comic line."
    for index in sorted(set(live_misses) - covered):
        if len(kept) == MAX_CORRECTIONS:
            break
        kept.append({"said": live_misses[index][:120], "better": script[index]["student"], "tip": tip})
    return kept


def _script_text(script: list[dict[str, Any]]) -> str:
    lines = ["COMIC SCRIPT:"]
    for index, turn in enumerate(script, start=1):
        accepted = "; ".join(turn["answers"])
        lines.append(f'{index}. TEACHER: {turn["guru"]} -> STUDENT should say: {turn["student"]} (accepted: {accepted})')
    return "\n".join(lines)


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
    # Right answers that differ from the comic ("another way to say it").
    alternatives = []
    for item in data.get("alternatives") or []:
        if len(alternatives) == MAX_CORRECTIONS:
            break
        if not isinstance(item, dict):
            continue
        said, comic = _clip(item.get("said"), 120), _clip(item.get("comic"), 120)
        if said and comic and _comparable(said) != _comparable(comic):
            alternatives.append({"said": said, "comic": comic})
    # Custom events are capped at 5 KB, so every field above is clipped.
    return {
        "praise": _clip(data.get("praise"), 200),
        "corrections": corrections,
        "alternatives": alternatives,
    }


async def generate_roleplay_feedback(
    client: Any,
    model: str,
    turns: list[dict[str, str]],
    help_language: str,
    script: Optional[list[dict[str, Any]]] = None,
    live_misses: Optional[dict[int, str]] = None,
) -> Optional[dict[str, Any]]:
    """End-of-session praise and corrections. With a comic script, corrections
    must follow the script (prompt rules + filter_comic_corrections). With
    live_misses (Role Play: dialogue index -> what the student said when Bu
    Guru corrected it), they also match what she corrected in the lesson."""
    transcript = "\n".join(
        f"{'STUDENT' if turn['speaker'] == 'user' else 'CHARACTER'}: {turn['text']}" for turn in turns
    )
    system = FEEDBACK_SYSTEM_PROMPT.replace("{help_language}", help_language)
    user = transcript
    if script:
        system += COMIC_FEEDBACK_RULES
        user = f"{_script_text(script)}\n\nTRANSCRIPT:\n{transcript}"
    response = await client.chat.completions.create(
        model=model,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    )
    feedback = parse_feedback(response.choices[0].message.content or "")
    if feedback and script:
        feedback["corrections"] = filter_comic_corrections(feedback["corrections"], script)
        if live_misses is not None:
            feedback["corrections"] = align_with_live_misses(
                feedback["corrections"], script, live_misses, help_language
            )
    return feedback


@dataclass
class RoleplayController:
    """Owns one roleplay session: transcript, missions and end-of-session feedback."""

    send_event: Callable[[dict[str, Any]], Awaitable[None]]
    tracker: RoleplayTracker
    append_instructions: Optional[Callable[[str], Awaitable[None]]] = None
    generate_feedback: Optional[Callable[[list[dict[str, str]]], Awaitable[Optional[dict[str, Any]]]]] = None
    # Quiet position note for the AI after a dialogue completes (None: send none).
    status_text: Callable[[RoleplayTracker, str], Optional[str]] = lambda tracker, recent: None
    # Called when a student answer completes nothing: (answer, recent AI speech).
    on_unmatched: Optional[Callable[[str, str], Awaitable[None]]] = None
    # Comic Role Play: (answer, first matched objective index, answer start
    # time, how many dialogues it would finish). A keyword match only counts
    # once this says Bu Guru didn't correct it.
    confirm_match: Optional[Callable[[str, int, float, int], Awaitable[bool]]] = None
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
    # How many matched answers per dialogue are waiting for Bu Guru's reaction.
    confirming: dict[str, int] = field(default_factory=dict)
    # False: the student's words are not sent to the app (hybrid Practice
    # sends what Gemini heard instead, once the answer is judged).
    show_user_text: bool = True

    async def on_user_partial(self, fragment: str) -> None:
        if not self._user_partial:
            self.user_started_at = time.monotonic()
        self._user_partial.append(fragment)
        if not self.show_user_text:
            return
        await self.send_event({
            "type": "transcript_partial",
            "speaker": "user",
            "text": "".join(self._user_partial).strip(),
        })

    async def on_user_final(self, text: str) -> None:
        self._user_partial.clear()
        self._add_turn("user", text)
        if self.show_user_text:
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
        if newly_done and self.confirm_match is not None:
            # Bu Guru hears the real audio: wait for her reaction before counting.
            for objective in newly_done:
                self.tracker.completed.discard(objective.id)
            self._recent_user.clear()
            index = self.tracker.objectives.index(newly_done[0])
            started_at = self.user_started_at or now
            asyncio.create_task(self._confirm(text, newly_done, index, started_at))
            self._schedule_feedback()
            return
        if newly_done:
            # An answer that completed a dialogue must not count again: "Baik,
            # Bu Guru" + a wrong "Okay" would otherwise also match the next
            # dialogue whose answer is "Baik" and skip a correction.
            self._recent_user.clear()
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

    async def _confirm(
        self, text: str, objectives: list[RoleplayObjective], index: int, started_at: float
    ) -> None:
        ids = [objective.id for objective in objectives]
        for objective_id in ids:
            self.confirming[objective_id] = self.confirming.get(objective_id, 0) + 1
        try:
            accepted = self.confirm_match is not None and await self.confirm_match(
                text, index, started_at, len(objectives)
            )
        finally:
            for objective_id in ids:
                self.confirming[objective_id] -= 1
                if not self.confirming[objective_id]:
                    del self.confirming[objective_id]
        if not accepted:
            return
        # Still the next dialogue(s)? A later answer may have finished them meanwhile.
        remaining = self.tracker.remaining
        if remaining[: len(objectives)] != objectives:
            return
        self.tracker.completed.update(objective.id for objective in objectives)
        for objective in objectives:
            logger.info("[roleplay] objective done (confirmed): %s", objective.id)
            await self.send_event({"type": "roleplay_objective", "objectiveId": objective.id})
        if self.append_instructions is not None:
            status = self.status_text(self.tracker, self.agent_text_since(started_at))
            if status:
                await self.append_instructions(status)

    def on_agent_partial(self, fragment: str) -> None:
        now = time.monotonic()
        # Kept a few minutes: a slow answer still needs the line it answers.
        self._recent_agent = [(t, s) for t, s in self._recent_agent if now - t <= 180] + [
            (now, fragment)
        ]

    def last_agent_at(self) -> Optional[float]:
        """When the AI last said something (None: not yet)."""
        return self._recent_agent[-1][0] if self._recent_agent else None

    def agent_text_since(self, since: float) -> str:
        return " ".join(s for t, s in self._recent_agent if t >= since)

    def agent_speech_between(self, start: float, end: float) -> str:
        """What the AI said in a time window, fragments joined as spoken
        (they carry their own spaces: ' suar' + 'anya' -> ' suaranya')."""
        return "".join(s for t, s in self._recent_agent if start <= t <= end)

    async def complete_current(self, index: Optional[int] = None) -> None:
        """Mark a dialogue done: the one at `index`, or the current in-order
        one (the AI accepted an answer the transcript didn't match). Marking
        an already finished dialogue does nothing, so a repeated call can
        never finish the NEXT dialogue by mistake."""
        if index is None:
            remaining = self.tracker.remaining
            if not remaining:
                return
            objective = remaining[0]
        elif 0 <= index < len(self.tracker.objectives):
            objective = self.tracker.objectives[index]
        else:
            return
        if objective.id in self.tracker.completed:
            return
        self.tracker.completed.add(objective.id)
        await self.send_event({"type": "roleplay_objective", "objectiveId": objective.id})

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

    async def send_feedback_now(self) -> None:
        """The lesson is over: the report now (the app drops any report that
        came before the end, so it waits for this one)."""
        if self.generate_feedback is None:
            return
        if self._feedback_task is not None:
            self._feedback_task.cancel()
        self._feedback_task = asyncio.create_task(self._feedback_after_idle(wait=0.0))

    async def _feedback_after_idle(self, wait: Optional[float] = None) -> None:
        await asyncio.sleep(FEEDBACK_IDLE_SECONDS if wait is None else wait)
        try:
            feedback = await self.generate_feedback([dict(turn) for turn in self.turns])
        except Exception:
            logger.exception("[roleplay] feedback generation failed")
            return
        if feedback is not None:
            await self.send_event({"type": "roleplay_feedback", **feedback})


@dataclass
class ComicTurnDirector:
    """Comic Role Play: the server, not the model, keeps the dialogue order.

    The model only reacts to answers (praise or correction). This director
    holds the dialogue number, says every TEACHER line itself, and tells the
    app which comic dialogue is on ("roleplay_turn"), so a correction can
    never move the comic or make Bu Guru skip or repeat a line.
    """

    turns: list[dict[str, Any]]
    controller: RoleplayController
    send_event: Callable[[dict[str, Any]], Awaitable[None]]
    # Voices one TEACHER line (word for word).
    say: Callable[[str], Awaitable[None]]
    index: int = 0
    # Set right before a completion whose reaction is still to be voiced
    # (two missed tries: "let's say it together"): wait for it to start.
    expect_speech: bool = False
    # Quiet this long = Bu Guru finished her reaction.
    quiet_seconds: float = 0.8
    # Never wait longer than this for her reaction.
    max_wait_seconds: float = 6.0
    _task: Optional[asyncio.Task] = None

    async def start(self) -> None:
        await self._show_and_say(0)

    def dialogue_done(self) -> None:
        """A dialogue was completed (right answer, accepted alternative, or
        said together after two tries): say the next line once Bu Guru has
        finished reacting."""
        self.index += 1
        expect_speech, self.expect_speech = self.expect_speech, False
        if self._task is not None and not self._task.done():
            self._task.cancel()
        self._task = asyncio.create_task(self._next(self.index, expect_speech))

    async def _next(self, index: int, expect_speech: bool) -> None:
        since = time.monotonic()
        await self.wait_for_reaction(since, expect_speech)
        if index >= len(self.turns):
            await self.send_event({"type": "roleplay_turn", "turnIndex": index, "done": True})
            return
        # The model sometimes still starts the next line by itself: then
        # only move the comic, don't say it twice.
        heard = self.controller.agent_speech_between(since - 10, time.monotonic())
        if says_line(heard, self.turns[index]["guru"]):
            await self.send_event({"type": "roleplay_turn", "turnIndex": index})
            return
        await self._show_and_say(index)

    async def _show_and_say(self, index: int) -> None:
        # Comic first, so the panel changes as she starts the line.
        await self.send_event({"type": "roleplay_turn", "turnIndex": index})
        await self.say(self.turns[index]["guru"])

    async def wait_for_reaction(self, since: float, expect_speech: bool = False) -> None:
        """Until Bu Guru has finished her praise or correction: quiet for
        quiet_seconds (and, with expect_speech, only after new speech)."""
        deadline = since + self.max_wait_seconds
        await asyncio.sleep(0.3)
        while time.monotonic() < deadline:
            last = self.controller.last_agent_at()
            now = time.monotonic()
            started = last is not None and last >= since
            if (started or not expect_speech) and (last is None or now - last >= self.quiet_seconds):
                return
            await asyncio.sleep(0.1)
