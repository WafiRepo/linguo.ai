"""Turn-based class management dialogue sessions — comic script only."""

from __future__ import annotations

import asyncio
import json
from dataclasses import dataclass, field
from typing import Any, Optional

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
    turn_index: int = 0
    attempts: int = 0
    phase: str = "idle"
    waiting_for_student: bool = False
    processing: bool = False
    started: bool = False
    _tasks: list[asyncio.Task] = field(default_factory=list)
    _response_lock: asyncio.Lock = field(default_factory=asyncio.Lock)

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

    def _intro_hint(self) -> str:
        """Just the opening greeting — no explanation of scope/rules out loud.

        Rules and scope are already enforced via the system prompt for the
        model itself to follow; narrating them to the student turns this
        into a lecture instead of an ordinary conversation.
        """
        if uses_zh_tw_teacher(self.instruction_languages, self.language_code):
            return (
                f"你現在是在唸稿，不是自由聊天。只說這句問候，一字不改：「{self.intro_message}」"
                "說完立刻完全停止。不要加「意思是」、不要解釋、不要翻譯、不要補充任何一句話——"
                "這裡不需要你做任何說明。"
            )
        if uses_indonesian_teacher(self.instruction_languages, self.language_code):
            return (
                f'Kamu sedang MEMBACA SKRIP, bukan mengobrol bebas. Ucapkan HANYA kalimat ini, '
                f'kata demi kata, tanpa berubah: "{self.intro_message}" '
                "BERHENTI TOTAL begitu kalimat itu selesai. JANGAN tambahkan kata 'artinya', "
                "'maksudnya', atau penjelasan apapun setelah itu — di sini kamu tidak perlu "
                "menjelaskan apa-apa."
            )
        return (
            f"You are READING A SCRIPT here, not chatting freely. Say ONLY this exact sentence, "
            f'word for word: "{self.intro_message}" STOP completely the instant it ends. '
            "Do not add \"that means\", do not explain, do not translate, do not add any other "
            "sentence — there is nothing to explain here."
        )

    def _guru_line_hint(self, guru_line: str, part_number: int) -> str:
        """Say ONLY the teacher's comic line — nothing else in the same turn.

        Kept separate from _student_turn_prompt_hint below: asking the model
        to say two different quoted sentences back-to-back in one instruction
        risked it blending or repeating the wrong one (e.g. echoing the guru
        line again instead of prompting the student line).
        """
        if uses_zh_tw_teacher(self.instruction_languages, self.language_code):
            return (
                f"漫畫第 {part_number} 段。你是在唸稿，不是自由聊天。只用印尼語逐字說出老師台詞："
                f"「{guru_line}」。說完立刻完全停止。不要翻譯、不要加「意思是」、不要解釋、"
                "不要加任何其他句子。絕對不要使用英文。"
            )
        if uses_indonesian_teacher(self.instruction_languages, self.language_code):
            return (
                f"Bagian {part_number} komik. Kamu sedang MEMBACA SKRIP, bukan mengobrol bebas. "
                f'Ucapkan HANYA kalimat GURU ini, kata demi kata: "{guru_line}" '
                "BERHENTI TOTAL begitu selesai. JANGAN menerjemahkan, JANGAN bilang 'artinya' "
                "atau 'maksudnya', JANGAN menjelaskan, JANGAN menambah kalimat apapun setelah "
                "itu. JANGAN SAMA SEKALI menggunakan Bahasa Inggris."
            )
        return (
            f'Comic part {part_number}. You are READING A SCRIPT, not chatting freely. Say '
            f'ONLY the teacher line, word for word: "{guru_line}" STOP completely the instant '
            'it ends. Do not translate, do not say "that means", do not explain, do not add '
            "any other sentence."
        )

    def _student_turn_prompt_hint(self, student_line: str) -> str:
        """Prompt the student's turn — issued only after the guru line finishes
        speaking (see after_guru_spoke), never in the same turn as the guru line."""
        if uses_zh_tw_teacher(self.instruction_languages, self.language_code):
            return (
                f"你是在唸稿，不是自由聊天。用繁體中文只說這句話：「輪到你了。請照漫畫回答學生台詞："
                f"{student_line}。不要重複老師台詞。」說完立刻完全停止。不要翻譯、不要加「意思是」、"
                "不要加其他句子。絕對不要使用英文。"
            )
        if uses_indonesian_teacher(self.instruction_languages, self.language_code):
            return (
                f'Kamu sedang MEMBACA SKRIP, bukan mengobrol bebas. Ucapkan PERSIS kalimat ini '
                f'kepada siswa, tanpa ubah satu kata pun: "Sekarang giliranmu sebagai siswa. '
                f'Jawab: {student_line} Jangan ulangi kalimat guru." BERHENTI TOTAL begitu '
                "selesai. JANGAN bilang 'artinya' atau 'maksudnya', JANGAN menjelaskan, JANGAN "
                "menambah kalimat apapun setelah itu. JANGAN SAMA SEKALI menggunakan Bahasa Inggris."
            )
        return (
            f'You are READING A SCRIPT, not chatting freely. Say EXACTLY: "Your turn as the '
            f'student. Answer: {student_line} Do not repeat the teacher line." STOP completely '
            'the instant it ends — do not say "that means", do not explain, do not add any '
            "other sentence."
        )

    def _praise_hint(self) -> str:
        if uses_zh_tw_teacher(self.instruction_languages, self.language_code):
            return '只說這一句繁體中文，不要加其他話：「答對了！」'
        if uses_indonesian_teacher(self.instruction_languages, self.language_code):
            return 'Ucapkan HANYA kalimat ini, persis, tanpa tambahan: "Bagus, jawaban siswa sudah benar."'
        return 'Say ONLY: "Good, that matches the student line in the comic."'

    def _retry_hint(self, student_line: str, repeated_guru: bool = False) -> str:
        if repeated_guru:
            if uses_zh_tw_teacher(self.instruction_languages, self.language_code):
                return (
                    f'只說這一句繁體中文，不要改字：「你剛才重複了老師的話。'
                    f'請扮演學生，說：{student_line}」'
                )
            if uses_indonesian_teacher(self.instruction_languages, self.language_code):
                return (
                    "Ucapkan HANYA kalimat ini kepada siswa, persis, tanpa ubah kata: "
                    f'"Kamu tadi mengulang kalimat guru. Sekarang jawab sebagai siswa: {student_line}"'
                )
            return (
                f'Say ONLY: "You repeated the teacher. Answer as the student: {student_line}"'
            )

        if uses_zh_tw_teacher(self.instruction_languages, self.language_code):
            return (
                f'只說這一句繁體中文，不要改字：「請照漫畫回答學生台詞：{student_line}」'
            )
        if uses_indonesian_teacher(self.instruction_languages, self.language_code):
            return (
                "Ucapkan HANYA kalimat ini kepada siswa, persis, tanpa ubah kata: "
                f'"Coba lagi. Jawab sebagai siswa di komik: {student_line}"'
            )
        return f'Say ONLY: "Try again. Answer as the student in the comic: {student_line}"'

    def _model_answer_hint(self, student_line: str) -> str:
        if uses_zh_tw_teacher(self.instruction_languages, self.language_code):
            return (
                f'只說這兩句繁體中文：「正確答案是：{student_line}」'
                "「沒關係，我們繼續下一段。」"
            )
        if uses_indonesian_teacher(self.instruction_languages, self.language_code):
            return (
                "Ucapkan HANYA ini, persis: "
                f'"Jawaban siswa di komik: {student_line}. '
                'Tidak apa-apa, kita lanjut bagian berikutnya."'
            )
        return (
            f'Say ONLY: "The student line is: {student_line}. '
            'That is okay, let us continue."'
        )

    def _closing_hint(self) -> str:
        if uses_zh_tw_teacher(self.instruction_languages, self.language_code):
            return (
                f"漫畫「{self.topic_title}」的三段對話完成了。用繁體中文稱讚，"
                "提醒學生剛才練的就是圖片中的對話。"
            )
        if uses_indonesian_teacher(self.instruction_languages, self.language_code):
            return (
                f"Tiga dialog komik {self.topic_title} selesai. Puji siswa dalam Bahasa Indonesia — "
                "mereka sudah mengikuti percakapan di gambar tadi."
            )
        return (
            f"All three comic dialogues for {self.topic_title} are done. "
            "Praise the student in English for following the image."
        )

    async def start(self) -> None:
        if self.started:
            return
        self.started = True
        self.phase = "intro"
        await self.send_phase("intro", 0)
        await self._speak(self._intro_hint())

    async def start_guru_turn(self) -> None:
        if self.turn_index >= len(self.turns):
            await self.complete()
            return

        turn = self.turns[self.turn_index]
        guru_line = str(turn.get("guruLine") or "").strip()
        panel_index = int(turn.get("guruPanelIndex") or self.turn_index * 2)
        part_number = self.turn_index + 1

        self.phase = "guru_speaking"
        self.attempts = 0
        self.waiting_for_student = False
        await self.send_phase("guru_speaking", self.turn_index, {"panelIndex": panel_index})

        await self._speak(self._guru_line_hint(guru_line, part_number))

    async def after_guru_spoke(self) -> None:
        if self.phase != "guru_speaking":
            return
        turn = self.turns[self.turn_index]
        student_line = str(turn.get("studentLine") or "").strip()
        panel_index = int(turn.get("studentPanelIndex") or self.turn_index * 2 + 1)
        self.phase = "student_turn"
        self.waiting_for_student = True
        await self.send_phase(
            "student_turn",
            self.turn_index,
            {"panelIndex": panel_index},
        )
        await self._speak(self._student_turn_prompt_hint(student_line))

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
                await self.send_result(True)
                await self._speak(self._praise_hint())
                self.turn_index += 1
                self.waiting_for_student = False
                self.phase = "between_turns"
            else:
                self.attempts += 1
                await self.send_result(False)
                if self.attempts >= MAX_ATTEMPTS:
                    await self._speak(self._model_answer_hint(student_line))
                    self.turn_index += 1
                    self.waiting_for_student = False
                    self.phase = "between_turns"
                else:
                    await self._speak(
                        self._retry_hint(student_line, repeated_guru=repeated_guru)
                    )
        finally:
            self.processing = False

    async def after_feedback_spoke(self) -> None:
        if self.phase != "between_turns":
            return
        if self.turn_index >= len(self.turns):
            await self.complete()
            return
        await self.start_guru_turn()

    async def complete(self) -> None:
        self.phase = "complete"
        self.waiting_for_student = False
        await self.send_phase("complete", self.turn_index)
        await self._speak(self._closing_hint())

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
