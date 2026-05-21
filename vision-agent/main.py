import asyncio
import os
from typing import Optional

from dotenv import load_dotenv

# Load Stream keys from the parent repo .env
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
# Local .env adds OPENAI_API_KEY and can override any key
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"), override=True)

from getstream.models import MemberRequest  # noqa: E402
from openai.types.realtime.realtime_transcription_session_audio_input_turn_detection_param import ServerVad  # noqa: E402
from vision_agents.core import Agent, AgentLauncher, User, Runner  # noqa: E402
from vision_agents.core.instructions import Instructions  # noqa: E402
from vision_agents.plugins import getstream, openai  # noqa: E402

from feedback import FeedbackRollingAverage, RepeatTracker, assess_user_turn  # noqa: E402
from instruction_language import (  # noqa: E402
    append_instruction_language_rules,
    append_repeat_limit_rule,
    greeting_hint_for_lesson,
    move_on_after_repeats_hint,
    normalize_instruction_languages,
)
from pronunciation import append_pronunciation_guide  # noqa: E402
from tutor_emotion import (  # noqa: E402
    append_emotion_to_prompt,
    apply_openai_voice,
    normalize_tutor_emotion,
)

AGENT_USER_ID = "ai-teacher"

LANGUAGE_NAMES: dict[str, str] = {
    "es": "Spanish",
    "fr": "French",
    "ja": "Japanese",
    "de": "German",
    "id": "Indonesian",
}

DEFAULT_SYSTEM_PROMPT = (
    "You are an AI language teacher having a real voice conversation with a student. "
    "You operate in exactly two modes and NEVER mix them:\n"
    "TEACHING MODE: Say one word or phrase, its English meaning, and one pronunciation tip. "
    "End with a single question like 'Can you say that?' or 'Give it a try!'. "
    "Your turn is OVER at that question mark. Stop speaking. Output nothing else. "
    "Do NOT imagine what the student will say. Do NOT pre-write your reaction. Just stop.\n"
    "REACTING MODE: You have just received actual speech from the student in this turn. "
    "React to what they actually said — one sentence of praise or correction — "
    "then either ask them to try again or introduce the next word. Stop.\n"
    "ABSOLUTE RULES:\n"
    "- Never say 'Nice job', 'Perfect', 'Great', or any praise unless the student has "
    "ACTUALLY spoken in the current turn and you heard something from them.\n"
    "- Never continue past a question mark. Every question is a hard stop.\n"
    "- Never role-play the student's response or write what you imagine they said.\n"
    "- Keep every reply to one or two short sentences maximum.\n"
    "- Stay strictly within the current lesson's vocabulary.\n"
    "- REPEAT LIMIT: Ask the student to repeat the SAME word at most 2 times. "
    "After 2 repeat requests on one word, encourage briefly and teach the next lesson word. "
    "Never ask for a 3rd repeat on the same word."
)

def _safe_log(message: str) -> None:
    try:
        print(message)
    except UnicodeEncodeError:
        print(message.encode("ascii", errors="backslashreplace").decode("ascii"))


def _require_env(var_name: str) -> None:
    if not os.getenv(var_name):
        raise RuntimeError(f"Missing required environment variable: {var_name}")

def _language_code_from_call_id(call_id: str) -> Optional[str]:
    """Parse language code from call_id like lesson-{lessonId}-{userId}."""
    if not call_id.startswith("lesson-"):
        return None
    remainder = call_id[len("lesson-"):]
    user_marker = "-user_"
    if user_marker in remainder:
        lesson_id = remainder[: remainder.index(user_marker)]
    else:
        lesson_id = remainder
    if "-lesson-" in lesson_id:
        return lesson_id.split("-lesson-", 1)[0]
    return None


def _resolve_language(custom: dict, call_id: str) -> tuple[str, str]:
    """Return (language_code, language_name) from call custom data or call_id."""
    language_code = str(
        custom.get("language_code") or custom.get("language") or ""
    )
    lesson_id = str(custom.get("lesson_id") or "")

    if not language_code and lesson_id and "-lesson-" in lesson_id:
        language_code = lesson_id.split("-lesson-", 1)[0]

    if not language_code:
        parsed = _language_code_from_call_id(call_id)
        language_code = parsed or ""

    language_name = LANGUAGE_NAMES.get(language_code) or "language"
    return language_code, language_name


def _configure_realtime_for_lesson(agent: Agent, language_code: str) -> None:
    """Tune OpenAI Realtime session per lesson language."""
    llm = agent.llm
    realtime_session = getattr(llm, "realtime_session", None)
    if not isinstance(realtime_session, dict):
        return

    audio = realtime_session.setdefault("audio", {})
    input_cfg = audio.setdefault("input", {})
    transcription = input_cfg.setdefault("transcription", {})
    transcription["model"] = "gpt-4o-mini-transcribe"

    if language_code == "id":
        transcription["language"] = "id"
    else:
        transcription.pop("language", None)


async def create_agent(**kwargs) -> Agent:
    return Agent(
        edge=getstream.Edge(),
        llm=openai.Realtime(
            voice="coral",
            # server_vad fires on raw audio energy (~100 ms after mic opens) rather
            # than waiting for semantic speech intent detection (~500 ms+).
            # This means the agent stops speaking almost immediately when the user
            # presses the push-and-hold mic button, before they have said a word.
            realtime_session={
                "type": "realtime",
                "audio": {
                    "input": {
                        "transcription": {"model": "gpt-4o-mini-transcribe"},
                        "turn_detection": ServerVad(
                            type="server_vad",
                            threshold=0.4,         # low enough to catch ambient noise on mic open
                            prefix_padding_ms=200,  # capture brief audio before speech onset
                            silence_duration_ms=400, # commit turn after 400 ms of silence
                            interrupt_response=True, # stop agent audio the moment VAD fires
                        ),
                    }
                },
            }
        ),
        agent_user=User(name="AI Teacher", id=AGENT_USER_ID),
        instructions=DEFAULT_SYSTEM_PROMPT,
    )


async def join_call(agent: Agent, call_type: str, call_id: str, **kwargs) -> None:
    call = await agent.create_call(call_type, call_id)

    # Read lesson context packed into the call's custom data by the mobile app
    custom: dict = {}
    try:
        resp = await call.get()
        custom = resp.data.call.custom or {}
    except Exception as e:
        print(f"[agent] Warning: could not fetch call custom data: {e}")

    system_prompt  = custom.get("system_prompt") or DEFAULT_SYSTEM_PROMPT
    intro_message  = custom.get("intro_message")
    lesson_title   = custom.get("lesson_title") or ""
    lesson_description = custom.get("lesson_description") or ""
    language_code, language_name = _resolve_language(custom, call_id)
    instruction_languages = normalize_instruction_languages(custom)
    tutor_emotion = normalize_tutor_emotion(custom.get("tutor_emotion"))

    print(
        f"[agent] Joining call {call_id}: "
        f"language_code={language_code!r}, language_name={language_name!r}, "
        f"instruction_languages={instruction_languages!r}, "
        f"tutor_emotion={tutor_emotion!r}, "
        f"lesson_title={lesson_title!r}, "
        f"lesson_description={lesson_description!r}"
    )

    if language_name != "language" and language_name not in system_prompt:
        system_prompt = (
            f"You are teaching {language_name} (language code: {language_code}). "
            f"{system_prompt}"
        )

    system_prompt = append_instruction_language_rules(
        system_prompt,
        language_code,
        instruction_languages,
    )
    system_prompt = append_pronunciation_guide(
        system_prompt,
        custom.get("vocabulary") or [],
        custom.get("phrases") or [],
        language_code,
    )
    system_prompt = append_repeat_limit_rule(system_prompt)
    system_prompt = append_emotion_to_prompt(system_prompt, tutor_emotion)

    voice_name = apply_openai_voice(agent, tutor_emotion)
    if voice_name:
        print(f"[agent] OpenAI Realtime voice: {voice_name} (emotion={tutor_emotion})")

    _configure_realtime_for_lesson(agent, language_code)

    # Apply lesson-specific instructions before joining so the Realtime LLM receives them
    agent.instructions = Instructions(input_text=system_prompt)

    # Grant admin role + go live so the agent can publish audio
    try:
        await call.update_call_members(
            update_members=[MemberRequest(user_id=AGENT_USER_ID, role="admin")]
        )
    except Exception as e:
        print(f"[agent] Warning: could not set admin role: {e}")

    try:
        await call.go_live()
    except Exception as e:
        print(f"[agent] Warning: go_live failed (expected for default call type): {e}")

    # Accumulate transcript deltas and forward them as Stream custom events so the
    # mobile app can display real-time captions word-by-word as speech is generated.
    partial_agent: list[str] = []
    lesson_vocabulary = custom.get("vocabulary") or []
    lesson_phrases = custom.get("phrases") or []
    feedback_tracker = FeedbackRollingAverage()
    repeat_tracker = RepeatTracker()

    async def send_feedback_update(scores: dict[str, str]) -> None:
        try:
            await agent.send_custom_event({
                "type": "feedback_update",
                "speaking": scores["speaking"],
                "pronunciation": scores["pronunciation"],
                "grammar": scores["grammar"],
            })
        except Exception as e:
            print(f"[agent] feedback_update error: {e}")

    async def handle_user_feedback(final_text: str) -> None:
        turn_scores = assess_user_turn(
            final_text,
            lesson_vocabulary,
            lesson_phrases,
        )
        rolled_scores = feedback_tracker.update(turn_scores)
        should_move_on = repeat_tracker.record_attempt(
            final_text,
            lesson_vocabulary,
            lesson_phrases,
        )
        _safe_log(
            f"[agent] feedback for {final_text!r}: {rolled_scores}, "
            f"should_move_on={should_move_on}"
        )
        await send_feedback_update(rolled_scores)
        if should_move_on:
            hint = move_on_after_repeats_hint(
                language_code,
                final_text,
                instruction_languages,
            )
            _safe_log("[agent] repeat limit reached — moving to next word")
            await agent.simple_response(hint)

    llm = agent.llm
    original_emit_user = llm._emit_user_speech_transcription
    original_emit_agent = llm._emit_agent_speech_transcription

    def emit_user_speech_transcription(text: str, *, mode) -> None:
        original_emit_user(text, mode=mode)
        if mode != "final":
            return
        final_text = text.strip()
        if final_text:
            asyncio.create_task(handle_user_feedback(final_text))

    def emit_agent_speech_transcription(text: str, *, mode) -> None:
        original_emit_agent(text, mode=mode)
        if mode == "delta" and text:
            partial_agent.append(text)
            asyncio.create_task(
                agent.send_custom_event({
                    "type": "transcript_partial",
                    "speaker": "agent",
                    "text": "".join(partial_agent),
                })
            )
        elif mode == "final":
            partial_agent.clear()

    llm._emit_user_speech_transcription = emit_user_speech_transcription
    llm._emit_agent_speech_transcription = emit_agent_speech_transcription

    try:
        async with agent.join(call):
            # Wait for the student to join (returns immediately if already present)
            await agent.wait_for_participant(timeout=60.0)

            if intro_message:
                context_parts = [f"A student just joined your {language_name} lesson"]
                if lesson_description:
                    context_parts[0] += f" — topic: {lesson_description}"
                elif lesson_title:
                    context_parts[0] += f" — '{lesson_title}'"
                context_parts[0] += "."
                follow_up = greeting_hint_for_lesson(
                    language_name,
                    language_code,
                    instruction_languages,
                )
                context_parts.append(
                    f'Deliver this greeting and NOTHING else: "{intro_message}" {follow_up}'
                )
                await agent.simple_response(" ".join(context_parts))
            else:
                await agent.simple_response(
                    f"A student just joined your {language_name} lesson. "
                    f"Greet them warmly and ask one short question — like 'Ready to learn some {language_name}?' "
                    f"Then STOP and wait for their reply before you teach anything."
                )

            await agent.finish()
    finally:
        llm._emit_user_speech_transcription = original_emit_user
        llm._emit_agent_speech_transcription = original_emit_agent


if __name__ == "__main__":
    _require_env("STREAM_API_KEY")
    _require_env("STREAM_API_SECRET")
    _require_env("OPENAI_API_KEY")

    Runner(AgentLauncher(create_agent=create_agent, join_call=join_call)).cli()
