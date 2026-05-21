"""Tutor emotional style presets for the AI teacher voice agent."""

from typing import Optional

VALID_EMOTIONS = frozenset({"warm", "calm", "energetic", "encouraging", "strict"})
DEFAULT_EMOTION = "warm"

EMOTION_PROMPT_RULES: dict[str, str] = {
    "warm": (
        "Speak warmly and patiently. Use gentle encouragement. "
        "Stay friendly without being overly casual."
    ),
    "calm": (
        "Speak softly and at a relaxed pace. Stay calm even if the student struggles. "
        "Avoid sounding rushed or loud."
    ),
    "energetic": (
        "Be upbeat and lively. Show enthusiasm when the student tries. "
        "Keep energy high but still stop at each question mark."
    ),
    "encouraging": (
        "Focus on praise and motivation. Lead with what went well before any correction. "
        "Keep corrections brief and kind."
    ),
    "strict": (
        "Be clear, direct, and structured. Correct mistakes promptly but respectfully. "
        "Stay professional and concise."
    ),
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


def append_emotion_to_prompt(system_prompt: str, emotion: str) -> str:
    rule = EMOTION_PROMPT_RULES.get(emotion, EMOTION_PROMPT_RULES[DEFAULT_EMOTION])
    marker = "EMOTION STYLE"
    if marker in system_prompt:
        return system_prompt
    return f"{system_prompt.strip()}\n\n{marker} (follow in every reply): {rule}"


def apply_openai_voice(agent, emotion: str) -> Optional[str]:
    """Best-effort voice override on the Realtime LLM plugin."""
    voice = openai_voice_for_emotion(emotion)
    llm = agent.llm

    for attr in ("voice",):
        if hasattr(llm, attr):
            try:
                setattr(llm, attr, voice)
            except Exception:
                pass

    realtime_session = getattr(llm, "realtime_session", None)
    if isinstance(realtime_session, dict):
        realtime_session["voice"] = voice

    return voice
