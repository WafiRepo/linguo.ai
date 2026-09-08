import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Tts from "react-native-tts";

import { colors } from "@/constants/theme";
import { VocabularyItem } from "@/types/learningMaterial";

let ttsInitPromise: Promise<void> | null = null;
function ensureTtsReady(): Promise<void> {
  if (!ttsInitPromise) {
    ttsInitPromise = Tts.getInitStatus()
      .then(() => Tts.setDefaultLanguage("id-ID"))
      .then(() => undefined)
      .catch((err) => {
        console.warn("[VocabularyRow] TTS init failed, requesting engine install:", err);
        return Tts.requestInstallEngine()
          .then(() => undefined)
          .catch((installErr) => {
            console.warn("[VocabularyRow] TTS engine install request failed:", installErr);
          });
      });
  }
  return ttsInitPromise;
}

interface VocabularyRowProps {
  item: VocabularyItem;
}

export function VocabularyRow({ item }: VocabularyRowProps) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceIdRef = useRef<string | number | null>(null);

  useEffect(() => {
    function handleEnd(event: { utteranceId: string | number }) {
      if (event.utteranceId === utteranceIdRef.current) {
        setIsSpeaking(false);
      }
    }
    function handleError(event: unknown) {
      console.warn("[VocabularyRow] tts-error:", JSON.stringify(event));
      handleEnd(event as { utteranceId: string | number });
    }
    // Use the inherited NativeEventEmitter#addListener directly (not the
    // Tts.addEventListener/removeEventListener wrappers) — react-native-tts's
    // own removeEventListener() calls this.removeListener(), an API newer
    // React Native removed, which throws. The subscription's own .remove()
    // still works correctly.
    const subs = [
      Tts.addListener("tts-finish", handleEnd),
      Tts.addListener("tts-cancel", handleEnd),
      Tts.addListener("tts-error", handleError),
    ];
    return () => {
      subs.forEach((sub) => sub.remove());
    };
  }, []);

  async function handlePlay() {
    await ensureTtsReady();

    try {
      // Some react-native-tts versions throw here on newer React Native
      // (internal use of a removed NativeEventEmitter API) — never let a
      // stop() failure block the actual speak() call below.
      await Tts.stop();
    } catch (err) {
      console.warn("[VocabularyRow] Tts.stop() failed (non-fatal):", err);
    }

    setIsSpeaking(true);
    try {
      // KEY_PARAM_VOLUME maxes out the utterance within the current stream
      // volume — expo-speech's `volume` option is web-only, so this is the
      // only way to control TTS loudness on Android.
      //
      // The .d.ts declares speak() as returning the utteranceId
      // synchronously, but the Android native module actually resolves it
      // via a Promise — awaiting here is required, otherwise
      // utteranceIdRef holds a Promise object that never matches the
      // tts-finish event's utteranceId, and isSpeaking never resets.
      const id = await Tts.speak(item.speakText, {
        iosVoiceId: "",
        rate: 1.0,
        androidParams: {
          KEY_PARAM_STREAM: "STREAM_MUSIC",
          KEY_PARAM_VOLUME: 1.0,
          KEY_PARAM_PAN: 0,
        },
      });
      utteranceIdRef.current = id;
    } catch (err) {
      console.warn("[VocabularyRow] Tts.speak() failed:", err);
      setIsSpeaking(false);
    }
  }

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
        onPress={handlePlay}
        style={[styles.playButton, isSpeaking && styles.playButtonActive]}
        hitSlop={8}
      >
        <Ionicons
          name={isSpeaking ? "volume-high" : "volume-medium-outline"}
          size={18}
          color={isSpeaking ? "#fff" : colors.primary.purple}
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
