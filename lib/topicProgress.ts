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

export function classTopicRoute(topicId: string, mode: ClassTopicMode): string {
  return mode === "roleplay"
    ? `/roleplay/${topicId}?kind=comic`
    : `/roleplay/${topicId}?kind=comic&mode=practice`;
}

/**
 * First topic (in AI Teacher order) that is not done yet. A topic is done when
 * its Role Play earned the PASS stamp (see lib/rolePlayScore.ts): the same rule
 * as the Learning Portfolio and the certificates, so every number agrees.
 */
export function getNextClassTopic(passedTopicIds: string[]): ClassManagementTopic | undefined {
  return ALL_CLASS_TOPICS.find((topic) => !passedTopicIds.includes(topic.id));
}
