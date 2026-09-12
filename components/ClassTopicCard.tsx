import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { images } from "@/constants/images";
import { colors } from "@/constants/theme";
import { ClassManagementTopic } from "@/types/classManagement";

interface ClassTopicCardProps {
  topic: ClassManagementTopic;
  isCompleted: boolean;
  onPress: (mode: "teach" | "roleplay") => void;
}

export function ClassTopicCard({
  topic,
  isCompleted,
  onPress,
}: ClassTopicCardProps) {
  const thumbnail = images[topic.imageKey];

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Image
          source={thumbnail}
          contentFit="cover"
          style={styles.thumbnail}
        />
        <View className="flex-1">
          <Text className="caption">{topic.title}</Text>
          <Text
            className="font-poppins-semibold text-sm text-text-primary mt-0.5"
            numberOfLines={1}
          >
            {topic.subtitle}
          </Text>
          <Text className="caption mt-1" numberOfLines={2}>
            {topic.description}
          </Text>
          <Text className="caption mt-1">
            {topic.turns.length} dialog · {topic.xpReward} XP
          </Text>
        </View>
        {isCompleted ? (
          <View style={styles.checkCircle}>
            <Ionicons name="checkmark" size={16} color="#fff" />
          </View>
        ) : null}
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionButton, styles.actionButtonPrimary]}
          onPress={() => onPress("teach")}
        >
          <Ionicons name="school-outline" size={14} color={colors.primary.purple} />
          <Text style={styles.actionButtonTextPrimary}>Latihan</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.actionButtonSecondary]}
          onPress={() => onPress("roleplay")}
        >
          <Ionicons name="chatbubbles-outline" size={14} color={colors.neutral.textPrimary} />
          <Text style={styles.actionButtonTextSecondary}>Role Play</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.neutral.border,
    gap: 10,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  thumbnail: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.semantic.success,
    alignItems: "center",
    justifyContent: "center",
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 10,
    paddingVertical: 8,
    borderWidth: 1,
  },
  actionButtonPrimary: {
    backgroundColor: "#F5F3FF",
    borderColor: "#DDD6FE",
  },
  actionButtonSecondary: {
    backgroundColor: "#F9FAFB",
    borderColor: colors.neutral.border,
  },
  actionButtonTextPrimary: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 12,
    color: colors.primary.purple,
  },
  actionButtonTextSecondary: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 12,
    color: colors.neutral.textPrimary,
  },
});
