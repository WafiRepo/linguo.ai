import { BAGIAN_B_TOPICS, BAGIAN_C_TOPICS, CLASS_MANAGEMENT_TOPICS } from "@/data/classManagement";
import { ClassManagementTopic } from "@/types/classManagement";

// AI Teacher progress, shared by the AI Teacher tab and the home screen.
export type ClassTopicMode = "practice" | "roleplay";

export const ALL_CLASS_TOPICS: ClassManagementTopic[] = [
  ...CLASS_MANAGEMENT_TOPICS,
  ...BAGIAN_B_TOPICS,
  ...BAGIAN_C_TOPICS,
];

export function classModeKey(topicId: string, mode: ClassTopicMode): string {
  return `${topicId}:${mode}`;
}

// Role Play score: the share of dialogues Bu Guru did not need to correct.
// The PASS stamp needs at least this score (0–100).
export const ROLE_PLAY_PASS_SCORE = 60;

export function rolePlayScore(dialogues: number, corrections: number): number {
  if (dialogues <= 0) return 0;
  const correct = Math.max(0, dialogues - corrections);
  return Math.round((correct / dialogues) * 100);
}

export function classTopicRoute(topicId: string, mode: ClassTopicMode): string {
  return mode === "roleplay"
    ? `/roleplay/${topicId}?kind=comic`
    : `/roleplay/${topicId}?kind=comic&mode=practice`;
}

/**
 * First topic (in AI Teacher order) that is not done yet. A topic is done when
 * both Practice and Role Play are finished: the same rule as the Learning
 * Portfolio and the certificates, so every "topics done" number agrees.
 */
export function getNextClassTopic(completedTopicIds: string[]): ClassManagementTopic | undefined {
  return ALL_CLASS_TOPICS.find((topic) => !completedTopicIds.includes(topic.id));
}
