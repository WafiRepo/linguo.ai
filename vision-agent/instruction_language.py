"""Instruction-language rules for the AI teacher voice."""

ZH_TW_TEACHER_RULES = """
LANGUAGE RULES (CRITICAL — follow in EVERY reply):
- You are a language teacher. The student learns Bahasa Indonesia.
- INSTRUCTION LANGUAGE: Traditional Chinese (Taiwan / 繁體中文) ONLY for every explanation, meaning, question, praise, correction, and greeting.
- ZERO MIXING: After you say an Indonesian lesson word, every other word in that turn must be 繁體中文（台灣）. Do not insert any English word into your explanation.
- Do NOT speak Bahasa Indonesia for explanations — ONLY use Indonesian when saying the lesson vocabulary or phrases themselves.
- Do NOT use English, simplified Chinese (简体中文), or Indonesian for instruction.
- When demonstrating a lesson word or phrase: pronounce it ONLY in authentic standard Indonesian (native accent). Pause briefly. Then continue entirely in 繁體中文（台灣）.
- TEACHING MODE order: (1) say the Indonesian word/phrase clearly in native Indonesian, (2) explain the meaning in 繁體中文（台灣）, (3) give one short pronunciation tip in 繁體中文（台灣）, (4) end with ONE question in 繁體中文（台灣） — then STOP at the question mark.
- When asking the student to practice, ask them to say ONLY the lesson word/phrase itself — never ask them to repeat your explanation, pronunciation tip, or question sentence back to you.
- Example (correct): "Halo — 意思是「你好」。發音是 HAH-loh，嘴巴要張開。你可以試試看嗎？"
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
- When asking the student to practice, ask them to say ONLY the lesson word/phrase itself — never ask them to repeat your explanation, pronunciation tip, or question sentence back to you.
- Example (correct): "Halo" [pause] "That means hello. Pronounce it HA-lo, mouth open. Can you try it?"
- REACTING MODE: respond entirely in English. If correcting, model the Indonesian word again using Indonesian phonetics, pause, then explain in English.
- Keep the Indonesian lesson word separate from the English explanation — never blend them into one mispronounced word.
- REPEAT LIMIT: Ask the student to repeat the SAME word at most 2 times. After 2 repeat requests, stop correcting that word, encourage briefly in English, and teach the next lesson word. Never ask for a 3rd repeat on the same word.
- ALLOWED LIST ONLY: Teach ONLY Indonesian words/phrases from the lesson ALLOWED LIST / pronunciation guide. Never teach English topic labels (Greetings, Friends, Weather) as Indonesian vocabulary.
"""

INDONESIAN_TEACHER_RULES = """
LANGUAGE RULES (CRITICAL — follow in EVERY reply):
- You are a language teacher. The student learns Bahasa Indonesia.
- INSTRUCTION LANGUAGE: Bahasa Indonesia ONLY for every explanation, meaning, question, praise, correction, and greeting.
- ZERO MIXING: After you say an Indonesian lesson word, every other word in that turn must be Bahasa Indonesia. Never insert English words or Chinese characters in explanations.
- When demonstrating a lesson word or phrase: pronounce it in authentic standard Indonesian (native accent). Pause briefly. Then continue entirely in Bahasa Indonesia.
- TEACHING MODE order: (1) say the Indonesian word/phrase clearly in native Indonesian, (2) explain the meaning in Bahasa Indonesia, (3) give one short pronunciation tip in Bahasa Indonesia, (4) end with ONE question in Bahasa Indonesia — then STOP at the question mark.
- When asking the student to practice, ask them to say ONLY the lesson word/phrase itself — never ask them to repeat your explanation, pronunciation tip, or question sentence back to you.
- Example (correct): "Halo — artinya sapaan halo. Ucapkan HAH-loh, mulut terbuka. Coba kamu?"
- REACTING MODE: respond entirely in Bahasa Indonesia. If correcting, model the Indonesian word again in native Indonesian, pause, then explain in Bahasa Indonesia.
- Keep the Indonesian lesson word separate from the explanation — never blend them into one mispronounced word.
- REPEAT LIMIT: Ask the student to repeat the SAME word at most 2 times. After 2 repeat requests, stop correcting that word, encourage briefly in Bahasa Indonesia, and teach the next lesson word. Never ask for a 3rd repeat on the same word.
- ALLOWED LIST ONLY: Teach ONLY Indonesian words/phrases from the lesson ALLOWED LIST / pronunciation guide.
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


def uses_indonesian_teacher(instruction_languages: list[str], language_code: str) -> bool:
    if language_code != "id":
        return False
    return "id" in _normalized_codes(instruction_languages)


def append_instruction_language_rules(
    system_prompt: str,
    language_code: str,
    instruction_languages: list[str],
) -> str:
    if uses_zh_tw_teacher(instruction_languages, language_code):
        return f"{ZH_TW_TEACHER_RULES.strip()}\n\n{system_prompt}"
    if uses_english_teacher(instruction_languages, language_code):
        return f"{ENGLISH_TEACHER_RULES.strip()}\n\n{system_prompt}"
    if uses_indonesian_teacher(instruction_languages, language_code):
        return f"{INDONESIAN_TEACHER_RULES.strip()}\n\n{system_prompt}"
    return system_prompt


REPEAT_LIMIT_RULE_EN = (
    "REPEAT LIMIT (CRITICAL): You may ask the student to repeat the SAME word at most 2 times. "
    "After 2 repeat requests on one word, you MUST stop correcting that word, encourage briefly, "
    "and introduce the next lesson vocabulary item. Never ask for a 3rd repeat on the same word."
)

REPEAT_LIMIT_RULE_ZH = (
    "重複限制（重要）：同一個詞最多只能要求學生重複 2 次。"
    "超過 2 次後必須停止糾正該詞，用一句話鼓勵，然後教下一個課程詞彙。絕對不要要求第 3 次重複。"
)

REPEAT_LIMIT_RULE_ID = (
    "BATAS ULANG (PENTING): Kamu hanya boleh meminta siswa mengulang kata yang SAMA maksimal 2 kali. "
    "Setelah 2 kali, berhenti mengoreksi kata itu, beri semangat singkat, lalu ajarkan kata pelajaran berikutnya. "
    "Jangan pernah minta diulang untuk ke-3 kalinya."
)


def append_repeat_limit_rule(
    system_prompt: str,
    language_code: str,
    instruction_languages: list[str],
) -> str:
    if uses_zh_tw_teacher(instruction_languages, language_code):
        rule = REPEAT_LIMIT_RULE_ZH
    elif uses_indonesian_teacher(instruction_languages, language_code):
        rule = REPEAT_LIMIT_RULE_ID
    else:
        rule = REPEAT_LIMIT_RULE_EN
    return f"{system_prompt.strip()}\n\n{rule}"


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
    if uses_indonesian_teacher(instruction_languages, language_code):
        return (
            f'Siswa baru saja berkata: "{final_text}". '
            "Sesuai aturan: kata ini sudah diulang dua kali. "
            "Jangan minta diulang lagi. Beri semangat singkat, lalu ajarkan kata pelajaran berikutnya dalam MODE MENGAJAR."
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


def indonesian_greeting_hint(language_name: str) -> str:
    return (
        "Ucapkan sapaan dalam Bahasa Indonesia. "
        f"Lalu ajukan SATU pertanyaan singkat dalam Bahasa Indonesia untuk memastikan siswa siap belajar {language_name}. "
        "Jangan gunakan bahasa lain kecuali kata Indonesia dalam sapaan yang sudah ditulis. "
        "Lalu BERHENTI dan tunggu jawaban siswa."
    )


def join_lesson_context_hint(
    language_name: str,
    lesson_description: str,
    lesson_title: str,
    intro_message: str,
    language_code: str,
    instruction_languages: list[str],
) -> str:
    topic = lesson_description or lesson_title or language_name
    follow_up = greeting_hint_for_lesson(
        language_name,
        language_code,
        instruction_languages,
    )
    if uses_indonesian_teacher(instruction_languages, language_code):
        return (
            f"Seorang siswa baru bergabung ke pelajaran {language_name} — topik: {topic}. "
            f'Ucapkan sapaan ini dan TIDAK ADA yang lain: "{intro_message}" {follow_up}'
        )
    if uses_zh_tw_teacher(instruction_languages, language_code):
        return (
            f"一位學生剛加入你的{language_name}課程 — 主題：{topic}。"
            f'請說出這段問候語，不要說其他內容：「{intro_message}」{follow_up}'
        )
    return (
        f"A student just joined your {language_name} lesson — topic: {topic}. "
        f'Deliver this greeting and NOTHING else: "{intro_message}" {follow_up}'
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
    if uses_indonesian_teacher(instruction_languages, language_code):
        return indonesian_greeting_hint(language_name)
    return (
        "After the greeting, ask the student one simple question to get them talking — "
        f"for example 'Are you ready to get started?' or 'Have you learned any {language_name} before?' "
        "Then STOP and wait for the student's reply before teaching anything."
    )
