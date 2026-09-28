import { Ionicons } from "@expo/vector-icons";

import { comicTeacherName } from "@/lib/comicRoleplay";
import { Translate } from "@/lib/i18n";
import { classModeKey, classTopicRoute, ClassTopicMode } from "@/lib/topicProgress";
import { ClassManagementTopic } from "@/types/classManagement";

// Today's plan follows the next unfinished AI Teacher topic: its Latihan,
// then its Role Play.
export interface TodayPlanItem {
  id: ClassTopicMode;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  completed: boolean;
  route: string;
  xpHint: string;
}

export function buildTodayPlanItems({
  topic,
  completedClassModes,
  t,
}: {
  topic: ClassManagementTopic | undefined;
  completedClassModes: string[];
  t: Translate;
}): TodayPlanItem[] {
  if (!topic) return [];

  const teacher = comicTeacherName(topic);
  const isDone = (mode: ClassTopicMode) => completedClassModes.includes(classModeKey(topic.id, mode));

  return [
    {
      id: "practice",
      icon: "school",
      iconBg: "#EDE9FE",
      iconColor: "#7C3AED",
      title: t("plan.practice.title"),
      subtitle: t("plan.practice.subtitle", { teacher, topic: topic.subtitle }),
      completed: isDone("practice"),
      route: classTopicRoute(topic.id, "practice"),
      xpHint: `+${topic.xpReward} XP`,
    },
    {
      id: "roleplay",
      icon: "chatbubbles",
      iconBg: "#FEE2E2",
      iconColor: "#EF4444",
      title: t("plan.roleplay.title"),
      subtitle: t("plan.roleplay.subtitle", { teacher }),
      completed: isDone("roleplay"),
      route: classTopicRoute(topic.id, "roleplay"),
      xpHint: `+${topic.xpReward} XP`,
    },
  ];
}

export function countCompletedPlanItems(items: TodayPlanItem[]): number {
  return items.filter((item) => item.completed).length;
}
