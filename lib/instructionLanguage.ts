import {
  appendEmotionToPrompt,
  DEFAULT_TUTOR_EMOTION,
  TutorEmotionCode,
} from "@/lib/tutorEmotion";
import { Lesson, LanguageCode } from "@/types/learning";

/** Language the AI teacher uses to explain (not the language being learned). */
export type InstructionLanguageCode = "zh-TW" | "en";

export type TutorVoiceCode = InstructionLanguageCode;

export interface TutorVoiceOption {
  code: TutorVoiceCode;
  name: string;
  description: string;
  emoji: string;
}

export const TUTOR_VOICE_OPTIONS: TutorVoiceOption[] = [
  {
    code: "zh-TW",
    name: "Guru Taiwan",
    description: "Penjelasan dalam 繁體中文（台灣）",
    emoji: "🇹🇼",
  },
  {
    code: "en",
    name: "English Tutor",
    description: "Explains in English",
    emoji: "🇺🇸",
  },
];

export function getInstructionLanguages(
  targetLanguage: LanguageCode,
  tutorVoice: TutorVoiceCode = "zh-TW",
): InstructionLanguageCode[] {
  if (targetLanguage === "id") {
    return [tutorVoice];
  }
  return ["en"];
}

function buildPronunciationGuide(lesson: Lesson): string {
  const wordLines = lesson.vocabulary.map(
    (v) =>
      `- ${v.word} (${v.translation}) → Indonesian: ${v.pronunciation}`,
  );
  const phraseLines = lesson.phrases.map(
    (p) =>
      `- ${p.text} (${p.translation}) → Indonesian: ${p.pronunciation}`,
  );
  return [...wordLines, ...phraseLines].join("\n");
}

function lessonTopicForIntro(lesson: Lesson): string {
  const desc = lesson.description.trim();
  if (/^learn /i.test(desc)) {
    return desc.replace(/^learn /i, "").trim();
  }
  if (lesson.aiTeacherPrompt.topics.length > 0) {
    return lesson.aiTeacherPrompt.topics.join(", ");
  }
  return desc || "Indonesian";
}

function buildEnglishIndonesianSystemPrompt(lesson: Lesson): string {
  const scope = [
    ...lesson.vocabulary.map((v) => v.word),
    ...lesson.phrases.map((p) => p.text),
  ].join(", ");

  const pronunciationGuide = buildPronunciationGuide(lesson);
  const topic = lessonTopicForIntro(lesson);

  return (
    "You're a warm English-speaking teacher helping a student learn Indonesian. " +
    `Today's topic (English label only — NOT Indonesian vocabulary): ${topic}. ` +
    "This is INTERACTIVE — not a lecture. " +
    "TEACHING MODE order: (1) say ONLY the Indonesian word/phrase first with a brief pause, " +
    "using Indonesian phonetics — not English stress or English vowels; " +
    "(2) explain the meaning in English; (3) give one short pronunciation tip in English; " +
    "(4) end with ONE question in English — then STOP at the question mark. " +
    "Your turn ENDS at the question mark — stop there and output nothing else. " +
    "Never write a reaction in the same turn as a teaching step. Keep every reply to one or two sentences. " +
    "Do not use Bahasa Indonesia for explanations — only when saying lesson vocabulary or phrases. " +
    "Never anglicize Indonesian words (e.g. Halo = HA-lo, not HAY-lo). " +
    "ONLY teach Indonesian words/phrases from ALLOWED LIST below — never teach English topic words " +
    "(e.g. Greetings, Friends, Shopping) as if they were Indonesian. " +
    `ALLOWED LIST: ${scope}.\n\n` +
    "PRONUNCIATION GUIDE — follow exactly when demonstrating Indonesian:\n" +
    `${pronunciationGuide}`
  );
}

function buildEnglishIndonesianIntro(lesson: Lesson): string {
  const topic = lessonTopicForIntro(lesson);
  return (
    `Hi! I'm your Indonesian teacher. Today we'll learn about ${topic}. ` +
    "Are you ready to get started?"
  );
}

export interface ResolvedAiTeacherPrompt {
  instructionLanguages: InstructionLanguageCode[];
  systemPrompt: string;
  introMessage: string;
}

export function resolveAiTeacherPrompt(
  lesson: Lesson,
  tutorVoice: TutorVoiceCode,
  tutorEmotion: TutorEmotionCode = DEFAULT_TUTOR_EMOTION,
): ResolvedAiTeacherPrompt {
  const languageCode = lesson.id.split("-")[0] as LanguageCode;
  const instructionLanguages = getInstructionLanguages(languageCode, tutorVoice);
  const emotion = lesson.aiTeacherPrompt.emotion ?? tutorEmotion;

  if (languageCode === "id" && tutorVoice === "en") {
    return {
      instructionLanguages,
      systemPrompt: appendEmotionToPrompt(
        buildEnglishIndonesianSystemPrompt(lesson),
        emotion,
      ),
      introMessage: buildEnglishIndonesianIntro(lesson),
    };
  }

  return {
    instructionLanguages,
    systemPrompt: appendEmotionToPrompt(
      lesson.aiTeacherPrompt.systemPrompt,
      emotion,
    ),
    introMessage: lesson.aiTeacherPrompt.introMessage,
  };
}
