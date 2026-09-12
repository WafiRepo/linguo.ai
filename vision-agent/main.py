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
from class_management import (  # noqa: E402
    ClassManagementController,
    build_class_management_system_prompt,
    parse_allowed_phrases,
    parse_class_turns,
)
from instruction_language import (  # noqa: E402
    append_instruction_language_rules,
    append_repeat_limit_rule,
    greeting_hint_for_lesson,
    join_lesson_context_hint,
    move_on_after_repeats_hint,
    normalize_instruction_languages,
)
from pronunciation import append_pronunciation_guide  # noqa: E402
from tutor_emotion import (  # noqa: E402
    append_emotion_to_prompt,
    log_emotion_voice,
    normalize_tutor_emotion,
    strip_emotion_style_block,
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
    "Follow the INSTRUCTION LANGUAGE rules appended to this prompt — use that language only for explanations. "
    "You operate in exactly two modes and NEVER mix them:\n"
    "TEACHING MODE: Say one lesson word or phrase in the target language, then explain its meaning "
    "and one pronunciation tip in your instruction language only. "
    "End with a single short question in your instruction language. "
    "Your turn is OVER at that question mark. Stop speaking. Output nothing else. "
    "Do NOT imagine what the student will say. Do NOT pre-write your reaction. Just stop.\n"
    "REACTING MODE: You have just received actual speech from the student in this turn. "
    "React to what they actually said — one sentence of praise or correction in your instruction language — "
    "then either ask them to try again or introduce the next word. Stop.\n"
    "ABSOLUTE RULES:\n"
    "- Never say praise unless the student has ACTUALLY spoken in the current turn.\n"
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
    _apply_realtime_audio_config(
        agent, language_code, create_response=True, interrupt_response=True
    )


def _configure_realtime_for_class_management(agent: Agent, language_code: str) -> None:
    """Class management: Python controller owns every agent turn via simple_response.

    interrupt_response=False here (unlike lesson mode): the mic is already
    gated by push-to-talk on the client (only enabled during the student's
    turn), so we don't need VAD-triggered interrupts as a safety net — and
    leaving it on meant any echo/background noise picked up while Sari was
    still speaking would cut her audio off mid-sentence.
    """
    _apply_realtime_audio_config(
        agent, language_code, create_response=False, interrupt_response=False
    )


def _apply_realtime_audio_config(
    agent: Agent,
    language_code: str,
    *,
    create_response: bool,
    interrupt_response: bool,
) -> None:
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

    input_cfg["turn_detection"] = ServerVad(
        type="server_vad",
        threshold=0.5,
        prefix_padding_ms=200,
        silence_duration_ms=400,
        interrupt_response=interrupt_response,
        create_response=create_response,
    )


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
    if not custom.get("system_prompt"):
        print(
            f"[agent] WARNING: no system_prompt in call custom data for {call_id!r} — "
            "falling back to the English-only DEFAULT_SYSTEM_PROMPT. This means the "
            "app's call.update() did not reach Stream before this agent joined, so the "
            "tutor voice/language selection was never received."
        )
    intro_message  = custom.get("intro_message")
    lesson_title   = custom.get("lesson_title") or ""
    lesson_description = custom.get("lesson_description") or ""
    language_code, language_name = _resolve_language(custom, call_id)
    instruction_languages = normalize_instruction_languages(custom)
    # Guru Indonesia (id) speaks lesson vocabulary in native Indonesian but
    # explains in Traditional Chinese — same explanation language as Guru
    # Taiwan, just a different teacher persona (mirrors the client-side
    # remap in lib/instructionLanguage.ts). Class management keeps "id" as
    # pure Indonesian explanation, so use this only for lesson-mode hints
    # (system prompt, greeting, repeat-limit) — never for class management.
    lesson_instruction_languages = (
        ["zh-TW"] if "id" in instruction_languages else instruction_languages
    )
    tutor_emotion = normalize_tutor_emotion(custom.get("tutor_emotion"))
    session_mode = str(custom.get("mode") or "lesson")
    is_class_management = session_mode == "class_management"
    practice_mode = str(custom.get("practice_mode") or "teach")
    comic_scope = str(custom.get("comic_scope") or "")
    allowed_phrases = parse_allowed_phrases(custom.get("allowed_phrases"))

    print(
        f"[agent] Joining call {call_id}: "
        f"mode={session_mode!r}, "
        f"language_code={language_code!r}, language_name={language_name!r}, "
        f"instruction_languages={instruction_languages!r}, "
        f"tutor_emotion={tutor_emotion!r}, "
        f"lesson_title={lesson_title!r}, "
        f"lesson_description={lesson_description!r}"
    )

    if is_class_management:
        system_prompt = build_class_management_system_prompt(
            system_prompt,
            language_code,
            instruction_languages,
            comic_scope,
            allowed_phrases,
            practice_mode,
        )
        system_prompt = append_emotion_to_prompt(
            system_prompt,
            tutor_emotion,
            language_code,
            instruction_languages,
        )
    else:
        # The client always appends its own trailing emotion block. Strip it
        # now, before the appends below — otherwise append_emotion_to_prompt's
        # own strip (at the end of this chain) would find that marker first
        # and silently truncate away everything appended after it (the
        # pronunciation guide and repeat-limit rule).
        system_prompt = strip_emotion_style_block(system_prompt)

        system_prompt = append_instruction_language_rules(
            system_prompt,
            language_code,
            lesson_instruction_languages,
        )
        system_prompt = append_pronunciation_guide(
            system_prompt,
            custom.get("vocabulary") or [],
            custom.get("phrases") or [],
            language_code,
            lesson_instruction_languages,
        )
        system_prompt = append_repeat_limit_rule(
            system_prompt,
            language_code,
            lesson_instruction_languages,
        )
        system_prompt = append_emotion_to_prompt(
            system_prompt,
            tutor_emotion,
            language_code,
            lesson_instruction_languages,
        )

    voice_name = log_emotion_voice(tutor_emotion)
    print(
        f"[agent] Tutor emotion={tutor_emotion!r} "
        f"(voice tone via prompt; default voice={voice_name})"
    )

    if is_class_management:
        _configure_realtime_for_class_management(agent, language_code)
    else:
        _configure_realtime_for_lesson(agent, language_code)

    # Apply lesson-specific instructions before joining so the Realtime LLM receives them.
    #
    # Setting agent.instructions alone is NOT enough: the Agent/LLM pairing only
    # calls llm._attach_agent(agent) -> llm.set_instructions(agent.instructions)
    # ONCE, at Agent construction time (during the warm-agent-pool startup in
    # create_agent()). Since this agent instance is reused across every call,
    # every session after the first would silently keep using that
    # construction-time DEFAULT_SYSTEM_PROMPT instead of this call's real
    # system_prompt — call llm.set_instructions() explicitly here so the
    # Realtime session (realtime_session["instructions"], read fresh in
    # llm.connect() below via agent.join()) picks up this call's prompt.
    agent.instructions = Instructions(input_text=system_prompt)
    agent.llm.set_instructions(agent.instructions)

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
    class_mgmt: ClassManagementController | None = None

    if is_class_management:
        class_turns = parse_class_turns(
            custom.get("class_turns") or custom.get("class_turns_json")
        )
        try:
            # Every line spoken in class management is fixed script text, so
            # this bypasses the Realtime LLM entirely (see
            # ClassManagementController._speak_direct) — a plain TTS call
            # instead of a full model round trip, and 100% faithful to the
            # exact text instead of relying on the model to recite it right.
            direct_tts = openai.TTS(voice="coral")
        except Exception as exc:
            print(f"[agent] Could not init direct TTS, will use LLM for every turn: {exc}")
            direct_tts = None
        class_mgmt = ClassManagementController(
            agent=agent,
            turns=class_turns,
            intro_message=str(intro_message or ""),
            topic_title=str(custom.get("topic_title") or lesson_title or "Class Management"),
            comic_scope=comic_scope,
            allowed_phrases=allowed_phrases,
            instruction_languages=instruction_languages,
            language_code=language_code,
            practice_mode=practice_mode,
            direct_tts=direct_tts,
        )
        print(f"[agent] Class management turns={len(class_turns)} practice_mode={practice_mode!r}")

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

    # Holds a queued "move to next word" hint until the in-flight automatic
    # response finishes speaking — firing it immediately would race the
    # Realtime session's own auto-response (create_response=True) to the same
    # student turn and produce two overlapping AI voices.
    pending_move_on_hint: str | None = None

    async def handle_user_feedback(final_text: str) -> None:
        nonlocal pending_move_on_hint
        if class_mgmt is not None:
            await class_mgmt.on_student_speech(final_text)
            return
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
            pending_move_on_hint = move_on_after_repeats_hint(
                language_code,
                final_text,
                lesson_instruction_languages,
            )
            _safe_log(
                "[agent] repeat limit reached — will move to next word "
                "once the current reply finishes"
            )

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
        nonlocal pending_move_on_hint
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
            # openai_realtime.py's "response.audio_transcript.done" handler
            # calls this with the COMPLETE transcript in `text` directly —
            # it does not depend on "delta" events having accumulated
            # anything in partial_agent first (OpenAI doesn't always send
            # deltas for short utterances). Reading only partial_agent here
            # made full_text empty on every single turn, so class_mgmt's
            # "skip empty finals" guard ended up skipping ALL of them,
            # permanently stalling the state machine after the first line.
            full_text = text.strip() or "".join(partial_agent).strip()
            partial_agent.clear()
            if class_mgmt is not None:
                # Logs exactly what Sari said for every turn — compare this
                # against the hint that was sent if the script ever drifts
                # to another topic's dialogue or adds unrequested commentary.
                _safe_log(f"[class-mgmt] Sari said (final): {full_text!r}")
                if not full_text:
                    # A handful of internal events (e.g. an interrupt/flush
                    # with nothing pending) can still fire this callback with
                    # truly no text. Only a turn Sari actually spoke should
                    # advance the state machine.
                    return
                class_mgmt.on_agent_speech_final()
            elif pending_move_on_hint is not None:
                hint = pending_move_on_hint
                pending_move_on_hint = None
                _safe_log("[agent] repeat limit reached — moving to next word")
                asyncio.create_task(agent.simple_response(hint))

    llm._emit_user_speech_transcription = emit_user_speech_transcription
    llm._emit_agent_speech_transcription = emit_agent_speech_transcription

    try:
        async with agent.join(call):
            # Wait for the student to join (returns immediately if already present)
            await agent.wait_for_participant(timeout=60.0)

            if is_class_management and class_mgmt is not None:
                await class_mgmt.start()
            elif intro_message:
                context = join_lesson_context_hint(
                    language_name,
                    lesson_description,
                    lesson_title,
                    intro_message,
                    language_code,
                    lesson_instruction_languages,
                )
                await agent.simple_response(context)
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
