import { ClassManagementTopic } from "@/types/classManagement";
import { RoleplayScenario } from "@/types/roleplay";

// AI Teacher's Role Play reuses the live roleplay screen: each comic dialogue
// becomes a mission the student completes, in order.
export type ComicTeacherName = "Bu Guru" | "Pak Guru";

// Some comics have a male teacher (the student answers "Baik, Pak Guru");
// the AI takes that role, with a male voice on the server.
export function comicTeacherName(topic: ClassManagementTopic): ComicTeacherName {
  return topic.turns.some((turn) => /\bPak\b/.test(turn.studentLine.id)) ? "Pak Guru" : "Bu Guru";
}

export function comicTopicToScenario(
  topic: ClassManagementTopic,
  practice = false,
): RoleplayScenario {
  return {
    id: topic.id,
    title: `${topic.subtitle} · ${practice ? "Latihan" : "Role Play"}`,
    subtitle: topic.title,
    emoji: "📖",
    accentColor: "#F5F3FF",
    aiName: comicTeacherName(topic),
    aiRole: "an Indonesian primary-school teacher",
    setting: topic.comicScope,
    openingLine: topic.turns[0]?.guruLine.id ?? "",
    xpReward: topic.xpReward,
    objectives: topic.turns.map((turn, index) => ({
      id: `turn-${index}`,
      label: `對話 ${index + 1}`,
      goal: `answer as the student: "${turn.studentLine.id}"`,
      targets: turn.expectedAnswers,
    })),
    // Several dialogues can share an answer (e.g. "Hadir."); list each once.
    hints: topic.turns
      .filter(
        (turn, index) =>
          topic.turns.findIndex((other) => other.studentLine.id === turn.studentLine.id) === index,
      )
      .map((turn) => ({
        text: turn.studentLine.id,
        translation: turn.studentLine.zhTW,
      })),
  };
}

export function comicCallCustomData(topic: ClassManagementTopic, practice = false) {
  return {
    mode: practice ? "comic_practice" : "comic_roleplay",
    topic_id: topic.id,
    topic_title: topic.subtitle,
    ai_name: comicTeacherName(topic),
    opening_line: topic.turns[0]?.guruLine.id ?? "",
    class_turns: JSON.stringify(
      topic.turns.map((turn) => ({
        guruLine: turn.guruLine.id,
        guruLineZh: turn.guruLine.zhTW,
        studentLine: turn.studentLine.id,
        studentLineZh: turn.studentLine.zhTW,
        expectedAnswers: turn.expectedAnswers,
      })),
    ),
  };
}
