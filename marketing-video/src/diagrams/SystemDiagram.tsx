import React from "react";
import { AbsoluteFill } from "remotion";

import { colors } from "../theme";
import { Arrow, Box, DiagramTitle } from "./DiagramKit";

// How one AI Teacher session flows between the phone, our servers and the
// hosted services. Rendered to docs/images/system-diagram.png.
export const SystemDiagram: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: colors.lavender }}>
    <DiagramTitle
      title="Lingua · System diagram"
      subtitle="What happens when a student opens Practice or Role Play with the AI teacher"
    />

    <Box
      x={60}
      y={330}
      w={340}
      h={400}
      tone="purple"
      title="Lingua app"
      subtitle="Student's phone · Expo / React Native"
      lines={[
        "Comics, materials and vocabulary audio are bundled in the app",
        "Progress saved on the device (AsyncStorage)",
        "UI in English or 繁體中文",
      ]}
    />

    <Box
      x={640}
      y={150}
      w={400}
      h={150}
      title="Clerk"
      subtitle="Sign-in (email code)"
      lines={["Issues the session token"]}
    />
    <Box
      x={640}
      y={395}
      w={400}
      h={235}
      title="API routes"
      subtitle="Expo Router on EAS Hosting"
      lines={["GET /api/stream-token", "POST · DELETE /api/agent-session", "Checks the Clerk token and call owner"]}
    />
    <Box
      x={640}
      y={740}
      w={400}
      h={200}
      title="Stream Video"
      subtitle="Live call (WebRTC audio)"
      lines={["Student and AI teacher voices", "Custom events: transcripts, corrections, stars"]}
    />

    <Box
      x={1240}
      y={400}
      w={400}
      h={380}
      tone="dark"
      title="Voice agent server"
      subtitle="Python · vision-agents · Taiwan"
      lines={[
        "Joins the call as Bu Guru / Pak Guru",
        "Keeps the comic dialogue in order",
        "Checks answers, corrects, gives stars",
        "Sends the end-of-session review",
      ]}
    />

    <Box
      x={1240}
      y={100}
      w={400}
      h={220}
      tone="orange"
      title="OpenAI"
      lines={["gpt-live-1: live voice teacher", "gpt-4o-mini-transcribe: captions", "gpt-5.4-mini: session review"]}
    />

    <Box
      x={60}
      y={800}
      w={340}
      h={170}
      title="PostHog"
      subtitle="Usage analytics (optional)"
      lines={["No personal data about the child"]}
    />

    <Arrow from={[400, 400]} to={[636, 240]} step={1} label="Sign in" labelOffset={[-20, -10]} />
    <Arrow from={[400, 500]} to={[636, 500]} step={2} label="Start teacher" labelOffset={[0, -32]} />
    <Arrow from={[1040, 505]} to={[1236, 505]} step={3} label="Start session" labelOffset={[0, -32]} />
    <Arrow from={[400, 690]} to={[636, 830]} step={4} label="Student speaks" both labelOffset={[-20, 24]} />
    <Arrow from={[1236, 730]} to={[1040, 840]} step={5} label="Teacher voice + events" both labelOffset={[70, 58]} />
    <Arrow from={[1440, 396]} to={[1440, 324]} step={6} label="Voice AI" both labelOffset={[90, 0]} />
    <Arrow from={[230, 734]} to={[230, 796]} />
  </AbsoluteFill>
);
