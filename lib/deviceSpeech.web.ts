// Web version of lib/deviceSpeech.ts (Metro picks this file on web):
// react-native-tts only exists on phones, so the browser's own speech
// synthesis reads words that have no recording yet.
export async function speakWithDevice(text: string, rate = 0.9): Promise<void> {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "id-ID";
    utterance.rate = rate;
    const voice = window.speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith("id"));
    if (voice) utterance.voice = voice;
    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn("[deviceSpeech] browser speech failed:", err);
  }
}
