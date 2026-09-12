import { ClassManagementTopic } from "@/types/classManagement";
import {
  appendEmotionToPrompt,
  DEFAULT_TUTOR_EMOTION,
  TutorEmotionCode,
} from "@/lib/tutorEmotion";
import {
  getInstructionLanguages,
  InstructionLanguageCode,
  TutorVoiceCode,
} from "@/lib/instructionLanguage";

export type ClassPracticeMode = "teach" | "roleplay";

export interface ResolvedClassManagementPrompt {
  instructionLanguages: InstructionLanguageCode[];
  systemPrompt: string;
  introMessage: string;
  classTurnsJson: string;
  comicScope: string;
  allowedPhrasesJson: string;
}

function collectAllowedPhrases(topic: ClassManagementTopic): string[] {
  const phrases = new Set<string>();
  for (const turn of topic.turns) {
    phrases.add(turn.guruLine.id);
    phrases.add(turn.guruLine.zhTW);
    phrases.add(turn.studentLine.id);
    for (const answer of turn.expectedAnswers) {
      phrases.add(answer);
    }
  }
  return [...phrases];
}

function buildComicTurnScript(topic: ClassManagementTopic, tutorVoice: TutorVoiceCode): string {
  return topic.turns
    .map((turn, index) => {
      const n = index + 1;
      if (tutorVoice === "id") {
        return (
          `BAGIAN ${n} — Guru (teks komik): "${turn.guruLine.id}"\n` +
          `BAGIAN ${n} — Siswa (teks komik): "${turn.studentLine.id}"`
        );
      }
      if (tutorVoice === "zh-TW") {
        return (
          `第 ${n} 段 — 老師（漫畫原文）："${turn.guruLine.id}"\n` +
          `第 ${n} 段 — 學生（漫畫原文）："${turn.studentLine.id}"`
        );
      }
      return (
        `PART ${n} — Teacher (comic text): "${turn.guruLine.id}"\n` +
        `PART ${n} — Student (comic text): "${turn.studentLine.id}"`
      );
    })
    .join("\n");
}

function buildClassManagementSystemPrompt(
  topic: ClassManagementTopic,
  tutorVoice: TutorVoiceCode,
  mode: ClassPracticeMode,
): string {
  const turnScript = buildComicTurnScript(topic, tutorVoice);
  const allowedList = collectAllowedPhrases(topic).map((p) => `"${p}"`).join(", ");

  const roleplayNoteId =
    mode === "roleplay"
      ? "- Mode Role Play: JANGAN menilai benar/salah, JANGAN memuji atau meminta coba lagi, " +
        "JANGAN beri feedback apapun. Begitu siswa selesai bicara, langsung lanjut ke kalimat guru berikutnya.\n"
      : "";
  const roleplayNoteZh =
    mode === "roleplay"
      ? "- 角色扮演模式：不要評分、不要稱讚或要求再試一次、不要給任何回饋。學生說完後直接接下一段老師台詞。\n"
      : "";
  const roleplayNoteEn =
    mode === "roleplay"
      ? "- Role Play mode: do NOT judge correctness, do NOT praise or ask to retry, do NOT give " +
        "any feedback. As soon as the student finishes speaking, move straight to the next teacher line.\n"
      : "";

  const comicOnlyRulesId =
    "ATURAN KOMIK SAJA (WAJIB):\n" +
    "- Kamu HANYA memandu percakapan yang ada di gambar komik topik ini. Bukan topik lain.\n" +
    "- Jangan ajarkan kosakata baru, jangan tambah instruksi guru lain, jangan keluar dari gambar.\n" +
    "- Kalimat guru yang boleh diucapkan HANYA dari daftar GURU di bawah — kata per kata.\n" +
    "- Siswa hanya perlu menjawab kalimat SISWA dari komik — jangan minta jawaban lain.\n" +
    "- Ini percakapan guru-siswa BIASA, bukan sesi mengajar/menjelaskan. Kamu sedang MEMBACA " +
    "SKRIP, bukan mengobrol bebas. Ucapkan HANYA kalimat yang diberikan controller Python, " +
    "lalu berhenti.\n" +
    "- SATU-SATUNYA pengecualian: ketika controller eksplisit meminta feedback karena jawaban " +
    "siswa SALAH. Di luar itu, JANGAN PERNAH menjelaskan, menerjemahkan, atau menambah " +
    "penjelasan/instruksi apapun — walau cuma satu kalimat. JANGAN PERNAH mengucapkan kata " +
    "'artinya' atau 'maksudnya' — kamu tidak pernah bertugas menjelaskan arti kalimat apapun.\n" +
    "- JANGAN SAMA SEKALI menggunakan Bahasa Inggris, dalam bentuk apapun.\n" +
    `- DAFTAR FRASA KOMIK (jangan keluar dari ini): ${allowedList}.\n` +
    "- Urutan wajib: sapaan singkat → Bagian 1 → Bagian 2 → Bagian 3 → selesai.\n";

  const comicOnlyRulesZh =
    "漫畫限定規則（必守）：\n" +
    "- 你只能引導這張漫畫圖片中的對話，不得講其他課堂主題。\n" +
    "- 不可新增詞彙或其他老師指令。老師台詞必須逐字來自下方 GURU 列表。\n" +
    "- 學生只需回答漫畫中的學生台詞。\n" +
    "- 這是普通的師生對話，不是教學講解。你是在唸稿，不是自由聊天。只說控制器提供的句子，" +
    "說完立刻停止。\n" +
    "- 唯一的例外：controller 明確要求時，針對學生答錯給簡短回饋。除此之外，絕對不要解釋、" +
    "翻譯、或補充任何說明——連一句都不行。不要加「意思是」「也就是說」這類詞。\n" +
    "- 絕對不要使用英文，任何形式都不行。\n" +
    `- 漫畫允許詞句：${allowedList}。\n` +
    "- 順序：簡短問候 → 第1段 → 第2段 → 第3段 → 結束。\n";

  const comicOnlyRulesEn =
    "COMIC-ONLY RULES (CRITICAL):\n" +
    "- Guide ONLY the dialogue shown in this topic's comic image. Nothing else.\n" +
    "- Do not teach extra vocabulary or other classroom commands.\n" +
    "- Teacher lines must match the GURU script below word-for-word.\n" +
    "- Student must answer only the comic STUDENT lines.\n" +
    "- This is an ordinary teacher-student conversation, not a teaching/explaining session. " +
    "You are reading a script, not chatting freely. Say ONLY the line given by the Python " +
    "controller, then stop.\n" +
    "- The ONLY exception: brief feedback when the controller explicitly asks for it because the " +
    "student answered WRONG. Otherwise, NEVER explain, translate, or add commentary — not even " +
    "one sentence. Never say \"that means\" — explaining meaning is never your job here.\n" +
    `- ALLOWED comic phrases: ${allowedList}.\n` +
    "- Order: brief greeting → Part 1 → Part 2 → Part 3 → done.\n";

  if (tutorVoice === "zh-TW") {
    return (
      "你是莎莉（Sari），引導學生重現漫畫中的課堂對話。\n" +
      `${comicOnlyRulesZh}\n` +
      roleplayNoteZh +
      `漫畫主題：${topic.subtitle}。\n` +
      `範圍：${topic.comicScope}\n` +
      "流程：先用印尼語說老師台詞 → 用繁體中文說「輪到你了，按住麥克風回答」→ 停止等待。\n" +
      `漫畫腳本：\n${turnScript}`
    );
  }

  if (tutorVoice === "id") {
    return (
      "Kamu adalah Sari. Tugasmu memandu siswa mengikuti percakapan di gambar komik — tidak lebih.\n" +
      `${comicOnlyRulesId}\n` +
      roleplayNoteId +
      `Topik komik: ${topic.subtitle}.\n` +
      `Ruang lingkup: ${topic.comicScope}\n` +
      "Alur: ucapkan kalimat GURU persis dari komik → katakan giliran siswa → BERHENTI.\n" +
      `Naskah komik:\n${turnScript}`
    );
  }

  return (
    "You are Sari. Guide the student through the comic dialogue only — nothing beyond the image.\n" +
    `${comicOnlyRulesEn}\n` +
    roleplayNoteEn +
    `Comic topic: ${topic.subtitle}.\n` +
    `Scope: ${topic.comicScope}\n` +
    "Flow: say GURU line from comic → tell student their turn → STOP.\n" +
    `Comic script:\n${turnScript}`
  );
}

export function resolveClassManagementPrompt(
  topic: ClassManagementTopic,
  tutorVoice: TutorVoiceCode,
  tutorEmotion: TutorEmotionCode = DEFAULT_TUTOR_EMOTION,
  mode: ClassPracticeMode = "teach",
): ResolvedClassManagementPrompt {
  const instructionLanguages = getInstructionLanguages("id", tutorVoice);
  const basePrompt = buildClassManagementSystemPrompt(topic, tutorVoice, mode);
  const allowedPhrases = collectAllowedPhrases(topic);

  return {
    instructionLanguages,
    systemPrompt: appendEmotionToPrompt(basePrompt, tutorEmotion, tutorVoice),
    introMessage: topic.introMessage,
    comicScope: topic.comicScope,
    allowedPhrasesJson: JSON.stringify(allowedPhrases),
    classTurnsJson: JSON.stringify(
      topic.turns.map((turn) => ({
        guruLine: turn.guruLine.id,
        guruLineZh: turn.guruLine.zhTW,
        studentLine: turn.studentLine.id,
        expectedAnswers: turn.expectedAnswers,
        guruPanelIndex: turn.guruPanelIndex,
        studentPanelIndex: turn.studentPanelIndex,
      })),
    ),
  };
}
