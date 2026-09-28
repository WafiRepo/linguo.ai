import { colors } from "@/constants/theme";
import { AppNotification } from "@/components/NotificationsModal";
import { Translate } from "@/lib/i18n";

type BuildNotificationsParams = {
  xpToday: number;
  dailyGoal: number;
  nextTopicTitle?: string;
  t: Translate;
};

export function buildHomeNotifications({
  xpToday,
  dailyGoal,
  nextTopicTitle,
  t,
}: BuildNotificationsParams): AppNotification[] {
  const items: AppNotification[] = [];

  const xpRemaining = Math.max(dailyGoal - xpToday, 0);
  if (xpRemaining > 0) {
    items.push({
      id: "daily-goal",
      title: t("notifications.dailyGoal.title"),
      message: t("notifications.dailyGoal.message", { xp: xpRemaining, goal: dailyGoal }),
      icon: "trophy-outline",
      iconBg: "#FFF5E8",
      iconColor: colors.semantic.warning,
    });
  } else {
    items.push({
      id: "daily-goal-complete",
      title: t("notifications.goalDone.title"),
      message: t("notifications.goalDone.message"),
      icon: "checkmark-circle-outline",
      iconBg: "#ECFDF5",
      iconColor: colors.semantic.success,
    });
  }

  if (nextTopicTitle) {
    items.push({
      id: "next-topic",
      title: t("notifications.nextTopic.title"),
      message: t("notifications.nextTopic.message", { topic: nextTopicTitle }),
      icon: "book-outline",
      iconBg: "#EDE9FE",
      iconColor: colors.primary.purple,
    });
  }

  return items;
}
