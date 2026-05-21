"""Build pronunciation guides from lesson custom data."""

from __future__ import annotations


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


def build_pronunciation_guide(vocabulary: list, phrases: list) -> str:
    lines: list[str] = []

    for item in vocabulary:
        word, translation, pronunciation = _parse_vocab_entry(str(item))
        if not word:
            continue
        if pronunciation:
            lines.append(
                f"- {word} ({translation}) → Indonesian: {pronunciation}"
            )
        else:
            lines.append(f"- {word} ({translation})")

    for item in phrases:
        text, translation, pronunciation = _parse_vocab_entry(str(item))
        if not text:
            continue
        if pronunciation:
            lines.append(
                f"- {text} ({translation}) → Indonesian: {pronunciation}"
            )
        else:
            lines.append(f"- {text} ({translation})")

    return "\n".join(lines)


def append_pronunciation_guide(
    system_prompt: str,
    vocabulary: list,
    phrases: list,
    language_code: str,
) -> str:
    if language_code != "id":
        return system_prompt

    guide = build_pronunciation_guide(vocabulary, phrases)
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
