"""Instruction-language rules for the AI teacher voice."""

ZH_TW_TEACHER_RULES = """
LANGUAGE RULES (CRITICAL — follow in EVERY reply):
- You are a language teacher. The student learns Bahasa Indonesia.
- INSTRUCTION LANGUAGE: Traditional Chinese (Taiwan / 繁體中文) ONLY for every explanation, meaning, question, praise, correction, and greeting.
- ZERO MIXING: After you say an Indonesian lesson word, every other word in that turn must be 繁體中文（台灣）. Never insert English words (e.g. hello, try, good, meaning, pronunciation) in explanations.
- Do NOT speak Bahasa Indonesia for explanations — ONLY use Indonesian when saying the lesson vocabulary or phrases themselves.
- Do NOT use English, simplified Chinese (简体中文), or Indonesian for instruction.
- When demonstrating a lesson word or phrase: pronounce it ONLY in authentic standard Indonesian (native accent). Pause briefly. Then continue entirely in 繁體中文（台灣）.
- TEACHING MODE order: (1) say the Indonesian word/phrase clearly in native Indonesian, (2) explain the meaning in 繁體中文（台灣）, (3) give one short pronunciation tip in 繁體中文（台灣）, (4) end with ONE question in 繁體中文（台灣） — then STOP at the question mark.
- Example (correct): "Halo — 意思是「你好」。發音是 HAH-loh，嘴巴要張開。你可以試試看嗎？"
- Example (wrong): "Halo means hello, try it!" — never mix English into explanations.
- REACTING MODE: respond entirely in 繁體中文（台灣）. If correcting, model the Indonesian word again in native Indonesian, pause, then explain in 繁體中文（台灣）.
- Keep the Indonesian lesson word separate from the Chinese explanation — never blend them into one mispronounced word.
- REPEAT LIMIT: Ask the student to repeat the SAME word at most 2 times. After 2 repeat requests, stop correcting that word, encourage briefly in 繁體中文（台灣）, and teach the next lesson word. Never ask for a 3rd repeat on the same word.
"""

ENGLISH_TEACHER_RULES = """
LANGUAGE RULES (CRITICAL — follow in EVERY reply):
- You are a language teacher. The student learns Bahasa Indonesia.
- INSTRUCTION LANGUAGE: English ONLY for every explanation, meaning, question, praise, correction, and greeting.
- ZERO MIXING: After you say an Indonesian lesson word, every other word in that turn must be English. Never insert Chinese characters or Indonesian explanation words.
- Do NOT speak Bahasa Indonesia for explanations — ONLY use Indonesian when saying the lesson vocabulary or phrases themselves.
- Do NOT use Traditional Chinese, simplified Chinese, or any non-English instruction language.
- When demonstrating a lesson word or phrase: say the Indonesian word FIRST alone, pause briefly, then continue entirely in English. Use Indonesian phonetics — soft clear vowels, even syllables, no English stress patterns.
- Never anglicize Indonesian: Halo = HA-lo (not HAY-lo), Selamat = se-LAH-mat (not suh-LAH-mut), pagi = PAH-gi (not PAY-jee).
- Follow the PRONUNCIATION GUIDE in the lesson prompt exactly when demonstrating Indonesian.
- TEACHING MODE order: (1) say ONLY the Indonesian word/phrase with a brief pause, (2) explain the meaning in English, (3) give one short pronunciation tip in English referencing the guide, (4) end with ONE question in English — then STOP at the question mark.
- Example (correct): "Halo" [pause] "That means hello. Pronounce it HA-lo, mouth open. Can you try it?"
- Example (wrong): mixing Chinese or Indonesian into the explanation sentence.
- REACTING MODE: respond entirely in English. If correcting, model the Indonesian word again using Indonesian phonetics, pause, then explain in English.
- Keep the Indonesian lesson word separate from the English explanation — never blend them into one mispronounced word.
- REPEAT LIMIT: Ask the student to repeat the SAME word at most 2 times. After 2 repeat requests, stop correcting that word, encourage briefly in English, and teach the next lesson word. Never ask for a 3rd repeat on the same word.
- ALLOWED LIST ONLY: Teach ONLY Indonesian words/phrases from the lesson ALLOWED LIST / pronunciation guide. Never teach English topic labels (Greetings, Friends, Weather) as Indonesian vocabulary.
"""


def normalize_instruction_languages(custom: dict) -> list[str]:
    raw = custom.get("instruction_languages")
    if isinstance(raw, list):
        return [str(item) for item in raw if item]
    if isinstance(raw, str) and raw.strip():
        return [part.strip() for part in raw.split("+") if part.strip()]
    return []


def _normalized_codes(instruction_languages: list[str]) -> set[str]:
    return {code.lower().replace("_", "-") for code in instruction_languages}


def uses_zh_tw_teacher(instruction_languages: list[str], language_code: str) -> bool:
    if language_code != "id":
        return False
    codes = _normalized_codes(instruction_languages)
    if not codes:
        return True
    return "zh-tw" in codes


def uses_english_teacher(instruction_languages: list[str], language_code: str) -> bool:
    if language_code != "id":
        return False
    return "en" in _normalized_codes(instruction_languages)


def append_instruction_language_rules(
    system_prompt: str,
    language_code: str,
    instruction_languages: list[str],
) -> str:
    if uses_zh_tw_teacher(instruction_languages, language_code):
        return f"{ZH_TW_TEACHER_RULES.strip()}\n\n{system_prompt}"
    if uses_english_teacher(instruction_languages, language_code):
        return f"{ENGLISH_TEACHER_RULES.strip()}\n\n{system_prompt}"
    return system_prompt


REPEAT_LIMIT_RULE = (
    "REPEAT LIMIT (CRITICAL): You may ask the student to repeat the SAME word at most 2 times. "
    "After 2 repeat requests on one word, you MUST stop correcting that word, encourage briefly, "
    "and introduce the next lesson vocabulary item. Never ask for a 3rd repeat on the same word."
)


def append_repeat_limit_rule(system_prompt: str) -> str:
    return f"{system_prompt.strip()}\n\n{REPEAT_LIMIT_RULE}"


def move_on_after_repeats_hint(
    language_code: str,
    final_text: str,
    instruction_languages: list[str],
) -> str:
    if uses_zh_tw_teacher(instruction_languages, language_code):
        return (
            f"學生剛說了：「{final_text}」。"
            "依照規則：同一個詞已經重複練習兩次，不要再要求重複。"
            "用一句話鼓勵學生，然後用 TEACHING MODE 教下一個課程詞彙。"
        )
    return (
        f'The student just said: "{final_text}". '
        "Per lesson rules: they have already had 2 repeat attempts on this word. "
        "Do NOT ask them to repeat again. Encourage briefly, then teach the NEXT lesson word in TEACHING MODE."
    )


def zh_tw_greeting_hint(language_name: str) -> str:
    return (
        "Speak the greeting in Traditional Chinese (Taiwan / 繁體中文). "
        f"Then ask ONE short question in 繁體中文（台灣） to check if the student is ready to learn {language_name}. "
        "Do not use Bahasa Indonesia except for any Indonesian words in the scripted greeting itself. "
        "Then STOP and wait for their reply."
    )


def english_greeting_hint(language_name: str) -> str:
    return (
        "Speak the greeting in English. "
        f"Then ask ONE short question in English to check if the student is ready to learn {language_name}. "
        "Do not use Bahasa Indonesia except for any Indonesian words in the scripted greeting itself. "
        "Then STOP and wait for their reply."
    )


def greeting_hint_for_lesson(
    language_name: str,
    language_code: str,
    instruction_languages: list[str],
) -> str:
    if uses_zh_tw_teacher(instruction_languages, language_code):
        return zh_tw_greeting_hint(language_name)
    if uses_english_teacher(instruction_languages, language_code):
        return english_greeting_hint(language_name)
    return (
        "After the greeting, ask the student one simple question to get them talking — "
        f"for example 'Are you ready to get started?' or 'Have you learned any {language_name} before?' "
        "Then STOP and wait for the student's reply before teaching anything."
    )
