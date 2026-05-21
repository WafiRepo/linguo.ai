"""Tutor emotional style presets for the AI teacher voice agent."""

from instruction_language import uses_english_teacher, uses_zh_tw_teacher

VALID_EMOTIONS = frozenset({"warm", "calm", "energetic", "encouraging", "strict"})
DEFAULT_EMOTION = "warm"
EMOTION_MARKER = "EMOTION STYLE"

EMOTION_PROMPT_RULES_EN: dict[str, str] = {
    "warm": (
        "Speak warmly and patiently in English only. Use gentle encouragement. "
        "Stay friendly without being overly casual."
    ),
    "calm": (
        "Speak softly and at a relaxed pace in English only. Stay calm even if the student struggles. "
        "Avoid sounding rushed or loud."
    ),
    "energetic": (
        "Be upbeat and lively in English only. Show enthusiasm when the student tries. "
        "Keep energy high but still stop at each question mark."
    ),
    "encouraging": (
        "Focus on praise and motivation in English only. Lead with what went well before any correction. "
        "Keep corrections brief and kind."
    ),
    "strict": (
        "Be clear, direct, and structured in English only. Correct mistakes promptly but respectfully. "
        "Stay professional and concise."
    ),
}

EMOTION_PROMPT_RULES_ZH: dict[str, str] = {
    "warm": "用繁體中文（台灣）溫暖、耐心地說話，給予溫和的鼓勵，保持友善。",
    "calm": "用繁體中文（台灣）輕柔、從容地說話，即使學生卡住了也保持平靜，不要急促或大聲。",
    "energetic": "用繁體中文（台灣）活潑、有精神地說話，學生嘗試時給予熱忱，但仍要在問號處停止。",
    "encouraging": "用繁體中文（台灣）著重稱讚與動機，先肯定再簡短糾正，語氣要溫和。",
    "strict": "用繁體中文（台灣）清楚、直接、有條理地說話，及時糾正但保持尊重。",
}

OPENAI_VOICE_BY_EMOTION: dict[str, str] = {
    "warm": "coral",
    "calm": "sage",
    "energetic": "shimmer",
    "encouraging": "coral",
    "strict": "ash",
}


def normalize_tutor_emotion(raw: object) -> str:
    if not isinstance(raw, str):
        return DEFAULT_EMOTION
    emotion = raw.strip().lower()
    if emotion in VALID_EMOTIONS:
        return emotion
    return DEFAULT_EMOTION


def openai_voice_for_emotion(emotion: str) -> str:
    return OPENAI_VOICE_BY_EMOTION.get(emotion, OPENAI_VOICE_BY_EMOTION[DEFAULT_EMOTION])


def _emotion_rule(
    emotion: str,
    language_code: str,
    instruction_languages: list[str],
) -> str:
    if uses_zh_tw_teacher(instruction_languages, language_code):
        return EMOTION_PROMPT_RULES_ZH.get(emotion, EMOTION_PROMPT_RULES_ZH[DEFAULT_EMOTION])
    if uses_english_teacher(instruction_languages, language_code):
        return EMOTION_PROMPT_RULES_EN.get(emotion, EMOTION_PROMPT_RULES_EN[DEFAULT_EMOTION])
    return EMOTION_PROMPT_RULES_EN.get(emotion, EMOTION_PROMPT_RULES_EN[DEFAULT_EMOTION])


def strip_emotion_style_block(system_prompt: str) -> str:
    """Remove a prior EMOTION STYLE block (e.g. from mobile) so server can re-apply in the right language."""
    marker = EMOTION_MARKER
    idx = system_prompt.find(marker)
    if idx == -1:
        return system_prompt
    return system_prompt[:idx].strip()


def append_emotion_to_prompt(
    system_prompt: str,
    emotion: str,
    language_code: str,
    instruction_languages: list[str],
) -> str:
    rule = _emotion_rule(emotion, language_code, instruction_languages)
    cleaned = strip_emotion_style_block(system_prompt)
    return f"{cleaned.strip()}\n\n{EMOTION_MARKER} (follow in every reply, in your instruction language only): {rule}"


def log_emotion_voice(emotion: str) -> str:
    """Return mapped OpenAI voice name for logging (prompt controls tone; no session.voice)."""
    return openai_voice_for_emotion(emotion)
