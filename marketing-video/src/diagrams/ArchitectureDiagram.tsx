import React from "react";
import { AbsoluteFill } from "remotion";

import { colors } from "../theme";
import { Box, DiagramTitle, font } from "./DiagramKit";

const ColumnLabel: React.FC<{ x: number; w: number; text: string }> = ({ x, w, text }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: 150,
      width: w,
      fontFamily: font,
      fontSize: 22,
      fontWeight: 700,
      letterSpacing: 2,
      textTransform: "uppercase",
      color: colors.purple,
    }}
  >
    {text}
  </div>
);

// Code layout by layer. Rendered to docs/images/architecture.png.
export const ArchitectureDiagram: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: colors.lavender }}>
    <DiagramTitle title="Lingua · Architecture" subtitle="Layers in this repository and the services they use" />

    <ColumnLabel x={60} w={520} text="Mobile app · Expo SDK 54" />
    <Box
      x={60}
      y={200}
      w={520}
      h={170}
      tone="purple"
      title="Screens · app/"
      subtitle="Expo Router"
      lines={["Tabs: Home, Materials, AI Teacher, Info, Me", "Live session: Practice & Role Play"]}
    />
    <Box
      x={60}
      y={390}
      w={520}
      h={150}
      title="Components · components/"
      lines={["Topic cards, vocabulary rows, tab bar, today's plan"]}
    />
    <Box
      x={60}
      y={560}
      w={520}
      h={170}
      title="State · store/"
      subtitle="Zustand + AsyncStorage"
      lines={["Per-account progress, XP, topics done", "Device settings: app language"]}
    />
    <Box
      x={60}
      y={750}
      w={520}
      h={170}
      title="Helpers · lib/"
      lines={["i18n (English / 繁體中文), topic progress", "Stream call, audio mode, API client"]}
    />
    <Box
      x={60}
      y={940}
      w={520}
      h={130}
      tone="orange"
      title="Content · data/ · assets/"
      lines={["18 comic topics, 3 material units, vocabulary MP3s"]}
    />

    <ColumnLabel x={640} w={460} text="API · EAS Hosting" />
    <Box
      x={640}
      y={200}
      w={460}
      h={220}
      title="app/api/stream-token"
      subtitle="GET"
      lines={["Verifies the Clerk session", "Returns a short-lived Stream token"]}
    />
    <Box
      x={640}
      y={440}
      w={460}
      h={250}
      title="app/api/agent-session"
      subtitle="POST · DELETE"
      lines={[
        "Verifies the Clerk session",
        "Checks the call belongs to the caller",
        "Starts / stops the voice agent",
      ]}
    />
    <Box
      x={640}
      y={710}
      w={460}
      h={200}
      tone="dark"
      title="Server secrets stay here"
      lines={["Stream secret and agent URL never reach the phone"]}
    />

    <ColumnLabel x={1160} w={600} text="Voice agent · vision-agent/ (Python)" />
    <Box
      x={1160}
      y={200}
      w={600}
      h={150}
      tone="dark"
      title="main.py · ModeAwareLauncher"
      lines={["Picks the model per call: gpt-live-1 for Practice & Role Play"]}
    />
    <Box
      x={1160}
      y={370}
      w={600}
      h={150}
      title="roleplay.py · RoleplayController"
      lines={["Comic dialogue order, answer matching, corrections"]}
    />
    <Box
      x={1160}
      y={540}
      w={600}
      h={150}
      title="practice.py · ComicPractice"
      lines={["Listen → repeat → answer, hints and stars"]}
    />
    <Box
      x={1160}
      y={710}
      w={600}
      h={150}
      title="gpt_live.py · pronunciation.py"
      lines={["OpenAI Live WebSocket, Indonesian syllable guide"]}
    />
    <Box
      x={1160}
      y={880}
      w={600}
      h={190}
      tone="orange"
      title="External services"
      lines={["Clerk (auth) · Stream Video (calls)", "OpenAI (voice, captions, review) · PostHog"]}
    />
  </AbsoluteFill>
);
