import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { colors } from "@/constants/theme";
import { Lesson } from "@/types/learning";

interface PracticeCardProps {
  lesson: Lesson;
  index: number;
  activityCount: number;
  locked?: boolean;
  onPress: () => void;
}

export function PracticeCard({
  lesson,
  index,
  activityCount,
  locked = false,
  onPress,
}: PracticeCardProps) {
  return (
    <TouchableOpacity
      activeOpacity={locked ? 1 : 0.8}
      onPress={locked ? undefined : onPress}
      style={[styles.card, locked && styles.cardLocked]}
    >
      <View style={styles.iconWrap}>
        <Text style={styles.icon}>{lesson.icon}</Text>
      </View>

      <View className="flex-1">
        <Text className="caption">Lesson {index + 1}</Text>
        <Text
          className="font-poppins-semibold text-sm text-text-primary"
          numberOfLines={1}
        >
          {lesson.title}
        </Text>
        <Text className="caption mt-0.5">
          {activityCount} questions · +{activityCount * 2} XP
        </Text>
      </View>

      {locked ? (
        <Ionicons
          name="lock-closed"
          size={18}
          color={colors.neutral.textSecondary}
        />
      ) : (
        <Ionicons name="chevron-forward" size={18} color={colors.primary.purple} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardLocked: {
    opacity: 0.55,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#EDE9FE",
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    fontSize: 22,
  },
});
