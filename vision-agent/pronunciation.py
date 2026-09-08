"""Build pronunciation guides from lesson custom data."""

from __future__ import annotations

from instruction_language import uses_indonesian_teacher, uses_zh_tw_teacher


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
