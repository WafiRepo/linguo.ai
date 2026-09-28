import { callManager } from "@stream-io/video-react-native-sdk";

// A Stream call puts Android into call-audio mode (MODE_IN_COMMUNICATION),
// and the SDK's stop() never switches it back — later sounds, like the
// vocabulary TTS, then come out of the quiet earpiece. Starting the call
// manager in the "listener" role sets normal media mode; stopping it right
// after leaves the phone in that mode.
export function resetPhoneAudioToMedia() {
  try {
    callManager.start({ audioRole: "listener" });
    callManager.stop();
  } catch (err) {
    console.warn("[audioMode] reset failed:", err);
  }
}
