// Stream Video for the phone app. The web app uses lib/stream.web.tsx, which
// exports the same names built on Stream's browser client.
export {
  Call,
  callManager,
  StreamCall,
  StreamVideo,
  StreamVideoClient,
  useCallStateHooks,
} from "@stream-io/video-react-native-sdk";
export type { CallClosedCaption } from "@stream-io/video-react-native-sdk";

/** The native SDK plays the other participants' audio itself. */
export function RemoteAudio() {
  return null;
}
