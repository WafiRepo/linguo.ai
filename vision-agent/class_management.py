"""Turn-based class management dialogue sessions — comic script only."""

from __future__ import annotations

import asyncio
import json
import time
from dataclasses import dataclass, field
from typing import Any, Optional

from vision_agents.core.agents.inference import AudioOutputChunk

from feedback import _best_target_match
from instruction_language import uses_indonesian_teacher, uses_zh_tw_teacher

MAX_ATTEMPTS = 2
ACCEPTABLE_MATCH_SCORE = 0.65


def parse_class_turns(raw: object) -> list[dict[str, Any]]:
    if isinstance(raw, str) and raw.strip():
        try:
            parsed = json.loads(raw)
            if isinstance(parsed, list):
                return [item for item in parsed if isinstance(item, dict)]
        except json.JSONDecodeError:
            return []
    if isinstance(raw, list):
        return [item for item in raw if isinstance(item, dict)]
    return []


def parse_allowed_phrases(raw: object) -> list[str]:
    if isinstance(raw, str) and raw.strip():
        try:
            parsed = json.loads(raw)
            if isinstance(parsed, list):
                return [str(item) for item in parsed if item]
        except json.JSONDecodeError:
            return []
    if isinstance(raw, list):
        return [str(item) for item in raw if item]
    return []


def evaluate_student_response(
    text: str,
    expected_answers: list[str],
    guru_line: str = "",
) -> tuple[bool, bool]:
    """Return (is_correct, repeated_guru_line)."""
    if not text.strip() or not expected_answers:
        return False, False

    student_score = _best_target_match(text, expected_answers)
    if student_score >= ACCEPTABLE_MATCH_SCORE:
        return True, False

    if not guru_line:
        return False, False

    guru_score = _best_target_match(text, [guru_line])
    # Only flag guru echo when closer to guru than any student answer
    repeated_guru = guru_score >= 0.55 and guru_score > student_score
    return False, repeated_guru


def _roleplay_mode_note(
    language_code: str,
    instruction_languages: list[str],
) -> str:
    if uses_zh_tw_teacher(instruction_languages, language_code):
        return (
            "- 角色扮演模式：不要評分、不要說「答對了」或「再試一次」、不要給任何回饋。"
            "學生說完話後，直接接著唸下一段老師台詞即可。\n"
        )
    if uses_indonesian_teacher(instruction_languages, language_code):
        return (
            "- Mode Role Play: JANGAN menilai benar/salah, JANGAN bilang 'Bagus' atau 'Coba lagi', "
            "JANGAN beri feedback apapun. Begitu siswa selesai bicara, langsung lanjut ke kalimat "
            "guru berikutnya.\n"
        )
    return (
        "- Role Play mode: do NOT judge correctness, do NOT say \"Good\" or \"Try again\", do NOT "
        "give any feedback. As soon as the student finishes speaking, move straight to the next "
        "teacher line.\n"
    )


def _comic_session_rules(
    language_code: str,
    instruction_languages: list[str],
    comic_scope: str,
    allowed_phrases: list[str],
    practice_mode: str = "teach",
) -> str:
    allowed = ", ".join(f'"{p}"' for p in allowed_phrases) if allowed_phrases else "(see script)"
    roleplay_note = (
        _roleplay_mode_note(language_code, instruction_languages)
        if practice_mode == "roleplay"
        else ""
    )

    if uses_zh_tw_teacher(instruction_languages, language_code):
        return (
            "漫畫對話模式（必守）：\n"
            f"- 範圍：{comic_scope}\n"
            f"- 只能使用漫畫詞句：{allowed}。\n"
            "- 嚴格依照控制器提示進行，不可自創對話或額外課堂指令。你是在唸稿，不是自由聊天。\n"
            "- 老師台詞必須逐字來自腳本。這是普通的師生對話，不是教學講解。\n"
            "- 唯一的例外：controller 明確要求時，針對學生答錯給簡短回饋。除此之外，"
            "絕對不要解釋、翻譯、或補充任何說明——連一句都不行。不要加「意思是」「也就是說」"
            "這類詞，不要主動說明任何一句話的含義。\n"
            f"{roleplay_note}"
            "- 然後停止，等待學生。\n"
        )

    if uses_indonesian_teacher(instruction_languages, language_code):
        return (
            "MODE KOMIK SAJA (WAJIB):\n"
            f"- Ruang lingkup: {comic_scope}\n"
            f"- Hanya frasa dari komik: {allowed}.\n"
            "- JANGAN merespons otomatis saat siswa bicara. Tunggu petunjuk controller Python.\n"
            "- Ikuti petunjuk controller Python persis — ucapkan HANYA kalimat yang diberikan, "
            "kata per kata, lalu berhenti. Jangan buat dialog atau instruksi baru. Kamu sedang "
            "MEMBACA SKRIP, bukan mengobrol bebas.\n"
            "- DILARANG mengajarkan kata di luar komik (misalnya 'tombol' sebagai kosakata baru).\n"
            "- Kalimat GURU harus persis dari naskah komik. Ini percakapan guru-siswa BIASA, "
            "bukan sesi mengajar/menjelaskan.\n"
            "- SATU-SATUNYA pengecualian: ketika controller eksplisit meminta feedback karena "
            "jawaban siswa SALAH. Di luar itu, JANGAN PERNAH menjelaskan, menerjemahkan, atau "
            "menambah penjelasan/instruksi apapun — walau cuma satu kalimat. JANGAN PERNAH "
            "mengucapkan kata 'artinya' atau 'maksudnya' — kamu tidak pernah bertugas menjelaskan "
            "arti kalimat apapun di sesi ini.\n"
            "- JANGAN SAMA SEKALI menggunakan Bahasa Inggris, dalam bentuk apapun.\n"
            f"{roleplay_note}"
            "- Lalu BERHENTI dan tunggu siswa.\n"
        )

    return (
        "COMIC DIALOGUE MODE (CRITICAL):\n"
        f"- Scope: {comic_scope}\n"
        f"- Allowed phrases only: {allowed}.\n"
        "- Follow Python controller hints exactly. Do not invent dialogue or extra instructions. "
        "You are reading a script, not chatting freely.\n"
        "- GURU lines must match the comic script word-for-word. This is an ordinary "
        "teacher-student conversation, not a teaching/explaining session.\n"
        "- The ONLY exception: brief feedback when the controller explicitly asks for it because "
        "the student answered WRONG. Otherwise, NEVER explain, translate, or add any commentary "
        "— not even one sentence. Never say \"that means\" — explaining meaning is never your "
        "job in this session.\n"
        f"{roleplay_note}"
        "- Then STOP and wait for the student.\n"
    )


def build_class_management_system_prompt(
    base_prompt: str,
    language_code: str,
    instruction_languages: list[str],
    comic_scope: str,
    allowed_phrases: list[str],
    practice_mode: str = "teach",
) -> str:
    rules = _comic_session_rules(
        language_code,
        instruction_languages,
        comic_scope,
        allowed_phrases,
        practice_mode,
    )
    return f"{rules}\n\n{base_prompt}"


@dataclass
class ClassManagementController:
    agent: Any
    turns: list[dict[str, Any]]
    intro_message: str
    topic_title: str
    comic_scope: str
    allowed_phrases: list[str]
    instruction_languages: list[str]
    language_code: str
    practice_mode: str = "teach"
    direct_tts: Any = None
    turn_index: int = 0
    attempts: int = 0
    phase: str = "idle"
    waiting_for_student: bool = False
    processing: bool = False
    started: bool = False
    _tasks: list[asyncio.Task] = field(default_factory=list)
    _response_lock: asyncio.Lock = field(default_factory=asyncio.Lock)
    _feedback_prefetch: dict[str, asyncio.Task] = field(default_factory=dict)

    def _cancel_prefetch(self, prefetch: dict[str, asyncio.Task], *keys: str) -> None:
        for key in keys:
            task = prefetch.get(key)
            if task is not None and not task.done():
                task.cancel()

    async def _speak(self, hint: str) -> None:
        async with self._response_lock:
            try:
                await self.agent.simple_response(hint)
            except Exception as exc:
                # A silent failure here means on_agent_speech_final() never
                # fires for this turn, which freezes the whole state machine
                # (panel image stops advancing) with no visible error to the
                # student — so this print is the only signal. Check server
                # logs if the panel ever stops changing between turns.
                print(f"[class-mgmt] simple_response ERROR (turn will stall): {exc}")

    async def _synthesize(self, text: str) -> Any:
        """Fetch PCM audio for `text` WITHOUT playing it yet.

        Split out from _speak_direct so a phase method can kick this off in
        the background (asyncio.create_task) for whatever it already knows
        comes NEXT, right before playing the CURRENT line — overlapping the
        next line's network round trip with the current line's playback
        time instead of paying for it afterward as a silent gap. Returns
        None if there's nothing to say or synthesis failed.
        """
        if self.direct_tts is None or not text.strip():
            return None
        t_start = time.monotonic()
        print(f"[class-mgmt] t={t_start:.2f} SYNTH START {text[:40]!r}")
        try:
            pcm = await self.direct_tts.stream_audio(text)
            t_end = time.monotonic()
            print(
                f"[class-mgmt] t={t_end:.2f} SYNTH DONE  {text[:40]!r} "
                f"took={t_end - t_start:.2f}s"
            )
            return pcm
        except Exception as exc:
            print(f"[class-mgmt] TTS prefetch ERROR for {text!r}: {exc}")
            return None

    async def _play_pcm(self, pcm: Any) -> None:
        t_start = time.monotonic()
        print(f"[class-mgmt] t={t_start:.2f} PLAY START duration={pcm.duration:.2f}s")
        async with self._response_lock:
            self.agent._audio_output_stream.send_nowait(
                AudioOutputChunk(data=pcm, final=True)
            )
            await asyncio.sleep(pcm.duration)
        print(f"[class-mgmt] t={time.monotonic():.2f} PLAY END")

    async def _speak_direct(self, text: str, prefetched: Any = None) -> bool:
        """Synthesize this exact text via a standalone TTS call and push it
        straight onto the shared output track — skips the Realtime LLM
        entirely.

        Every phase in this controller is fixed script text (intro greeting,
        comic lines, translation glosses, turn prompts, praise/retry
        templates, closing line) — nothing here needs the model to compose
        or recite anything from memory. Routing it through the LLM proved
        unreliable in practice (it would sometimes skip the gloss, echo the
        wrong line, answer its own instruction instead of reading it, or
        return an empty response) on top of adding a full model round trip
        per turn. This calls OpenAI's TTS endpoint directly and writes the
        resulting PCM onto agent._audio_output_stream, the same sink the
        Realtime LLM's own audio is chunked through — so it plays on the
        exact same output track.

        Pass `prefetched` (a PCM already obtained from _synthesize, e.g. via
        a background task started earlier) to skip synthesis and play
        immediately — this is what actually removes the gap between turns.

        Returns True once the audio has actually finished playing — the
        caller should immediately proceed to the next step.

        Returns False only if TTS synthesis itself failed (rare — e.g. an
        API error), in which case this falls back to the old LLM path via
        `_speak()`. The caller must NOT advance immediately in that case:
        the state machine resumes later through on_agent_speech_final()
        once that fallback response actually finishes speaking.
        """
        if not text.strip():
            return True

        if self.direct_tts is None:
            await self._speak(f'Ucapkan PERSIS kalimat berikut, tanpa tambahan apapun: "{text}"')
            return False

        pcm = prefetched if prefetched is not None else await self._synthesize(text)
        if pcm is None:
            await self._speak(f'Ucapkan PERSIS kalimat berikut, tanpa tambahan apapun: "{text}"')
            return False

        await self._play_pcm(pcm)
        return True

    async def send_phase(
        self,
        phase: str,
        turn_index: int = 0,
        extra: Optional[dict[str, Any]] = None,
    ) -> None:
        payload: dict[str, Any] = {
            "type": "class_mgmt_phase",
            "phase": phase,
            "turnIndex": turn_index,
        }
        if extra:
            payload.update(extra)
        print(f"[class-mgmt] send_phase -> {payload}")
        try:
            await self.agent.send_custom_event(payload)
        except Exception as exc:
            print(f"[class-mgmt] phase event error: {exc}")

    async def send_result(self, correct: bool) -> None:
        payload: dict[str, Any] = {
            "type": "class_mgmt_phase",
            "phase": "feedback",
            "turnIndex": self.turn_index,
            "correct": correct,
            "attempts": self.attempts,
        }
        try:
            await self.agent.send_custom_event(payload)
        except Exception as exc:
            print(f"[class-mgmt] feedback event error: {exc}")

    def _roleplay_intro_text(self) -> str:
        """Spoken ONCE at the start of a Role Play session — frames the
        rules once so later turns don't need to repeat them."""
        if uses_zh_tw_teacher(self.instruction_languages, self.language_code):
            return "這是角色扮演練習。我會唸出老師的台詞，請你照漫畫回答學生台詞。準備好了嗎？"
        if uses_indonesian_teacher(self.instruction_languages, self.language_code):
            return "Ini sesi Role Play. Saya akan ucapkan kalimat guru, kamu jawab sesuai kalimat siswa di komik. Siap?"
        return "This is a Role Play session. I will say the teacher's lines — answer with the student's line from the comic. Ready?"

    def _roleplay_turn_prompt_text(self) -> str:
        """Short per-turn cue for Role Play — no revealing the student line
        (it's already shown on the comic panel) and no repeated framing."""
        if uses_zh_tw_teacher(self.instruction_languages, self.language_code):
            return "輪到你了。"
        if uses_indonesian_teacher(self.instruction_languages, self.language_code):
            return "Giliranmu."
        return "Your turn."

    def _student_turn_prompt_text(self, student_line: str) -> str:
        """The literal sentence spoken to hand the turn to the student."""
        if uses_zh_tw_teacher(self.instruction_languages, self.language_code):
            return f"輪到你了。請照漫畫回答學生台詞：{student_line}。"
        if uses_indonesian_teacher(self.instruction_languages, self.language_code):
            return f"Sekarang giliranmu sebagai siswa. Jawab: {student_line}"
        return f"Your turn as the student. Answer: {student_line}"

    def _praise_text(self) -> str:
        if uses_zh_tw_teacher(self.instruction_languages, self.language_code):
            return "答對了！"
        if uses_indonesian_teacher(self.instruction_languages, self.language_code):
            return "Bagus, jawaban siswa sudah benar."
        return "Good, that matches the student line in the comic."

    def _retry_text(self, student_line: str, repeated_guru: bool = False) -> str:
        if repeated_guru:
            if uses_zh_tw_teacher(self.instruction_languages, self.language_code):
                return f"你剛才重複了老師的話。請扮演學生，說：{student_line}"
            if uses_indonesian_teacher(self.instruction_languages, self.language_code):
                return f"Kamu tadi mengulang kalimat guru. Sekarang jawab sebagai siswa: {student_line}"
            return f"You repeated the teacher. Answer as the student: {student_line}"

        if uses_zh_tw_teacher(self.instruction_languages, self.language_code):
            return f"請照漫畫回答學生台詞：{student_line}"
        if uses_indonesian_teacher(self.instruction_languages, self.language_code):
            return f"Coba lagi. Jawab sebagai siswa di komik: {student_line}"
        return f"Try again. Answer as the student in the comic: {student_line}"

    def _model_answer_text(self, student_line: str) -> str:
        if uses_zh_tw_teacher(self.instruction_languages, self.language_code):
            return f"正確答案是：{student_line}。沒關係，我們繼續下一段。"
        if uses_indonesian_teacher(self.instruction_languages, self.language_code):
            return f"Jawaban siswa di komik: {student_line}. Tidak apa-apa, kita lanjut bagian berikutnya."
        return f"The student line is: {student_line}. That is okay, let us continue."

    def _closing_text(self) -> str:
        if uses_zh_tw_teacher(self.instruction_languages, self.language_code):
            return f"漫畫「{self.topic_title}」的對話練習完成了，你做得很好！"
        if uses_indonesian_teacher(self.instruction_languages, self.language_code):
            return f"Latihan percakapan komik {self.topic_title} sudah selesai. Kamu hebat!"
        return f"You have completed the comic dialogue practice for {self.topic_title}. Great job!"

    def _guru_speech_text(self, turn: dict[str, Any]) -> str:
        """The literal text spoken for a turn's guru phase — the comic line,
        plus (in "teach" mode, zh-TW sessions only) its gloss, combined into
        one string so it's ONE TTS call instead of two. See start_guru_turn.
        """
        guru_line = str(turn.get("guruLine") or "").strip()
        guru_line_zh = str(turn.get("guruLineZh") or "").strip()
        explain = (
            self.practice_mode == "teach"
            and bool(guru_line_zh)
            and uses_zh_tw_teacher(self.instruction_languages, self.language_code)
        )
        return f"{guru_line} {guru_line_zh}" if explain else guru_line

    def _turn_prompt_text(self, student_line: str) -> str:
        """The text spoken to hand the turn to the student — the short
        no-spoilers cue in Role Play, or the full "your turn, answer: X"
        guidance in Latihan (Teach) mode."""
        if self.practice_mode == "roleplay":
            return self._roleplay_turn_prompt_text()
        return self._student_turn_prompt_text(student_line)

    async def start(self) -> None:
        if self.started:
            return
        self.started = True
        self.phase = "intro"
        await self.send_phase("intro", 0)

        intro_text = (
            self._roleplay_intro_text()
            if self.practice_mode == "roleplay"
            else self.intro_message
        )

        # Prefetch the first guru line's audio while the intro greeting
        # plays, so there's no synthesis gap between them.
        next_task = (
            asyncio.create_task(self._synthesize(self._guru_speech_text(self.turns[0])))
            if self.turns
            else None
        )

        if await self._speak_direct(intro_text):
            await self.start_guru_turn(prefetched=await next_task if next_task else None)
        elif next_task:
            next_task.cancel()
        # else: LLM fallback in flight — on_agent_speech_final() takes over.

    async def start_guru_turn(self, prefetched: Any = None) -> None:
        if self.turn_index >= len(self.turns):
            await self.complete()
            return

        turn = self.turns[self.turn_index]
        panel_index = int(turn.get("guruPanelIndex") or self.turn_index * 2)

        self.phase = "guru_speaking"
        self.attempts = 0
        self.waiting_for_student = False
        await self.send_phase("guru_speaking", self.turn_index, {"panelIndex": panel_index})

        # Prefetch the student-turn prompt while the guru line plays.
        student_line = str(turn.get("studentLine") or "").strip()
        prompt_task = asyncio.create_task(self._synthesize(self._turn_prompt_text(student_line)))

        guru_speech = self._guru_speech_text(turn)
        if not await self._speak_direct(guru_speech, prefetched=prefetched):
            prompt_task.cancel()
            return  # LLM fallback in flight — on_agent_speech_final() takes over.

        await self.after_guru_spoke(prefetched=await prompt_task)

    async def after_guru_spoke(self, prefetched: Any = None) -> None:
        if self.phase != "guru_speaking":
            return
        turn = self.turns[self.turn_index]
        student_line = str(turn.get("studentLine") or "").strip()
        panel_index = int(turn.get("studentPanelIndex") or self.turn_index * 2 + 1)
        self.phase = "student_turn"

        if self.practice_mode != "roleplay":
            # Prefetch every possible feedback outcome now, while the prompt
            # plays and the student is still answering — we already know
            # the exact text for each outcome, we just don't know which one
            # applies until the student actually speaks. This is the one
            # gap that couldn't be prefetched any earlier than this. Role
            # Play never evaluates or gives feedback, so there's nothing to
            # prefetch there. (Kicking this off doesn't touch the shared
            # audio output, so it's safe to start before we've even spoken
            # the turn prompt below.)
            self._feedback_prefetch = {
                "praise": asyncio.create_task(self._synthesize(self._praise_text())),
                "retry": asyncio.create_task(self._synthesize(self._retry_text(student_line))),
                "model_answer": asyncio.create_task(
                    self._synthesize(self._model_answer_text(student_line))
                ),
            }

        # Speak the turn prompt BEFORE telling the client the mic is open.
        # The client enables the mic purely on receiving the "student_turn"
        # phase event, independent of audio — sending that event first let
        # a quick student start answering while Sari was still saying
        # "Giliranmu." (very short in Role Play), overlapping their voice
        # with hers. Speaking first, then opening the mic, removes that race.
        await self._speak_direct(self._turn_prompt_text(student_line), prefetched=prefetched)

        self.waiting_for_student = True
        await self.send_phase(
            "student_turn",
            self.turn_index,
            {"panelIndex": panel_index},
        )

    async def on_student_speech(self, text: str) -> None:
        if not self.waiting_for_student or self.processing or self.phase != "student_turn":
            return

        final_text = text.strip()
        if not final_text:
            return

        self.processing = True

        if self.practice_mode == "roleplay":
            # Pure back-and-forth: no correctness check, no feedback speech —
            # any spoken response advances straight to the next comic turn.
            try:
                self.turn_index += 1
                self.waiting_for_student = False
                self.phase = "between_turns"
                await self.start_guru_turn()
            finally:
                self.processing = False
            return

        prefetch = self._feedback_prefetch
        self._feedback_prefetch = {}

        turn = self.turns[self.turn_index]
        expected = [str(item) for item in (turn.get("expectedAnswers") or [])]
        student_line = str(turn.get("studentLine") or "").strip()
        guru_line = str(turn.get("guruLine") or "").strip()
        correct, repeated_guru = evaluate_student_response(
            final_text,
            expected,
            guru_line,
        )

        try:
            if correct:
                self._cancel_prefetch(prefetch, "retry", "model_answer")
                await self.send_result(True)
                self.turn_index += 1
                self.waiting_for_student = False
                self.phase = "between_turns"
                next_task = self._prefetch_next_guru_speech()
                praise_pcm = await prefetch["praise"] if "praise" in prefetch else None
                if await self._speak_direct(self._praise_text(), prefetched=praise_pcm):
                    await self.after_feedback_spoke(
                        prefetched=await next_task if next_task else None
                    )
                elif next_task:
                    next_task.cancel()
            else:
                self.attempts += 1
                # send_result(False) is what lets the client's mic open again
                # (studentCanSpeak treats phase="feedback"+correct=false the
                # same as student_turn) — sending it before the retry/model
                # answer audio finishes let a quick student start talking
                # over the tail of that audio, same overlap bug as the
                # student_turn prompt above. Speak first, THEN send it.
                if self.attempts >= MAX_ATTEMPTS:
                    self._cancel_prefetch(prefetch, "praise", "retry")
                    self.turn_index += 1
                    self.waiting_for_student = False
                    self.phase = "between_turns"
                    next_task = self._prefetch_next_guru_speech()
                    model_answer_pcm = (
                        await prefetch["model_answer"] if "model_answer" in prefetch else None
                    )
                    spoke_ok = await self._speak_direct(
                        self._model_answer_text(student_line), prefetched=model_answer_pcm
                    )
                    await self.send_result(False)
                    if spoke_ok:
                        await self.after_feedback_spoke(
                            prefetched=await next_task if next_task else None
                        )
                    elif next_task:
                        next_task.cancel()
                else:
                    self._cancel_prefetch(prefetch, "praise", "model_answer")
                    # Stay in student_turn — waiting_for_student is unchanged,
                    # so the next speech event retries this same turn.
                    if repeated_guru:
                        # Different wording than the prefetched "retry" text
                        # (the "you repeated the teacher" variant) — can't
                        # reuse it, so synthesize this one fresh.
                        self._cancel_prefetch(prefetch, "retry")
                        await self._speak_direct(
                            self._retry_text(student_line, repeated_guru=True)
                        )
                    else:
                        retry_pcm = await prefetch["retry"] if "retry" in prefetch else None
                        await self._speak_direct(
                            self._retry_text(student_line), prefetched=retry_pcm
                        )
                    await self.send_result(False)
                    # One retry chance left before MAX_ATTEMPTS — prefetch
                    # this second attempt's outcomes too (no further retry
                    # is possible after this one, so no need for that key).
                    self._feedback_prefetch = {
                        "praise": asyncio.create_task(self._synthesize(self._praise_text())),
                        "model_answer": asyncio.create_task(
                            self._synthesize(self._model_answer_text(student_line))
                        ),
                    }
        finally:
            self.processing = False

    def _prefetch_next_guru_speech(self) -> Optional[asyncio.Task]:
        """Kick off synthesis for the NEXT turn's guru line while the current
        feedback (praise/model-answer) is still playing — called only after
        self.turn_index has already been advanced to that next turn."""
        if self.turn_index >= len(self.turns):
            return None
        return asyncio.create_task(
            self._synthesize(self._guru_speech_text(self.turns[self.turn_index]))
        )

    async def after_feedback_spoke(self, prefetched: Any = None) -> None:
        if self.phase != "between_turns":
            return
        if self.turn_index >= len(self.turns):
            await self.complete()
            return
        await self.start_guru_turn(prefetched=prefetched)

    async def complete(self) -> None:
        self.phase = "complete"
        self.waiting_for_student = False
        await self.send_phase("complete", self.turn_index)
        await self._speak_direct(self._closing_text())

    async def _resend_student_turn(self) -> None:
        if self.phase != "student_turn" or not self.waiting_for_student:
            return
        turn = self.turns[self.turn_index]
        panel_index = int(turn.get("studentPanelIndex") or self.turn_index * 2 + 1)
        await self.send_phase(
            "student_turn",
            self.turn_index,
            {"panelIndex": panel_index},
        )

    def on_agent_speech_final(self) -> None:
        print(
            f"[class-mgmt] on_agent_speech_final: phase={self.phase!r} "
            f"turn_index={self.turn_index} waiting_for_student={self.waiting_for_student}"
        )
        if self.phase == "intro":
            self._tasks.append(asyncio.create_task(self.start_guru_turn()))
        elif self.phase == "guru_speaking":
            self._tasks.append(asyncio.create_task(self.after_guru_spoke()))
        elif self.phase == "between_turns":
            self._tasks.append(asyncio.create_task(self.after_feedback_spoke()))
        elif self.phase == "student_turn" and self.waiting_for_student:
            self._tasks.append(asyncio.create_task(self._resend_student_turn()))
        else:
            print(
                f"[class-mgmt] WARNING: no handler for phase={self.phase!r} — "
                "state machine will stall here until the next student speech event."
            )
