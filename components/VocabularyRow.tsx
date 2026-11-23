import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { colors } from "@/constants/theme";
import { useT } from "@/lib/i18n";
import { syllablesOf } from "@/lib/pronunciation";
import { VocabularyItem } from "@/types/learningMaterial";

interface VocabularyRowProps {
  item: VocabularyItem;
  /** Which recording of this word is playing, if any. */
  playing: "normal" | "slow" | null;
  onPlay: () => void;
  /** Slowly, syllable by syllable. */
  onPlaySlow: () => void;
}

export function VocabularyRow({ item, playing, onPlay, onPlaySlow }: VocabularyRowProps) {
  const { t } = useT();
  return (
    <View style={styles.row}>
      <View className="flex-1">
        <Text className="font-poppins-semibold text-sm text-text-primary">
          {item.word}
        </Text>
        <Text className="font-poppins text-xs text-lingua-purple mt-0.5">
          {syllablesOf(item.speakText)}
        </Text>
        <Text className="caption mt-0.5">{item.translation}</Text>
      </View>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPlaySlow}
        style={[styles.playButton, playing === "slow" && styles.playButtonActive]}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={t("material.playSlow")}
      >
        <MaterialCommunityIcons
          name="tortoise"
          size={19}
          color={playing === "slow" ? "#fff" : colors.primary.purple}
        />
      </TouchableOpacity>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPlay}
        style={[styles.playButton, playing === "normal" && styles.playButtonActive]}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={t("material.play")}
      >
        <Ionicons
          name={playing === "normal" ? "volume-high" : "volume-medium-outline"}
          size={18}
          color={playing === "normal" ? "#fff" : colors.primary.purple}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
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
