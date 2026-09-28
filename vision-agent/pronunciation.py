"""Build pronunciation guides from lesson custom data."""

from __future__ import annotations

from instruction_language import uses_indonesian_teacher, uses_zh_tw_teacher


VOWELS = set("aeiou")
# Letter pairs that are one Indonesian sound.
DIGRAPHS = ("ng", "ny", "kh", "sy")
# Written diphthongs, only treated as one sound at the end of a word (pan-tai, pu-lau).
FINAL_DIPHTHONGS = ("ai", "au", "oi")
MAX_GUIDE_WORDS = 60


def indonesian_syllables(word: str) -> str:
    """Rough phonetic syllable split: ha-dir, si-ap, se-la-mat, stop-kon-tak.

    Mixed into Chinese or English sentences, the voice model tends to read
    Indonesian words with that language's sounds ("Hadir" → "Haidir");
    spelling out the syllables keeps it on Indonesian vowels.
    """
    letters = "".join(ch for ch in word.lower() if ch.isalpha())
    units: list[str] = []
    i = 0
    while i < len(letters):
        if letters[i:i + 2] in DIGRAPHS:
            units.append(letters[i:i + 2])
            i += 2
        else:
            units.append(letters[i])
            i += 1
    if len(units) >= 2 and units[-2] + units[-1] in FINAL_DIPHTHONGS and (
        len(units) == 2 or units[-3] not in VOWELS
    ):
        units[-2:] = [units[-2] + units[-1]]

    vowel_positions = [k for k, unit in enumerate(units) if unit[0] in VOWELS]
    if len(vowel_positions) <= 1:
        return "".join(units)
    # Between two vowels: split directly when they touch (si-ap, ma-in), before
    # the last consonant for one or two (pa-gi, tom-bol), and after the first
    # for three or more, since clusters like "str" start a syllable (in-struk-si).
    def cut_between(prev: int, nxt: int) -> int:
        consonants = nxt - prev - 1
        if consonants == 0:
            return nxt
        if consonants <= 2:
            return nxt - 1
        return prev + 2

    cuts = [cut_between(prev, nxt) for prev, nxt in zip(vowel_positions, vowel_positions[1:])]
    parts, start = [], 0
    for cut in cuts:
        parts.append("".join(units[start:cut]))
        start = cut
    parts.append("".join(units[start:]))
    return "-".join(parts)


def indonesian_pronunciation_rules(phrases: list[str], help_language: str) -> str:
    """Prompt block that keeps Indonesian words on Indonesian sounds, with a
    syllable guide for every word in `phrases`."""
    words: list[str] = []
    for phrase in phrases:
        for raw in phrase.replace("-", " ").split():
            word = "".join(ch for ch in raw.lower() if ch.isalpha())
            if len(word) > 1 and word not in words:
                words.append(word)
    guide = ", ".join(f"{w} = {indonesian_syllables(w)}" for w in words[:MAX_GUIDE_WORDS])
    return (
        f"INDONESIAN PRONUNCIATION (critical — also inside {help_language} sentences):\n"
        "- Read every Indonesian word with standard Indonesian sounds, never with English or "
        "Chinese (pinyin) readings: a = \"ah\" (never \"ay\" or \"ai\"), i = \"ee\", u = \"oo\", "
        "e = \"eh\" or a short \"uh\", o = \"oh\". Pronounce every letter; never turn a single "
        "vowel into a diphthong. Example: hadir = ha-dir, NOT \"hai-dir\".\n"
        "- Leave a tiny pause before and after each Indonesian phrase and switch fully to an "
        "Indonesian accent for it.\n"
        f"- Syllables: {guide}."
    )


def _parse_vocab_entry(item: str) -> tuple[str, str, str]:
    """Parse 'word: translation | say: HAH-loh' or legacy 'word: translation'."""
    text = str(item).strip()
    if not text:
        return "", "", ""

    pronunciation = ""
    if "| say:" in text:
        left, _, pron = text.partition("| say:")
        pronunciation = pron.strip()
        text = left.strip()
    elif "| pronunciation:" in text:
        left, _, pron = text.partition("| pronunciation:")
        pronunciation = pron.strip()
        text = left.strip()

    if ": " in text:
        word, translation = text.split(": ", 1)
        return word.strip(), translation.strip(), pronunciation

    return text, "", pronunciation


def build_pronunciation_guide(vocabulary: list, phrases: list, label: str = "Indonesian") -> str:
    lines: list[str] = []

    for item in vocabulary:
        word, translation, pronunciation = _parse_vocab_entry(str(item))
        if not word:
            continue
        if pronunciation:
            lines.append(
                f"- {word} ({translation}) → {label}: {pronunciation}"
            )
        else:
            lines.append(f"- {word} ({translation})")

    for item in phrases:
        text, translation, pronunciation = _parse_vocab_entry(str(item))
        if not text:
            continue
        if pronunciation:
            lines.append(
                f"- {text} ({translation}) → {label}: {pronunciation}"
            )
        else:
            lines.append(f"- {text} ({translation})")

    return "\n".join(lines)


def append_pronunciation_guide(
    system_prompt: str,
    vocabulary: list,
    phrases: list,
    language_code: str,
    instruction_languages: list | None = None,
) -> str:
    if language_code != "id":
        return system_prompt

    instruction_languages = instruction_languages or []
    if uses_indonesian_teacher(instruction_languages, language_code):
        guide = build_pronunciation_guide(vocabulary, phrases, label="ucapkan")
        if not guide:
            return system_prompt
        block = (
            "HANYA KOSAKATA INDONESIA YANG DIIZINKAN — ajarkan HANYA kata/frasa ini, "
            "jangan pernah mengajarkan label topik bahasa Inggris (Greetings, Friends, Shopping, dll.):\n"
            f"{guide}\n"
            "- Ucapkan kata/frasa Indonesia DULU dengan jeda singkat, gunakan fonetik Indonesia.\n"
            "- Jangan menganglisasi: Halo = HA-lo (bukan HAY-lo), Selamat = se-LAH-mat.\n"
            "- Gunakan suku kata panduan sebagai model; jangan bacakan panduan dalam bahasa Inggris."
        )
    elif uses_zh_tw_teacher(instruction_languages, language_code):
        guide = build_pronunciation_guide(vocabulary, phrases, label="發音")
        if not guide:
            return system_prompt
        block = (
            "僅限以下印尼語詞彙 — 只教這些詞/短語，不要把英文主題標籤當成印尼語詞彙：\n"
            f"{guide}\n"
            "- 先用道地印尼語口音說出印尼語詞/短語並短暫停頓。\n"
            "- 不要英文化發音：Halo = HA-lo，Selamat = se-LAH-mat。\n"
            "- 以音節指南為準，不要把指南當英文念出來。"
        )
    else:
        guide = build_pronunciation_guide(vocabulary, phrases, label="pronunciation")
        if not guide:
            return system_prompt
        block = (
            "ALLOWED INDONESIAN VOCABULARY ONLY — teach ONLY these words/phrases, "
            "never English topic labels (Greetings, Friends, Shopping, etc.):\n"
            f"{guide}\n"
            "- Say the Indonesian word/phrase FIRST with a brief pause, using Indonesian phonetics.\n"
            "- Do NOT anglicize Indonesian: e.g. Halo = HA-lo (not HAY-lo), "
            "Selamat = se-LAH-mat (not suh-LAH-mut).\n"
            "- Use the guide syllables as your model; never read the guide aloud as English."
        )
    return f"{system_prompt.strip()}\n\n{block}"
