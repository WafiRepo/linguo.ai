"""Heuristic speech feedback for lesson practice turns."""

from __future__ import annotations

import re
from typing import Literal

FeedbackLevel = Literal["needs_work", "good", "great", "excellent"]

# Pronunciation match at or above "great" (0.65) counts as success.
ACCEPTABLE_MATCH_SCORE = 0.65
# Max times the teacher may ask to repeat the same word before moving on.
MAX_REPEAT_REQUESTS = 2

LEVEL_ORDER: list[FeedbackLevel] = [
    "needs_work",
    "good",
    "great",
    "excellent",
]

LEVEL_TO_NUM: dict[FeedbackLevel, int] = {
    level: index for index, level in enumerate(LEVEL_ORDER)
}


def _normalize(text: str) -> str:
    cleaned = re.sub(r"[^\w\s]", " ", text.lower(), flags=re.UNICODE)
    return " ".join(cleaned.split())


def _score_to_level(score: float) -> FeedbackLevel:
    if score >= 0.85:
        return "excellent"
    if score >= 0.65:
        return "great"
    if score >= 0.4:
        return "good"
    return "needs_work"


def _best_target_match(text: str, targets: list[str]) -> float:
    if not text.strip() or not targets:
        return 0.0

    normalized_text = _normalize(text)
    text_tokens = set(normalized_text.split())
    best = 0.0

    for target in targets:
        normalized_target = _normalize(target)
        if not normalized_target:
            continue

        if normalized_target in normalized_text or normalized_text in normalized_target:
            best = max(best, 0.95)
            continue

        target_tokens = set(normalized_target.split())
        if not target_tokens:
            continue

        overlap = len(text_tokens & target_tokens) / len(target_tokens)
        best = max(best, overlap)

    return best


def parse_lesson_words(vocabulary: list) -> list[str]:
    words: list[str] = []
    for item in vocabulary:
        if isinstance(item, str):
            entry = item.split("| say:", 1)[0].strip()
            word = entry.split(":", 1)[0].strip()
            if word:
                words.append(word)
    return words


def parse_lesson_phrases(phrases: list) -> list[str]:
    texts: list[str] = []
    for item in phrases:
        entry = str(item).strip()
        if not entry:
            continue
        entry = entry.split("| say:", 1)[0].strip()
        if ": " in entry:
            entry = entry.split(": ", 1)[0].strip()
        if entry:
            texts.append(entry)
    return texts


def is_acceptable_attempt(
    text: str,
    vocabulary: list,
    phrases: list,
) -> bool:
    cleaned = text.strip()
    if not cleaned:
        return False

    lesson_words = parse_lesson_words(vocabulary)
    phrase_items = parse_lesson_phrases(phrases)
    score = max(
        _best_target_match(cleaned, lesson_words),
        _best_target_match(cleaned, phrase_items),
    )
    return score >= ACCEPTABLE_MATCH_SCORE


class RepeatTracker:
    """Count failed attempts on the current word; force move-on after max repeats."""

    def __init__(self, max_repeat_requests: int = MAX_REPEAT_REQUESTS) -> None:
        self.max_repeat_requests = max_repeat_requests
        self._failed_attempts = 0

    def record_attempt(
        self,
        text: str,
        vocabulary: list,
        phrases: list,
    ) -> bool:
        """
        Record a user turn.

        Returns True when the teacher must stop repeating and teach the next word.
        """
        if is_acceptable_attempt(text, vocabulary, phrases):
            self._failed_attempts = 0
            return False

        self._failed_attempts += 1
        if self._failed_attempts > self.max_repeat_requests:
            self._failed_attempts = 0
            return True
        return False


def assess_user_turn(
    text: str,
    vocabulary: list,
    phrases: list,
) -> dict[str, FeedbackLevel]:
    cleaned = text.strip()
    lesson_words = parse_lesson_words(vocabulary)
    phrase_items = parse_lesson_phrases(phrases)

    if not cleaned:
        empty: FeedbackLevel = "needs_work"
        return {
            "speaking": empty,
            "pronunciation": empty,
            "grammar": empty,
        }

    normalized = _normalize(cleaned)
    token_count = len(normalized.split())

    if token_count >= 3 or len(cleaned) >= 12:
        speaking: FeedbackLevel = "excellent"
    elif token_count >= 2 or len(cleaned) >= 6:
        speaking = "great"
    else:
        speaking = "good"

    pronunciation_score = _best_target_match(cleaned, lesson_words)
    grammar_score = max(
        _best_target_match(cleaned, phrase_items),
        pronunciation_score * 0.85,
    )

    return {
        "speaking": speaking,
        "pronunciation": _score_to_level(pronunciation_score),
        "grammar": _score_to_level(grammar_score),
    }


class FeedbackRollingAverage:
    """Keep a short rolling average so labels do not jump every turn."""

    def __init__(self, window_size: int = 3) -> None:
        self.window_size = window_size
        self._history: dict[str, list[int]] = {
            "speaking": [],
            "pronunciation": [],
            "grammar": [],
        }

    def update(self, scores: dict[str, FeedbackLevel]) -> dict[str, FeedbackLevel]:
        rolled: dict[str, FeedbackLevel] = {}
        for key in ("speaking", "pronunciation", "grammar"):
            level = scores.get(key, "needs_work")
            if level not in LEVEL_TO_NUM:
                level = "needs_work"
            history = self._history[key]
            history.append(LEVEL_TO_NUM[level])
            if len(history) > self.window_size:
                del history[0]
            average = sum(history) / len(history)
            index = int(min(round(average), len(LEVEL_ORDER) - 1))
            rolled[key] = LEVEL_ORDER[index]
        return rolled
