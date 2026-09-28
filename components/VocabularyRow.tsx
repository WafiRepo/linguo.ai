import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { colors } from "@/constants/theme";
import { VocabularyItem } from "@/types/learningMaterial";

interface VocabularyRowProps {
  item: VocabularyItem;
  isPlaying: boolean;
  onPlay: () => void;
}

export function VocabularyRow({ item, isPlaying, onPlay }: VocabularyRowProps) {
  return (
    <View style={styles.row}>
      <View className="flex-1">
        <Text className="font-poppins-semibold text-sm text-text-primary">
          {item.word}
        </Text>
        <Text className="caption mt-0.5">{item.translation}</Text>
      </View>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPlay}
        style={[styles.playButton, isPlaying && styles.playButtonActive]}
        hitSlop={8}
      >
        <Ionicons
          name={isPlaying ? "volume-high" : "volume-medium-outline"}
          size={18}
          color={isPlaying ? "#fff" : colors.primary.purple}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.neutral.border,
  },
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F5F3FF",
    alignItems: "center",
    justifyContent: "center",
  },
  playButtonActive: {
    backgroundColor: colors.primary.purple,
  },
});
