// Stream Video for the web app: the same names as lib/stream.ts, built on
// Stream's browser client (@stream-io/video-client) and its React bindings,
// which the React Native SDK itself is built on.
import { Call, StreamVideoClient } from "@stream-io/video-client";
import {
  StreamCallProvider,
  StreamVideoProvider,
  useCall,
  useCallStateHooks,
} from "@stream-io/video-react-bindings";
import { PropsWithChildren, useEffect } from "react";

export { Call, StreamVideoClient, useCallStateHooks };
export type { CallClosedCaption } from "@stream-io/video-client";

export function StreamVideo({ client, children }: PropsWithChildren<{ client: StreamVideoClient }>) {
  return <StreamVideoProvider client={client}>{children}</StreamVideoProvider>;
}

export function StreamCall({ call, children }: PropsWithChildren<{ call: Call }>) {
  return <StreamCallProvider call={call}>{children}</StreamCallProvider>;
}

/** Browsers have no phone audio modes (speaker/earpiece) to switch. */
export const callManager = {
  start: (_options?: unknown) => {},
  stop: () => {},
};

/**
 * Browsers only play a call's audio through an <audio> element, so give each
 * other participant (Bu Guru) one. Render it inside <StreamCall>.
 */
export function RemoteAudio() {
  const call = useCall();
  const { useRemoteParticipants } = useCallStateHooks();
  const participants = useRemoteParticipants();
  return (
    <>
      {call
        ? participants.map((participant) => (
            <ParticipantAudio key={participant.sessionId} call={call} sessionId={participant.sessionId} />
          ))
        : null}
    </>
  );
}

function ParticipantAudio({ call, sessionId }: { call: Call; sessionId: string }) {
  useEffect(() => {
    const element = document.createElement("audio");
    element.autoplay = true;
    document.body.appendChild(element);
    const unbind = call.bindAudioElement(element, sessionId, "audioTrack");
    return () => {
      unbind?.();
      element.remove();
    };
  }, [call, sessionId]);
  return null;
}
