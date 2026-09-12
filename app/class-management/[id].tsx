import { useAuth, useUser } from "@clerk/expo";
import { CHILD_AI_RELEASE_READY } from "@/constants/releaseSafety";
import { AIPilotNotice } from "@/components/AIPilotNotice";
import { Ionicons } from "@expo/vector-icons";
import {
  Call,
  StreamCall,
  StreamVideo,
  StreamVideoClient,
  useCallStateHooks,
} from "@stream-io/video-react-native-sdk";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { images } from "@/constants/images";
import { colors } from "@/constants/theme";
import { getClassTopic } from "@/data/classManagement";
import { ClassPracticeMode, resolveClassManagementPrompt } from "@/lib/classManagementPrompt";
import { apiUrl } from "@/lib/api";
import { posthog } from "@/lib/posthog";
import { useLanguageStore } from "@/store/languageStore";
import { useLearningStore } from "@/store/learningStore";
import { ClassDialogueTurn, ClassMgmtPhase } from "@/types/classManagement";

type CallStatus = "idle" | "connecting" | "joined" | "error";
type AgentStatus = "idle" | "connecting" | "connected" | "failed";

const AGENT_USER_ID = "ai-teacher";
const SCREEN_HEIGHT = Dimensions.get("window").height;
const COMIC_HEIGHT = Math.min(SCREEN_HEIGHT * 0.46, 420);

type PartialCaption = { speaker: "agent" | "user"; text: string };

export default function ClassManagementScreen() {
  return CHILD_AI_RELEASE_READY ? <LiveClassManagementScreen /> : <AIPilotNotice />;
}

function LiveClassManagementScreen() {
  const { id, mode } = useLocalSearchParams<{ id: string; mode?: string }>();
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const { tutorVoice, tutorEmotion } = useLanguageStore();
  const completeClassTopic = useLearningStore((s) => s.completeClassTopic);

  const topic = getClassTopic(id ?? "");
  const practiceMode: ClassPracticeMode = mode === "roleplay" ? "roleplay" : "teach";

  const [client, setClient] = useState<StreamVideoClient | null>(null);
  const [call, setCall] = useState<Call | null>(null);
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [agentStatus, setAgentStatus] = useState<AgentStatus>("idle");
  const [phase, setPhase] = useState<ClassMgmtPhase | "feedback">("intro");
  const [turnIndex, setTurnIndex] = useState(0);
  const [highlightPanel, setHighlightPanel] = useState(0);
  const [lastFeedbackCorrect, setLastFeedbackCorrect] = useState<boolean | null>(
    null,
  );

  const callRef = useRef<Call | null>(null);
  const clientRef = useRef<StreamVideoClient | null>(null);
  const agentSessionRef = useRef<string | null>(null);
  const sessionStartRef = useRef<number | null>(null);
  const completedRef = useRef(false);

  useEffect(() => {
    if (!isLoaded || !user || !topic) return;

    sessionStartRef.current = Date.now();
    completedRef.current = false;
    posthog.capture("class_topic_started", {
      topic_id: topic.id,
      tutor_voice: tutorVoice,
      practice_mode: practiceMode,
    });

    startCall();

    return () => {
      callRef.current?.leave().catch(console.error);
      clientRef.current?.disconnectUser().catch(console.error);
      stopAgentSession(callRef.current?.id ?? null, agentSessionRef.current);
    };
  }, [isLoaded, user, topic, tutorVoice, tutorEmotion, practiceMode]);

  async function startCall() {
    if (!user || !topic) return;
    setCallStatus("connecting");

    try {
      const clerkToken = await getToken();
      if (!clerkToken) throw new Error("Not authenticated");

      const res = await fetch(apiUrl("/api/stream-token"), {
        headers: { Authorization: `Bearer ${clerkToken}` },
      });
      if (!res.ok) throw new Error("Token fetch failed");
      const { token, apiKey } = await res.json();

      const streamClient = StreamVideoClient.getOrCreateInstance({
        apiKey,
        token,
        user: {
          id: user.id,
          name: user.fullName ?? user.id,
          image: user.imageUrl || undefined,
        },
      });

      const callId = `class-${topic.id}-${user.id}`;
      const streamCall = streamClient.call("default", callId);
      await streamCall.join({ create: true });

      try {
        await streamCall.microphone.disable();
      } catch {}

      const aiPrompt = resolveClassManagementPrompt(topic, tutorVoice, tutorEmotion, practiceMode);

      try {
        await streamCall.update({
          custom: {
            mode: "class_management",
            practice_mode: practiceMode,
            topic_id: topic.id,
            topic_title: topic.subtitle,
            language: "id",
            language_code: "id",
            instruction_languages: aiPrompt.instructionLanguages,
            tutor_emotion: tutorEmotion,
            class_turns: aiPrompt.classTurnsJson,
            comic_scope: aiPrompt.comicScope,
            allowed_phrases: aiPrompt.allowedPhrasesJson,
            system_prompt: aiPrompt.systemPrompt,
            intro_message: aiPrompt.introMessage,
          },
        });
      } catch (updateErr) {
        console.warn("[class-mgmt] call.update failed:", updateErr);
      }

      try {
        await streamCall.startClosedCaptions();
      } catch (e) {
        console.warn("[class-mgmt] startClosedCaptions failed:", e);
      }

      callRef.current = streamCall;
      clientRef.current = streamClient;
      setClient(streamClient);
      setCall(streamCall);
      setCallStatus("joined");
      startAgentSession(callId);
    } catch (err) {
      console.error("[class-mgmt] Stream call error:", err);
      setCallStatus("error");
    }
  }

  async function startAgentSession(callId: string) {
    setAgentStatus("connecting");
    try {
      const clerkToken = await getToken();
      if (!clerkToken) throw new Error("Not authenticated");
      const res = await fetch(apiUrl("/api/agent-session"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${clerkToken}`,
        },
        body: JSON.stringify({ callId, callType: "default" }),
      });
      if (res.ok) {
        const { session_id } = await res.json();
        agentSessionRef.current = session_id ?? null;
        setAgentStatus("connected");
      } else {
        setAgentStatus("failed");
      }
    } catch {
      setAgentStatus("failed");
    }
  }

  function stopAgentSession(callId: string | null, sessionId: string | null) {
    if (!callId || !sessionId) return;
    getToken()
      .then((clerkToken) => {
        if (!clerkToken) return;
        return fetch(
          apiUrl(
            `/api/agent-session?callId=${encodeURIComponent(callId)}&sessionId=${encodeURIComponent(sessionId)}`,
          ),
          { method: "DELETE", headers: { Authorization: `Bearer ${clerkToken}` } },
        );
      })
      .catch(() => {});
  }

  function handlePhaseUpdate(
    nextPhase: string,
    nextTurnIndex: number,
    panelIndex?: number,
    correct?: boolean,
  ) {
    console.log(
      "[class-mgmt] phase event:",
      JSON.stringify({ nextPhase, nextTurnIndex, panelIndex, correct }),
    );
    if (nextPhase === "intro") {
      setPhase("intro");
    } else if (
      nextPhase === "guru_speaking" ||
      nextPhase === "student_turn" ||
      nextPhase === "complete"
    ) {
      setPhase(nextPhase as ClassMgmtPhase);
      setTurnIndex(nextTurnIndex);
      if (typeof panelIndex === "number") {
        setHighlightPanel(panelIndex);
      }
    } else if (nextPhase === "feedback") {
      setPhase("feedback");
      if (typeof correct === "boolean") {
        setLastFeedbackCorrect(correct);
      }
    }

    if (nextPhase === "complete" && topic && !completedRef.current) {
      completedRef.current = true;
      completeClassTopic(topic.id, topic.xpReward);
      posthog.capture("class_topic_completed", {
        topic_id: topic.id,
        tutor_voice: tutorVoice,
      });
    }
  }

  async function handleLeave() {
    const callId = callRef.current?.id ?? null;
    const sessionId = agentSessionRef.current;
    try {
      await callRef.current?.leave();
      clientRef.current?.disconnectUser();
    } catch {}
    callRef.current = null;
    clientRef.current = null;
    agentSessionRef.current = null;
    stopAgentSession(callId, sessionId);
    router.back();
  }

  if (!topic) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View className="flex-1 items-center justify-center">
          <Text className="body-md text-text-secondary">Topik tidak ditemukan</Text>
        </View>
      </SafeAreaView>
    );
  }

  const displayStatus = getDisplayStatus(callStatus, agentStatus);
  const studentCanSpeak =
    agentStatus === "connected" &&
    (phase === "student_turn" ||
      (phase === "feedback" && lastFeedbackCorrect === false));

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleLeave} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {topic.subtitle}
          {practiceMode === "roleplay" ? " · Role Play" : ""}
        </Text>
        <TouchableOpacity style={styles.endCallButton} onPress={handleLeave}>
          <Ionicons
            name="call"
            size={18}
            color="#fff"
            style={{ transform: [{ rotate: "135deg" }] }}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.statusRow}>
        <View style={[styles.onlineDot, { backgroundColor: displayStatus.color }]} />
        <Text style={[styles.statusText, { color: displayStatus.color }]}>
          {displayStatus.label}
        </Text>
      </View>

      {callStatus === "joined" && client && call ? (
        <View style={styles.sessionRoot}>
          <StreamVideo client={client}>
            <StreamCall call={call}>
              <ActiveClassContent
              topic={topic}
              agentStatus={agentStatus}
              call={call}
              phase={phase}
              turnIndex={turnIndex}
              highlightPanel={highlightPanel}
              lastFeedbackCorrect={lastFeedbackCorrect}
              studentCanSpeak={studentCanSpeak}
              onPhaseUpdate={handlePhaseUpdate}
              onRetry={() => startAgentSession(call.id)}
            />
            </StreamCall>
          </StreamVideo>
        </View>
      ) : (
        <View className="flex-1 items-center justify-center px-8">
          {callStatus === "connecting" ? (
            <ActivityIndicator size="large" color={colors.primary.purple} />
          ) : (
            <Text className="body-md text-text-secondary text-center">
              Gagal terhubung. Coba lagi.
            </Text>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

function ActiveClassContent({
  topic,
  agentStatus,
  call,
  phase,
  turnIndex,
  highlightPanel,
  lastFeedbackCorrect,
  studentCanSpeak,
  onPhaseUpdate,
  onRetry,
}: {
  topic: NonNullable<ReturnType<typeof getClassTopic>>;
  agentStatus: AgentStatus;
  call: Call;
  phase: ClassMgmtPhase | "feedback";
  turnIndex: number;
  highlightPanel: number;
  lastFeedbackCorrect: boolean | null;
  studentCanSpeak: boolean;
  onPhaseUpdate: (
    phase: string,
    turnIndex: number,
    panelIndex?: number,
    correct?: boolean,
  ) => void;
  onRetry: () => void;
}) {
  const { useMicrophoneState, useCallClosedCaptions } = useCallStateHooks();
  const { microphone } = useMicrophoneState();
  const captions = useCallClosedCaptions();
  const [isHeld, setIsHeld] = useState(false);
  const [partial, setPartial] = useState<PartialCaption | null>(null);
  const partialTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!studentCanSpeak && isHeld) {
      setIsHeld(false);
      microphone.disable().catch(() => {});
    }
  }, [studentCanSpeak, isHeld, microphone]);

  useEffect(() => {
    interface StreamCustomEvent {
      custom?: {
        type?: string;
        phase?: string;
        turnIndex?: number;
        panelIndex?: number;
        correct?: boolean;
        text?: string;
        speaker?: string;
      };
    }

    const unsubscribe = call.on("custom", (event: StreamCustomEvent) => {
      const data = event?.custom ?? {};

      if (data.type === "class_mgmt_phase" && data.phase) {
        if (data.phase === "feedback") {
          onPhaseUpdate(
            "feedback",
            data.turnIndex ?? 0,
            undefined,
            data.correct,
          );
        } else {
          onPhaseUpdate(
            data.phase,
            data.turnIndex ?? 0,
            data.panelIndex,
          );
        }
        return;
      }

      if (data.type === "transcript_partial" && data.text) {
        setPartial({ speaker: data.speaker === "user" ? "user" : "agent", text: data.text });
        if (partialTimerRef.current) clearTimeout(partialTimerRef.current);
        partialTimerRef.current = setTimeout(() => setPartial(null), 3000);
      }
    });

    return () => {
      unsubscribe();
      if (partialTimerRef.current) clearTimeout(partialTimerRef.current);
    };
  }, [call, onPhaseUpdate]);

  useEffect(() => {
    if (captions.length > 0) {
      setPartial(null);
      if (partialTimerRef.current) clearTimeout(partialTimerRef.current);
    }
  }, [captions]);

  const currentTurn = topic.turns[turnIndex];
  const phaseHint = getPhaseHint(phase, currentTurn, lastFeedbackCorrect);
  const panelImage = getPanelImage(topic, phase, currentTurn);

  function handlePressIn() {
    if (!studentCanSpeak) return;
    setIsHeld(true);
    microphone.enable();
  }

  function handlePressOut() {
    setIsHeld(false);
    microphone.disable();
  }

  return (
    <View style={styles.activeRoot}>
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.comicContainer}>
          <Image
            source={panelImage}
            contentFit="contain"
            style={styles.comicImage}
          />
        </View>

        <View style={styles.panelCard}>
          <Text style={styles.panelLabel}>
            Panel {highlightPanel + 1} / {topic.turns.length * 2}
          </Text>
          {currentTurn ? (
            <>
              {phase === "student_turn" || phase === "feedback" ? (
                <Text style={styles.panelStudentActive}>
                  Jawab sebagai siswa: {currentTurn.studentLine.id}
                </Text>
              ) : null}
              <Text
                style={[
                  styles.panelGuru,
                  (phase === "student_turn" || phase === "feedback") &&
                    styles.panelGuruMuted,
                ]}
              >
                Guru: {currentTurn.guruLine.id}
              </Text>
              {phase !== "student_turn" && phase !== "feedback" ? (
                <Text style={styles.panelStudent}>
                  Siswa: {currentTurn.studentLine.id}
                </Text>
              ) : null}
            </>
          ) : null}
        </View>

        <View style={styles.hintCard}>
          {agentStatus === "failed" ? (
            <TouchableOpacity onPress={onRetry} style={styles.retryRow}>
              <Text style={styles.hintTitle}>Sari tidak tersedia</Text>
              <Text style={styles.hintBody}>Ketuk untuk coba lagi</Text>
            </TouchableOpacity>
          ) : (
            <>
              <Text style={styles.hintTitle}>{phaseHint.title}</Text>
              <Text style={styles.hintBody}>{phaseHint.body}</Text>
            </>
          )}
        </View>
      </ScrollView>

      <View style={styles.pushToTalkSection}>
        <View style={styles.pushToTalkContainer}>
          <Pressable
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={!studentCanSpeak}
            style={({ pressed }) => [
              styles.micButtonOuter,
              (pressed || isHeld) && studentCanSpeak && styles.micButtonOuterActive,
            ]}
          >
            <View
              style={[
                styles.micButton,
                isHeld && studentCanSpeak && styles.micButtonActive,
                !studentCanSpeak && styles.micButtonDisabled,
              ]}
            >
              <Ionicons
                name={isHeld ? "mic" : "mic-outline"}
                size={34}
                color={
                  isHeld
                    ? "#fff"
                    : studentCanSpeak
                      ? colors.neutral.textPrimary
                      : colors.neutral.textSecondary
                }
              />
            </View>
          </Pressable>
          <Text
            style={[
              styles.pushToTalkLabel,
              isHeld && { color: colors.primary.purple },
            ]}
          >
            {isHeld
              ? "Mendengarkan..."
              : studentCanSpeak
                ? "Tahan untuk jawab"
                : phase === "complete"
                  ? "Selesai!"
                  : "Tunggu Sari..."}
          </Text>
        </View>
      </View>
    </View>
  );
}

function getPanelImage(
  topic: NonNullable<ReturnType<typeof getClassTopic>>,
  phase: ClassMgmtPhase | "feedback",
  turn: ClassDialogueTurn | undefined,
) {
  if (phase === "guru_speaking" && turn) {
    return images[turn.guruImageKey];
  }
  if ((phase === "student_turn" || phase === "feedback") && turn) {
    return images[turn.studentImageKey];
  }
  return images[topic.imageKey];
}

function getPhaseHint(
  phase: ClassMgmtPhase | "feedback",
  turn: ClassDialogueTurn | undefined,
  lastFeedbackCorrect: boolean | null,
): { title: string; body: string } {
  switch (phase) {
    case "intro":
      return {
        title: "Sari memperkenalkan komik",
        body: "Dengarkan — kita hanya latih 3 dialog dari gambar ini.",
      };
    case "guru_speaking":
      return {
        title: "Dialog guru di gambar",
        body: turn
          ? `Dengarkan kalimat guru dari komik: "${turn.guruLine.id}"`
          : "Dengarkan kalimat guru dari komik.",
      };
    case "student_turn":
      return {
        title: "Giliranmu!",
        body: turn
          ? `Jawab persis seperti siswa di gambar: "${turn.studentLine.id}"`
          : "Tahan tombol mic dan jawab seperti di gambar.",
      };
    case "feedback":
      return {
        title: lastFeedbackCorrect ? "Benar!" : "Coba lagi",
        body: lastFeedbackCorrect
          ? "Jawabanmu tepat. Sari akan lanjut."
          : turn
            ? `Kamu perlu jawab sebagai SISWA: "${turn.studentLine.id}" — bukan ulangi kalimat guru.`
            : "Jawab sebagai siswa di gambar, bukan sebagai guru.",
      };
    case "complete":
      return {
        title: "Topik selesai!",
        body: "Kamu sudah menyelesaikan latihan Class Management.",
      };
    default:
      return { title: "Memuat...", body: "Menghubungkan ke Sari..." };
  }
}

function getDisplayStatus(
  callStatus: CallStatus,
  agentStatus: AgentStatus,
): { color: string; label: string } {
  if (callStatus === "joined") {
    const map: Record<AgentStatus, { color: string; label: string }> = {
      idle: { color: colors.neutral.textSecondary, label: "Menyiapkan..." },
      connecting: { color: colors.semantic.warning, label: "Sari bergabung..." },
      connected: { color: colors.semantic.success, label: "Online" },
      failed: { color: colors.semantic.error, label: "Sari tidak tersedia" },
    };
    return map[agentStatus];
  }
  return { color: colors.semantic.warning, label: "Menghubungkan..." };
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  sessionRoot: { flex: 1 },
  activeRoot: { flex: 1 },
  scrollArea: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },
  comicContainer: {
    height: COMIC_HEIGHT,
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#F9FAFB",
  },
  comicImage: {
    width: "100%",
    height: "100%",
  },
  panelCard: {
    backgroundColor: "#F5F3FF",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#DDD6FE",
  },
  transcriptCard: {
    backgroundColor: "#F4F2FF",
    borderRadius: 12,
    padding: 12,
    minHeight: 88,
    borderWidth: 1,
    borderColor: "#E9E5FF",
  },
  transcriptTitle: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 12,
    color: colors.primary.purple,
    marginBottom: 8,
  },
  transcriptEmpty: {
    fontFamily: "Poppins-Regular",
    fontSize: 13,
    color: colors.neutral.textSecondary,
    lineHeight: 20,
  },
  captionsContainer: {
    gap: 8,
  },
  captionBubble: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  captionBubbleTeacher: {
    backgroundColor: colors.primary.purple,
    alignSelf: "flex-start",
    maxWidth: "92%",
  },
  captionBubbleUser: {
    backgroundColor: "#fff",
    alignSelf: "flex-end",
    maxWidth: "92%",
    borderWidth: 1,
    borderColor: colors.neutral.border,
  },
  captionBubblePartial: {
    opacity: 0.9,
  },
  captionSpeaker: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 11,
    marginBottom: 2,
  },
  captionSpeakerTeacher: {
    color: "rgba(255,255,255,0.75)",
  },
  captionSpeakerUser: {
    color: colors.neutral.textSecondary,
  },
  captionText: {
    fontFamily: "Poppins-Regular",
    fontSize: 14,
    lineHeight: 20,
  },
  captionTextTeacher: {
    color: "#fff",
  },
  captionTextUser: {
    color: colors.neutral.textPrimary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 6,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontFamily: "Poppins-SemiBold",
    fontSize: 16,
    color: colors.neutral.textPrimary,
  },
  endCallButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E8453C",
    alignItems: "center",
    justifyContent: "center",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  onlineDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontFamily: "Poppins-Medium", fontSize: 12 },
  panelLabel: {
    fontFamily: "Poppins-Medium",
    fontSize: 11,
    color: colors.primary.purple,
    marginBottom: 6,
  },
  panelGuru: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 14,
    color: colors.neutral.textPrimary,
    marginBottom: 4,
  },
  panelGuruMuted: {
    fontFamily: "Poppins-Regular",
    fontSize: 12,
    color: colors.neutral.textSecondary,
    marginBottom: 8,
  },
  panelStudentActive: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 15,
    color: colors.primary.purple,
    marginBottom: 8,
  },
  panelStudent: {
    fontFamily: "Poppins-Regular",
    fontSize: 13,
    color: colors.neutral.textSecondary,
  },
  hintCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.neutral.border,
  },
  hintTitle: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 14,
    color: colors.neutral.textPrimary,
    marginBottom: 4,
  },
  hintBody: {
    fontFamily: "Poppins-Regular",
    fontSize: 13,
    color: colors.neutral.textSecondary,
    lineHeight: 20,
  },
  retryRow: { alignItems: "center" },
  pushToTalkSection: {
    flexShrink: 0,
    paddingVertical: 20,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: colors.neutral.border,
    backgroundColor: "#fff",
  },
  pushToTalkContainer: {
    alignItems: "center",
    gap: 14,
  },
  micButtonOuter: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 3,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  micButtonOuterActive: {
    borderColor: "#C4B5FD",
    backgroundColor: "#F5F3FF",
  },
  micButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.neutral.surface,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  micButtonActive: {
    backgroundColor: colors.primary.purple,
    shadowColor: colors.primary.purple,
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },
  micButtonDisabled: {
    opacity: 0.5,
  },
  pushToTalkLabel: {
    fontFamily: "Poppins-Medium",
    fontSize: 14,
    color: colors.neutral.textSecondary,
  },
});
