import Tts from "react-native-tts";

// Fallback for vocabulary without a recording in constants/audio.ts
// (run scripts/generate_vocab_audio.py to add one): the phone's own
// text-to-speech, which sounds less natural and varies per device.
let ttsInitPromise: Promise<void> | null = null;
function ensureTtsReady(): Promise<void> {
  if (!ttsInitPromise) {
    ttsInitPromise = Tts.getInitStatus()
      .then(() => Tts.setDefaultLanguage("id-ID"))
      .then(() => undefined)
      .catch((err) => {
        console.warn("[deviceSpeech] TTS init failed, requesting engine install:", err);
        return Tts.requestInstallEngine()
          .then(() => undefined)
          .catch((installErr) => {
            console.warn("[deviceSpeech] TTS engine install request failed:", installErr);
          });
      });
  }
  return ttsInitPromise;
}

export async function speakWithDevice(text: string): Promise<void> {
  await ensureTtsReady();
  try {
    // Some react-native-tts versions throw here on newer React Native; a
    // stop() failure must not block speak().
    await Tts.stop();
  } catch {}
  try {
    await Tts.speak(text, {
      iosVoiceId: "",
      rate: 0.9,
      androidParams: {
        KEY_PARAM_STREAM: "STREAM_MUSIC",
        KEY_PARAM_VOLUME: 1.0,
        KEY_PARAM_PAN: 0,
      },
    });
  } catch (err) {
    console.warn("[deviceSpeech] Tts.speak() failed:", err);
  }
}
