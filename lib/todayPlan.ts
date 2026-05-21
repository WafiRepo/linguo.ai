import { Ionicons } from "@expo/vector-icons";

import { Lesson } from "@/types/learning";

export type TodayPlanItemId = "lesson" | "ai-conversation" | "new-words";

export interface TodayPlanProgress {
  date: string;
  lessonId: string;
  lesson: boolean;
  aiConversation: boolean;
  newWords: boolean;
}

export interface TodayPlanItem {
  id: TodayPlanItemId;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  completed: boolean;
  route: string;
  xpHint: string;
}

const PLAN_META: Omit<
  TodayPlanItem,
  "subtitle" | "completed" | "route" | "xpHint"
>[] = [
  {
    id: "lesson",
    icon: "book",
    iconBg: "#EDE9FE",
    iconColor: "#7C3AED",
    title: "Lesson",
  },
  {
    id: "ai-conversation",
    icon: "headset",
    iconBg: "#EDE9FE",
    iconColor: "#7C3AED",
    title: "AI Conversation",
  },
  {
    id: "new-words",
    icon: "chatbubble-ellipses",
    iconBg: "#FEE2E2",
    iconColor: "#EF4444",
    title: "New words",
  },
];

export function createEmptyTodayPlanProgress(
  lessonId: string,
  date: string,
): TodayPlanProgress {
  return {
    date,
    lessonId,
    lesson: false,
    aiConversation: false,
    newWords: false,
  };
}

export function isTodayPlanItemComplete(
  progress: TodayPlanProgress | undefined,
  itemId: TodayPlanItemId,
  lessonId: string,
  date: string,
): boolean {
  if (!progress || progress.date !== date || progress.lessonId !== lessonId) {
    return false;
  }

  switch (itemId) {
    case "lesson":
      return progress.lesson;
    case "ai-conversation":
      return progress.aiConversation;
    case "new-words":
      return progress.newWords;
    default:
      return false;
  }
}

export function buildTodayPlanItems({
  lesson,
  lessonNumber,
  progress,
  date,
  completedLessonIds,
}: {
  lesson: Lesson | undefined;
  lessonNumber: number;
  progress: TodayPlanProgress | undefined;
  date: string;
  completedLessonIds: string[];
}): TodayPlanItem[] {
  const lessonId = lesson?.id ?? "";
  const vocabularyCount = lesson?.vocabulary.length ?? 0;
  const lessonCompletedEver = lesson
    ? completedLessonIds.includes(lesson.id)
    : false;

  return PLAN_META.map((item) => {
    const planComplete = isTodayPlanItemComplete(
      progress,
      item.id,
      lessonId,
      date,
    );

    if (item.id === "lesson") {
      return {
        ...item,
        subtitle: lesson?.title ?? "Start your first lesson",
        completed: planComplete || lessonCompletedEver,
        route: lesson ? `/lesson/${lesson.id}` : "/learn",
        xpHint: lesson ? `+${lesson.xpReward} XP` : "Start learning",
      };
    }

    if (item.id === "ai-conversation") {
      return {
        ...item,
        subtitle: lesson
          ? `Practice lesson ${lessonNumber} with Sari`
          : "Talk with your AI teacher",
        completed: planComplete,
        route: lesson ? `/lesson/${lesson.id}` : "/learn",
        xpHint: lesson ? `+${lesson.xpReward} XP` : "Voice lesson",
      };
    }

    return {
      ...item,
      subtitle: lesson
        ? `${vocabularyCount} words from ${lesson.title}`
        : "Review vocabulary",
      completed: planComplete,
      route: lesson ? `/practice/${lesson.id}` : "/learn",
      xpHint: "Up to +23 XP",
    };
  });
}

export function countCompletedPlanItems(items: TodayPlanItem[]): number {
  return items.filter((item) => item.completed).length;
}
