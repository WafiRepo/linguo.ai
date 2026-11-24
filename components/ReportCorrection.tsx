import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import { useEffect } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { vocabAudio, vocabAudioSlow } from "@/constants/audio";
import { colors } from "@/constants/theme";
import { resetPhoneAudioToMedia } from "@/lib/audioMode";
import { speakWithDevice } from "@/lib/deviceSpeech";
import { useT } from "@/lib/i18n";
import { RoleplayCorrection } from "@/types/roleplay";

function cleanWord(word: string): string {
  return word.toLowerCase().replace(/[.,!?;:"'()]/g, "");
}

/**
 * One line of the end-of-lesson report: what the student said, the right
 * line with the words to fix highlighted, why, and each of those words to
 * listen to (normal and slowly).
 */
export function ReportCorrection({ correction }: { correction: RoleplayCorrection }) {
  const { t } = useT();
  const player = useAudioPlayer();
  const focus = new Set((correction.words ?? []).map(cleanWord).filter(Boolean));
  const words = correction.better.split(/\s+/).filter(Boolean);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  }, []);

  function play(word: string, slow: boolean) {
    resetPhoneAudioToMedia();
    const recording = (slow ? vocabAudioSlow : vocabAudio)[word];
    if (!recording) {
      player.pause();
      speakWithDevice(word, slow ? 0.6 : 0.9);
      return;
    }
    player.replace(recording);
    player.seekTo(0).catch(() => {});
    player.play();
  }

  return (
    <View className="rounded-2xl border border-border bg-white p-4 mb-3">
      <Text className="font-poppins text-xs text-text-secondary">{t("roleplay.saidLabel")}</Text>
      <Text className="font-poppins text-sm text-text-secondary mb-2">{correction.said}</Text>

      <Text className="font-poppins text-xs text-lingua-green">{t("roleplay.betterLabel")}</Text>
      <Text className="font-poppins-semibold text-[15px] text-text-primary mb-2">
        {words.map((word, index) => (
          <Text
            key={index}
            className={focus.has(cleanWord(word)) ? "text-[#B45309] bg-[#FDE68A]" : undefined}
          >
            {index < words.length - 1 ? `${word} ` : word}
          </Text>
        ))}
      </Text>

      {correction.tip ? (
        <Text className="font-poppins text-[13px] leading-5 text-text-secondary">🔊 {correction.tip}</Text>
      ) : null}

      {focus.size ? (
        <View className="flex-row flex-wrap gap-2 mt-3">
          {[...focus].map((word) => (
            <View key={word} className="flex-row items-center gap-1.5 rounded-full bg-[#F5F3FF] pl-3 pr-1 py-1">
              <Text className="font-poppins-semibold text-[13px] text-lingua-purple mr-1">{word}</Text>
              <TouchableOpacity
                onPress={() => play(word, false)}
                style={styles.playButton}
                hitSlop={4}
                accessibilityRole="button"
                accessibilityLabel={t("material.play")}
              >
                <Ionicons name="volume-medium-outline" size={16} color={colors.primary.purple} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => play(word, true)}
                style={styles.playButton}
                hitSlop={4}
                accessibilityRole="button"
                accessibilityLabel={t("material.playSlow")}
              >
                <MaterialCommunityIcons name="tortoise" size={17} color={colors.primary.purple} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  playButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
});
