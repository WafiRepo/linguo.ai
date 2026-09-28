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
 * Topics the student has worked on: opened, or finished Latihan or Role Play.
 * These are the ones with a check mark on the AI Teacher tab.
 */
export function getWorkedOnTopicIds(progress: {
  completedClassTopicIds: string[];
  startedClassTopicIds: string[];
  completedClassModes: string[];
}): string[] {
  return ALL_CLASS_TOPICS.filter(
    (topic) =>
      progress.completedClassTopicIds.includes(topic.id) ||
      progress.startedClassTopicIds.includes(topic.id) ||
      progress.completedClassModes.some((key) => key.startsWith(`${topic.id}:`)),
  ).map((topic) => topic.id);
}

/** First topic (in AI Teacher order) the student hasn't worked on at all. */
export function getNextClassTopic(workedOnTopicIds: string[]): ClassManagementTopic | undefined {
  return ALL_CLASS_TOPICS.find((topic) => !workedOnTopicIds.includes(topic.id));
}
