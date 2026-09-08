import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { images } from "@/constants/images";
import { colors } from "@/constants/theme";
import { LearningMaterial } from "@/types/learningMaterial";

interface MaterialCardProps {
  material: LearningMaterial;
  onPress: () => void;
}

export function MaterialCard({ material, onPress }: MaterialCardProps) {
  const thumbnail = images[material.imageKey];

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={styles.card}
    >
      <Image source={thumbnail} contentFit="cover" style={styles.thumbnail} />
      <View className="flex-1">
        <Text className="caption">{material.title}</Text>
        <Text
          className="font-poppins-semibold text-sm text-text-primary mt-0.5"
          numberOfLines={2}
        >
          {material.subtitle}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.primary.purple} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.neutral.border,
  },
  thumbnail: {
    width: 56,
    height: 74,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
  },
});
