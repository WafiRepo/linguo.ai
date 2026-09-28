import { ClassManagementTopic } from "@/types/classManagement";
import { RoleplayScenario } from "@/types/roleplay";

// AI Teacher's Role Play reuses the live roleplay screen: each comic dialogue
// becomes a mission the student completes, in order.
export function comicTopicToScenario(topic: ClassManagementTopic): RoleplayScenario {
  return {
    id: topic.id,
    title: `${topic.subtitle} · Role Play`,
    subtitle: topic.title,
    emoji: "📖",
    accentColor: "#F5F3FF",
    aiName: "Bu Guru",
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
    hints: topic.turns.map((turn) => ({
      text: turn.studentLine.id,
      translation: turn.studentLine.zhTW,
    })),
  };
}

export function comicCallCustomData(topic: ClassManagementTopic) {
  return {
    mode: "comic_roleplay",
    topic_id: topic.id,
    topic_title: topic.subtitle,
    ai_name: "Bu Guru",
    opening_line: topic.turns[0]?.guruLine.id ?? "",
    class_turns: JSON.stringify(
      topic.turns.map((turn) => ({
        guruLine: turn.guruLine.id,
        guruLineZh: turn.guruLine.zhTW,
        studentLine: turn.studentLine.id,
        expectedAnswers: turn.expectedAnswers,
      })),
    ),
  };
}
