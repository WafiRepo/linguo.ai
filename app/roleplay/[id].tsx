import { useAuth, useUser } from "@clerk/expo";
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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

import { AIPilotNotice } from "@/components/AIPilotNotice";
import { CHILD_AI_RELEASE_READY } from "@/constants/releaseSafety";
import { images } from "@/constants/images";
import { colors } from "@/constants/theme";
import { getClassTopic } from "@/data/classManagement";
import { apiUrl } from "@/lib/api";
import {
  comicCallCustomData,
  comicTeacherName,
  comicTopicToScenario,
} from "@/lib/comicRoleplay";
import { getInstructionLanguages } from "@/lib/instructionLanguage";
import { posthog } from "@/lib/posthog";
import { useLanguageStore } from "@/store/languageStore";
import { useLearningStore } from "@/store/learningStore";
import { ClassManagementTopic } from "@/types/classManagement";
import {
  RoleplayCorrection,
  RoleplayFeedback,
  RoleplayScenario,
} from "@/types/roleplay";
import { Translate, useT } from "@/lib/i18n";

type CallStatus = "idle" | "connecting" | "joined" | "error";
type AgentStatus = "idle" | "connecting" | "connected" | "failed";
type ComicPhase = "guru" | "student";
type ComicCorrection = {
  turnIndex: number;
  said: string;
  step?: string;
  attempt?: number;
};
// Latihan steps sent by the server: listen → repeat → answer-intro → answer.
type PracticeStep = "listen" | "repeat" | "answer-intro" | "answer" | "done";

const COMIC_HEIGHT = Math.min(Dimensions.get("window").height * 0.3, 280);
// Latihan also shows step chips and the line card, so its comic is smaller.
const PRACTICE_COMIC_HEIGHT = Math.min(Dimensions.get("window").height * 0.22, 200);

function parseFeedback(data: {
  praise?: unknown;
  corrections?: unknown;
}): RoleplayFeedback | null {
  if (typeof data.praise !== "string" || !Array.isArray(data.corrections)) {
    return null;
  }
  const corrections = data.corrections.filter(
    (item): item is RoleplayCorrection =>
      typeof item?.said === "string" && typeof item?.better === "string",
  );
  return { praise: data.praise, corrections };
}

export default function RoleplayScreen() {
  return CHILD_AI_RELEASE_READY ? <LiveRoleplayScreen /> : <AIPilotNotice />;
}

function LiveRoleplayScreen() {
  const { id, kind, mode } = useLocalSearchParams<{
    id: string;
    kind?: string;
    mode?: string;
  }>();
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const { t } = useT();
  const { tutorVoice, tutorEmotion } = useLanguageStore();
  const completeClassTopic = useLearningStore((s) => s.completeClassTopic);

  // AI Teacher's comic topics, acted out live: Role Play, or with
  // mode=practice the Latihan (listen → repeat → answer).
  const comic = kind === "comic" ? getClassTopic(id ?? "") : undefined;
  const isPractice = !!comic && mode === "practice";
  const scenario = useMemo(
    () => (comic ? comicTopicToScenario(comic, isPractice) : undefined),
    [comic, isPractice],
  );
  const [practiceStep, setPracticeStep] = useState<PracticeStep>("listen");
  const [stars, setStars] = useState<number[]>([]);
  const [comicPhase, setComicPhase] = useState<ComicPhase>("guru");
  const [correction, setCorrection] = useState<ComicCorrection | null>(null);

  const [client, setClient] = useState<StreamVideoClient | null>(null);
  const [call, setCall] = useState<Call | null>(null);
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [agentStatus, setAgentStatus] = useState<AgentStatus>("idle");
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<RoleplayFeedback | null>(null);
  const [reviewing, setReviewing] = useState(false);

  const callRef = useRef<Call | null>(null);
  const clientRef = useRef<StreamVideoClient | null>(null);
  const agentSessionRef = useRef<string | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const rewardedRef = useRef(false);
  const studentSpokeRef = useRef(false);

  const missionComplete =
    !!scenario && completedIds.length === scenario.objectives.length;

  useEffect(() => {
    if (!isLoaded || !user || !scenario) return;

    startTimeRef.current = Date.now();
    rewardedRef.current = false;
    studentSpokeRef.current = false;
    setCompletedIds([]);
    setFeedback(null);
    setReviewing(false);
    setComicPhase("guru");
    setCorrection(null);
    setPracticeStep("listen");
    setStars([]);
    posthog.capture("roleplay_started", {
      scenario_id: scenario.id,
      kind: isPractice ? "comic_practice" : "comic",
      tutor_voice: tutorVoice,
    });

    startCall();

    return () => {
      callRef.current?.leave().catch(console.error);
      clientRef.current?.disconnectUser().catch(console.error);
      stopAgentSession(callRef.current?.id ?? null, agentSessionRef.current);
    };
  }, [isLoaded, user, scenario, comic, isPractice, tutorVoice, tutorEmotion]);

  useEffect(() => {
    if (!missionComplete || !comic || rewardedRef.current) return;
    rewardedRef.current = true;
    completeClassTopic(comic.id, isPractice ? "practice" : "roleplay", comic.xpReward);
    posthog.capture("roleplay_completed", {
      scenario_id: comic.id,
      duration_seconds: startTimeRef.current
        ? Math.floor((Date.now() - startTimeRef.current) / 1000)
        : 0,
    });
  }, [missionComplete, comic, isPractice, completeClassTopic]);

  async function startCall() {
    if (!user || !comic) return;
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

      const callId = `roleplay-${isPractice ? "practice" : "comic"}-${comic.id}-${user.id}`;
      const streamCall = streamClient.call("default", callId);
      await streamCall.join({ create: true });

      // Stays off until the AI has joined, then opens for the whole conversation.
      try {
        await streamCall.microphone.disable();
      } catch {}

      // The server builds the prompt itself from these fields — no system_prompt is sent.
      try {
        const common = {
          language: "id",
          language_code: "id",
          instruction_languages: getInstructionLanguages("id", tutorVoice),
          tutor_emotion: tutorEmotion,
        };
        await streamCall.update({
          custom: { ...common, ...comicCallCustomData(comic, isPractice) },
        });
      } catch (updateErr) {
        console.warn("[roleplay] call.update failed:", updateErr);
      }

      // No Stream closed captions here: the transcript comes from the AI
      // model itself (what it heard and said), which is more accurate for
      // Indonesian than a generic caption service.
      callRef.current = streamCall;
      clientRef.current = streamClient;
      setClient(streamClient);
      setCall(streamCall);
      setCallStatus("joined");
      startAgentSession(callId);
    } catch (err) {
      console.error("[roleplay] Stream call error:", err);
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
        console.error("[roleplay] agent-session failed:", res.status);
        setAgentStatus("failed");
      }
    } catch (err) {
      console.error("[roleplay] agent-session network error:", err);
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

  const handleObjectiveDone = useCallback(
    (objectiveId: string) => {
      setCompletedIds((prev) =>
        prev.includes(objectiveId) ? prev : [...prev, objectiveId],
      );
      // Next comic dialogue: Bu Guru speaks first.
      setComicPhase("guru");
      setCorrection(null);
      posthog.capture("roleplay_objective_completed", {
        scenario_id: scenario?.id ?? null,
        objective_id: objectiveId,
      });
    },
    [scenario?.id],
  );

  const handleStudentTurn = useCallback(() => {
    studentSpokeRef.current = true;
  }, []);

  const handleAgentTurn = useCallback(() => {
    setComicPhase("student");
  }, []);

  const handleCorrection = useCallback(
    (next: ComicCorrection) => {
      setCorrection(next);
      posthog.capture("roleplay_correction_shown", {
        scenario_id: scenario?.id ?? null,
        turn_index: next.turnIndex,
      });
    },
    [scenario?.id],
  );

  const handlePracticeStep = useCallback((step: PracticeStep) => {
    setPracticeStep(step);
    // A new step starts clean; its own mistakes bring a new card.
    setCorrection(null);
  }, []);

  const handlePracticeResult = useCallback((turnIndex: number, value: number) => {
    setStars((prev) => {
      const next = [...prev];
      next[turnIndex] = value;
      return next;
    });
  }, []);

  async function handleLeave() {
    posthog.capture("roleplay_left", {
      scenario_id: scenario?.id ?? id,
      objectives_done: completedIds.length,
      duration_seconds: startTimeRef.current
        ? Math.floor((Date.now() - startTimeRef.current) / 1000)
        : 0,
    });
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

    if (!studentSpokeRef.current) {
      router.back();
      return;
    }
    posthog.capture("roleplay_review_shown", {
      scenario_id: scenario?.id ?? id,
      has_feedback: feedback !== null,
      corrections: feedback?.corrections.length ?? 0,
    });
    setReviewing(true);
  }

  if (!scenario || !comic) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View className="flex-1 items-center justify-center">
          <Text className="body-md text-text-secondary">{t("roleplay.notFound")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (reviewing) {
    return (
      <RoleplayReview
        scenario={scenario}
        completedIds={completedIds}
        feedback={feedback}
        stars={isPractice ? stars : undefined}
        onDone={() => router.back()}
      />
    );
  }

  const practiceCanSpeak = practiceStep === "repeat" || practiceStep === "answer";

  const displayStatus = getDisplayStatus(callStatus, agentStatus, scenario.aiName, t);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View className="flex-row items-center px-5 pt-2 pb-1.5">
        <TouchableOpacity onPress={handleLeave} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral.textPrimary} />
        </TouchableOpacity>
        <Text
          className="flex-1 text-center font-poppins-semibold text-base text-text-primary"
          numberOfLines={1}
        >
          {scenario.title} · {t(isPractice ? "mode.practice" : "mode.roleplay")}
        </Text>
        <TouchableOpacity
          className="w-9 h-9 rounded-full bg-[#E8453C] items-center justify-center"
          onPress={handleLeave}
          hitSlop={8}
        >
          <Ionicons name="call" size={18} color="#fff" style={styles.hangUpIcon} />
        </TouchableOpacity>
      </View>

      <View className="flex-row items-center gap-1.5 px-5 pb-2">
        <View className="w-2 h-2 rounded-full" style={{ backgroundColor: displayStatus.color }} />
        <Text className="font-poppins-medium text-xs" style={{ color: displayStatus.color }}>
          {displayStatus.label}
        </Text>
      </View>

      {isPractice ? (
        <PracticePanel
          topic={comic}
          turnIndex={completedIds.length}
          step={practiceStep}
          stars={stars}
        />
      ) : (
        <ComicPanel topic={comic} turnIndex={completedIds.length} phase={comicPhase} />
      )}
      {correction && correction.turnIndex === completedIds.length ? (
        <CorrectionCard
          said={correction.said}
          expected={comic.turns[correction.turnIndex]?.studentLine.id ?? ""}
          translation={comic.turns[correction.turnIndex]?.studentLine.zhTW ?? ""}
          reveal={correctionReveal(correction)}
        />
      ) : null}

      {callStatus === "joined" && client && call ? (
        <StreamVideo client={client}>
          <StreamCall call={call}>
            <ActiveRoleplayContent
              scenario={scenario}
              agentStatus={agentStatus}
              call={call}
              missionComplete={missionComplete}
              onObjectiveDone={handleObjectiveDone}
              onStudentTurn={handleStudentTurn}
              onAgentTurn={handleAgentTurn}
              onCorrection={handleCorrection}
              onFeedback={setFeedback}
              onPracticeStep={handlePracticeStep}
              onPracticeResult={handlePracticeResult}
              practice={isPractice}
              canSpeak={!isPractice || practiceCanSpeak}
              onRetry={() => startAgentSession(call.id)}
              onFinish={handleLeave}
            />
          </StreamCall>
        </StreamVideo>
      ) : (
        <View className="flex-1 items-center justify-center px-8">
          {callStatus === "error" ? (
            <TouchableOpacity onPress={startCall} className="items-center">
              <Text className="font-poppins-semibold text-sm text-text-primary">{t("roleplay.connectFailed")}</Text>
              <Text className="font-poppins text-[13px] text-text-secondary mt-1">{t("roleplay.tapRetry")}</Text>
            </TouchableOpacity>
          ) : (
            <ActivityIndicator size="large" color={colors.primary.purple} />
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

function MissionCard({
  scenario,
  completedIds,
}: {
  scenario: RoleplayScenario;
  completedIds: string[];
}) {
  const { t } = useT();
  return (
    <View
      className="mx-4 mb-3 rounded-[20px] p-4"
      style={{ backgroundColor: scenario.accentColor }}
    >
      <View className="flex-row items-center mb-3">
        <View className="w-11 h-11 rounded-full bg-white items-center justify-center mr-3">
          <Text className="text-xl">{scenario.emoji}</Text>
        </View>
        <View className="flex-1">
          <Text className="font-poppins-semibold text-sm text-text-primary">
            {t("roleplay.mission")}
          </Text>
          <Text className="font-poppins text-xs text-text-secondary" numberOfLines={1}>
            {t("roleplay.missionBody", { name: scenario.aiName })}
          </Text>
        </View>
        <Text className="font-poppins-semibold text-[13px] text-lingua-purple">
          {completedIds.length}/{scenario.objectives.length}
        </Text>
      </View>

      <View className="flex-row flex-wrap gap-2">
        {scenario.objectives.map((objective, index) => {
          const done = completedIds.includes(objective.id);
          return (
            <View
              key={objective.id}
              className={`flex-row items-center rounded-full px-3 py-1.5 ${done ? "bg-lingua-green" : "bg-white"}`}
            >
              <Ionicons
                name={done ? "checkmark-circle" : "ellipse-outline"}
                size={14}
                color={done ? "#fff" : colors.neutral.textSecondary}
              />
              <Text
                className={`font-poppins-medium text-xs ml-1 ${done ? "text-white" : "text-text-primary"}`}
              >
                {t("roleplay.dialogueN", { n: index + 1 })}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function ComicPanel({
  topic,
  turnIndex,
  phase,
}: {
  topic: ClassManagementTopic;
  turnIndex: number;
  phase: ComicPhase;
}) {
  const total = topic.turns.length;
  const turn = topic.turns[turnIndex];
  const lastTurn = topic.turns[total - 1];
  const image = turn
    ? images[phase === "guru" ? turn.guruImageKey : turn.studentImageKey]
    : images[lastTurn?.studentImageKey ?? topic.imageKey];
  const { t } = useT();

  return (
    <View className="mx-4 mb-3">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="font-poppins-semibold text-[13px] text-lingua-purple">
          {t("roleplay.dialogueProgress", { n: turn ? turnIndex + 1 : total, total })}
        </Text>
        <Text className="font-poppins text-xs text-text-secondary">
          {!turn
            ? t("roleplay.allDone")
            : phase === "guru"
              ? t("roleplay.listenTo", { name: comicTeacherName(topic) })
              : t("roleplay.yourTurn")}
        </Text>
      </View>
      <View
        className="rounded-2xl overflow-hidden bg-surface"
        style={{ height: COMIC_HEIGHT }}
      >
        <Image source={image} contentFit="contain" style={styles.comicImage} />
      </View>
      {turn && phase === "student" ? (
        <Text className="font-poppins-semibold text-sm text-lingua-purple mt-2">
          {t("roleplay.student")}{turn.studentLine.id}
        </Text>
      ) : null}
    </View>
  );
}

function normalizeWord(word: string): string {
  return word.toLowerCase().replace(/[.,!?;:"'()]/g, "");
}

type Reveal = "full" | "first-word" | "none";

// Latihan's answer-from-memory step reveals the line gradually: a nudge,
// then the first word, then (on the third miss Bu Guru models it anyway).
function correctionReveal(correction: ComicCorrection): Reveal {
  if (correction.step !== "answer") return "full";
  if ((correction.attempt ?? 1) <= 1) return "none";
  return "first-word";
}

// Highlights the words of the comic line the student left out or got wrong.
function CorrectionCard({
  said,
  expected,
  translation,
  reveal = "full",
}: {
  said: string;
  expected: string;
  translation: string;
  reveal?: Reveal;
}) {
  const { t } = useT();
  const saidWords = new Set(said.split(/\s+/).map(normalizeWord));
  const parts = expected.split(/(\s+)/);

  return (
    <View className="mx-4 mb-3 rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] p-3">
      <Text className="font-poppins-semibold text-[13px] text-text-primary mb-1">
        {t("roleplay.tryAgain")}
      </Text>
      <Text className="font-poppins text-xs text-text-secondary">
        {t("roleplay.youSaid")}<Text className="text-text-primary">{said}</Text>
      </Text>
      {reveal === "none" ? (
        <Text className="font-poppins text-[13px] text-text-secondary mt-1">
          {t("roleplay.thinkAgain")}
        </Text>
      ) : reveal === "first-word" ? (
        <Text className="font-poppins text-[13px] text-text-secondary mt-1">
          {t("roleplay.hint")}
          <Text className="font-poppins-semibold text-[15px] text-text-primary">
            {expected.split(/\s+/)[0]} …
          </Text>
        </Text>
      ) : (
        <>
          <Text className="font-poppins text-xs text-text-secondary mt-1">{t("roleplay.correctLine")}</Text>
          <Text className="font-poppins-semibold text-[15px] text-text-primary">
            {parts.map((part, index) => {
              const word = normalizeWord(part);
              const missed = word.length > 0 && !saidWords.has(word);
              return (
                <Text
                  key={index}
                  className={missed ? "bg-[#FDE68A] text-[#92400E]" : undefined}
                >
                  {part}
                </Text>
              );
            })}
          </Text>
          {translation ? (
            <Text className="font-poppins text-xs text-text-secondary mt-1">{translation}</Text>
          ) : null}
        </>
      )}
    </View>
  );
}

const PRACTICE_STEPS: ("listen" | "repeat" | "answer")[] = ["listen", "repeat", "answer"];

function PracticePanel({
  topic,
  turnIndex,
  step,
  stars,
}: {
  topic: ClassManagementTopic;
  turnIndex: number;
  step: PracticeStep;
  stars: number[];
}) {
  const total = topic.turns.length;
  const turn = topic.turns[turnIndex];
  const lastTurn = topic.turns[total - 1];
  const activeStep = step === "answer-intro" ? "answer" : step;
  const hideStudentLine = step === "answer-intro" || step === "answer";
  const image = turn
    ? images[step === "repeat" ? turn.studentImageKey : turn.guruImageKey]
    : images[lastTurn?.studentImageKey ?? topic.imageKey];
  const { t } = useT();

  return (
    <View className="mx-4 mb-3">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="font-poppins-semibold text-[13px] text-lingua-purple">
          {turn
            ? t("roleplay.dialogueProgress", { n: turnIndex + 1, total })
            : t("roleplay.allDone")}
        </Text>
        <Text className="text-xs">
          {stars.map((value) => "⭐".repeat(value)).join("  ")}
        </Text>
      </View>

      {turn ? (
        <View className="flex-row gap-2 mb-2">
          {PRACTICE_STEPS.map((item) => (
            <View
              key={item}
              className={`rounded-full px-3 py-1 ${activeStep === item ? "bg-lingua-purple" : "bg-surface"}`}
            >
              <Text
                className={`font-poppins-medium text-xs ${activeStep === item ? "text-white" : "text-text-secondary"}`}
              >
                {t(`practice.step.${item}`)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <View
        className="rounded-2xl overflow-hidden bg-surface"
        style={{ height: PRACTICE_COMIC_HEIGHT }}
      >
        <Image source={image} contentFit="contain" style={styles.comicImage} />
      </View>

      {turn ? (
        <View className="mt-2 rounded-2xl bg-[#F5F3FF] px-3 py-2">
          <Text className="font-poppins text-xs text-text-secondary">
            {comicTeacherName(topic)}: {turn.guruLine.id}
          </Text>
          {hideStudentLine ? (
            <Text className="font-poppins-semibold text-sm text-lingua-purple">
              {t("roleplay.student")}{t("roleplay.fromMemory")}
            </Text>
          ) : (
            <>
              <Text className="font-poppins-semibold text-sm text-lingua-purple">
                {t("roleplay.student")}{turn.studentLine.id}
              </Text>
              <Text className="font-poppins text-xs text-text-secondary">
                {turn.studentLine.zhTW}
              </Text>
            </>
          )}
        </View>
      ) : null}
    </View>
  );
}

type Speaker = "agent" | "user";
type TranscriptMessage = { id: number; speaker: Speaker; text: string };

interface RoleplayCustomEvent {
  custom?: {
    type?: string;
    speaker?: Speaker;
    text?: string;
    objectiveId?: string;
    turnIndex?: number;
    said?: string;
    step?: string;
    attempt?: number;
    stars?: number;
    praise?: unknown;
    corrections?: unknown;
  };
}

function ActiveRoleplayContent({
  scenario,
  agentStatus,
  call,
  missionComplete,
  onObjectiveDone,
  onStudentTurn,
  onAgentTurn,
  onCorrection,
  onFeedback,
  onPracticeStep,
  onPracticeResult,
  practice,
  canSpeak,
  onRetry,
  onFinish,
}: {
  scenario: RoleplayScenario;
  agentStatus: AgentStatus;
  call: Call;
  missionComplete: boolean;
  onObjectiveDone: (objectiveId: string) => void;
  onStudentTurn: () => void;
  onAgentTurn: () => void;
  onCorrection: (correction: ComicCorrection) => void;
  onFeedback: (feedback: RoleplayFeedback) => void;
  onPracticeStep: (step: PracticeStep) => void;
  onPracticeResult: (turnIndex: number, stars: number) => void;
  /** Latihan: tap to talk, only when it's the student's step. */
  practice: boolean;
  canSpeak: boolean;
  onRetry: () => void;
  onFinish: () => void;
}) {
  const { t } = useT();
  const { useMicrophoneState } = useCallStateHooks();
  const { microphone, optimisticIsMute } = useMicrophoneState({
    optimisticUpdates: true,
  });
  const [messages, setMessages] = useState<TranscriptMessage[]>([]);
  const [partials, setPartials] = useState<Partial<Record<Speaker, string>>>({});
  const [showHints, setShowHints] = useState(false);
  const nextMessageIdRef = useRef(0);
  // Latest in-progress student words, and the bubble they were placed in
  // when Bu Guru replied before they were final.
  const userPartialRef = useRef("");
  const userDraftIdRef = useRef<number | null>(null);
  const micAutoStartedRef = useRef(false);
  const scrollRef = useRef<ScrollView | null>(null);

  const isReady = agentStatus === "connected";
  const micOn = isReady && !optimisticIsMute;

  // Open mic for the whole session. Toggling it per answer (tap-to-talk)
  // re-published the audio track and the agent lost the student's audio, so
  // in Latihan the server decides when the AI listens instead.
  useEffect(() => {
    if (!isReady || micAutoStartedRef.current) return;
    micAutoStartedRef.current = true;
    microphone.enable().catch((e) => console.warn("[roleplay] mic enable failed:", e));
  }, [isReady, microphone]);

  useEffect(() => {
    const unsubscribe = call.on("custom", (event: RoleplayCustomEvent) => {
      const data = event?.custom ?? {};

      if (data.type === "roleplay_objective" && data.objectiveId) {
        onObjectiveDone(data.objectiveId);
        return;
      }

      if (
        data.type === "roleplay_correction" &&
        typeof data.turnIndex === "number" &&
        data.said
      ) {
        onCorrection({
          turnIndex: data.turnIndex,
          said: data.said,
          step: data.step,
          attempt: data.attempt,
        });
        return;
      }

      if (data.type === "practice_step" && data.step) {
        onPracticeStep(data.step as PracticeStep);
        return;
      }

      if (
        data.type === "practice_result" &&
        typeof data.turnIndex === "number" &&
        typeof data.stars === "number"
      ) {
        onPracticeResult(data.turnIndex, data.stars);
        return;
      }

      if (data.type === "roleplay_feedback") {
        const parsed = parseFeedback(data);
        if (parsed) onFeedback(parsed);
        return;
      }

      const speaker: Speaker = data.speaker === "user" ? "user" : "agent";

      if (data.type === "transcript_partial" && data.text) {
        const text = data.text;
        if (speaker === "user") userPartialRef.current = text;
        setPartials((prev) => ({ ...prev, [speaker]: text }));
        return;
      }

      if (data.type === "transcript_final" && data.text) {
        const text = data.text;
        setPartials((prev) => ({ ...prev, [speaker]: undefined }));

        if (speaker === "user") {
          userPartialRef.current = "";
          const draftId = userDraftIdRef.current;
          userDraftIdRef.current = null;
          if (draftId !== null) {
            // Already shown ahead of Bu Guru's reply; swap in the final words.
            setMessages((prev) =>
              prev.map((message) => (message.id === draftId ? { ...message, text } : message)),
            );
            onStudentTurn();
            return;
          }
        } else if (userPartialRef.current) {
          // Bu Guru often replies before the student's words are final (they
          // settle ~1.6 s after they stop), so place the student's bubble first.
          const draft = userPartialRef.current;
          userPartialRef.current = "";
          setPartials((prev) => ({ ...prev, user: undefined }));
          nextMessageIdRef.current += 1;
          const draftId = nextMessageIdRef.current;
          userDraftIdRef.current = draftId;
          setMessages((prev) => [...prev, { id: draftId, speaker: "user", text: draft }]);
        }

        // A pause splits one turn into several finals; keep it as one bubble.
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.speaker === speaker) {
            return [...prev.slice(0, -1), { ...last, text: `${last.text} ${text}` }];
          }
          nextMessageIdRef.current += 1;
          return [...prev, { id: nextMessageIdRef.current, speaker, text }];
        });
        if (speaker === "user") onStudentTurn();
        else onAgentTurn();
      }
    });

    return unsubscribe;
  }, [
    call,
    onObjectiveDone,
    onStudentTurn,
    onAgentTurn,
    onCorrection,
    onFeedback,
    onPracticeStep,
    onPracticeResult,
  ]);

  function handleToggleMic() {
    if (!isReady) return;
    microphone.toggle().catch((e) => console.warn("[roleplay] mic toggle failed:", e));
  }

  function handleToggleHints() {
    if (!showHints) {
      posthog.capture("roleplay_hints_opened", { scenario_id: scenario.id });
    }
    setShowHints((prev) => !prev);
  }

  const hasTranscript =
    messages.length > 0 || Boolean(partials.agent) || Boolean(partials.user);

  return (
    <View className="flex-1">
      <ScrollView
        ref={scrollRef}
        className="flex-1 mx-4 rounded-3xl bg-[#F4F2FF]"
        contentContainerStyle={styles.transcriptContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {missionComplete ? (
          <View className="flex-row items-center bg-white rounded-2xl p-3 mb-2 border border-lingua-green">
            <Text className="text-2xl mr-2">🎉</Text>
            <View className="flex-1">
              <Text className="font-poppins-semibold text-sm text-text-primary">
                {t("roleplay.missionDone", { xp: scenario.xpReward })}
              </Text>
              <Text className="font-poppins text-xs text-text-secondary">
                {t("roleplay.keepTalking")}
              </Text>
            </View>
            <TouchableOpacity
              className="bg-lingua-green rounded-xl px-3 py-2"
              activeOpacity={0.85}
              onPress={onFinish}
            >
              <Text className="font-poppins-semibold text-xs text-white">{t("roleplay.end")}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {hasTranscript ? (
          <>
            {messages.map((message) => (
              <CaptionBubble
                key={message.id}
                isAgent={message.speaker === "agent"}
                speakerName={message.speaker === "agent" ? scenario.aiName : t("roleplay.you")}
                text={message.text}
              />
            ))}
            {(["user", "agent"] as const).map((speaker) =>
              partials[speaker] ? (
                <CaptionBubble
                  key={`partial-${speaker}`}
                  isAgent={speaker === "agent"}
                  speakerName={speaker === "agent" ? scenario.aiName : t("roleplay.you")}
                  text={partials[speaker] ?? ""}
                  isPartial
                />
              ) : null,
            )}
          </>
        ) : (
          <View className="flex-1 items-center justify-center py-10">
            <Text className="text-5xl mb-3">{scenario.emoji}</Text>
            {agentStatus === "failed" ? (
              <TouchableOpacity onPress={onRetry} className="items-center">
                <Text className="font-poppins-semibold text-sm text-text-primary">
                  {t("roleplay.cantJoin", { name: scenario.aiName })}
                </Text>
                <Text className="font-poppins text-[13px] text-lingua-purple mt-1">
                  {t("roleplay.tapRetry")}
                </Text>
              </TouchableOpacity>
            ) : (
              <>
                <Text className="font-poppins-semibold text-sm text-text-primary">
                  {isReady
                    ? t("roleplay.aboutToSpeak", { name: scenario.aiName })
                    : t("roleplay.joining", { name: scenario.aiName })}
                </Text>
                <Text className="font-poppins text-[13px] text-text-secondary mt-1 text-center">
                  {t("roleplay.noHold")}
                </Text>
              </>
            )}
          </View>
        )}
      </ScrollView>

      {showHints ? (
        <View className="mx-4 mt-3 rounded-2xl bg-white border border-border p-3">
          <Text className="font-poppins-semibold text-xs text-text-secondary mb-2">
            {t("roleplay.youCanSay")}
          </Text>
          {scenario.hints.map((hint, index) => (
            <View key={`${index}-${hint.text}`} className="mb-1.5">
              <Text className="font-poppins-semibold text-sm text-text-primary">
                {hint.text}
              </Text>
              <Text className="font-poppins text-xs text-text-secondary">
                {hint.translation}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <View className="flex-row items-center justify-between px-8 pt-4 pb-6">
        <TouchableOpacity
          className={`w-14 h-14 rounded-full items-center justify-center ${showHints ? "bg-lingua-purple" : "bg-surface"}`}
          activeOpacity={0.8}
          onPress={handleToggleHints}
          testID="roleplay-hints-button"
        >
          <Ionicons
            name="bulb-outline"
            size={24}
            color={showHints ? "#fff" : colors.neutral.textPrimary}
          />
        </TouchableOpacity>

        <View className="items-center">
          <Pressable
            onPress={handleToggleMic}
            disabled={!isReady}
            testID="roleplay-mic-button"
            style={({ pressed }) => [
              styles.micButton,
              micOn ? styles.micButtonOn : styles.micButtonOff,
              !isReady && styles.micButtonDisabled,
              pressed && styles.micButtonPressed,
            ]}
          >
            {agentStatus === "connecting" ? (
              <ActivityIndicator size="small" color={colors.primary.purple} />
            ) : (
              <Ionicons
                name={micOn ? "mic" : "mic-off"}
                size={32}
                color={micOn ? "#fff" : colors.neutral.textPrimary}
              />
            )}
          </Pressable>
          <Text
            className={`font-poppins-medium text-[13px] mt-2 ${micOn ? "text-lingua-purple" : "text-text-secondary"}`}
          >
            {micLabel(practice, canSpeak, isReady, micOn, scenario.aiName, t)}
          </Text>
        </View>

        <View className="w-14 h-14" />
      </View>
    </View>
  );
}

function CaptionBubble({
  isAgent,
  speakerName,
  text,
  isPartial = false,
}: {
  isAgent: boolean;
  speakerName: string;
  text: string;
  isPartial?: boolean;
}) {
  return (
    <View
      className={`rounded-2xl px-3.5 py-2.5 mb-2 max-w-[88%] ${isAgent ? "bg-lingua-purple self-start" : "bg-white self-end"} ${isPartial ? "opacity-85" : ""}`}
    >
      <Text
        className={`font-poppins-semibold text-[11px] mb-0.5 ${isAgent ? "text-white/75" : "text-text-secondary"}`}
      >
        {speakerName}
      </Text>
      <Text
        className={`font-poppins text-sm leading-5 ${isAgent ? "text-white" : "text-text-primary"}`}
      >
        {text}
      </Text>
    </View>
  );
}

function RoleplayReview({
  scenario,
  completedIds,
  feedback,
  stars,
  onDone,
}: {
  scenario: RoleplayScenario;
  completedIds: string[];
  feedback: RoleplayFeedback | null;
  /** Latihan only: stars earned per dialogue. */
  stars?: number[];
  onDone: () => void;
}) {
  const { t } = useT();
  const missionComplete = completedIds.length === scenario.objectives.length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View className="flex-row items-center px-5 pt-2 pb-3">
        <View className="w-9" />
        <Text className="flex-1 text-center font-poppins-semibold text-base text-text-primary">
          {t("roleplay.review")}
        </Text>
        <TouchableOpacity onPress={onDone} hitSlop={8} className="w-9 items-end">
          <Ionicons name="close" size={24} color={colors.neutral.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={styles.reviewContent}
        showsVerticalScrollIndicator={false}
      >
        <MissionCard scenario={scenario} completedIds={completedIds} />

        {stars && stars.length > 0 ? (
          <View className="mx-4 mb-4 rounded-2xl bg-[#FFF7E0] p-3">
            {stars.map((value, index) => (
              <View key={index} className="flex-row items-center justify-between py-0.5">
                <Text className="font-poppins-medium text-[13px] text-text-primary">
                  {t("roleplay.dialogueN", { n: index + 1 })}
                </Text>
                <Text className="text-sm">
                  {"⭐".repeat(value)}
                  {"☆".repeat(3 - value)}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        <View className="mx-4 mb-4 flex-row items-center rounded-2xl bg-surface p-3">
          <Text className="text-2xl mr-2">{missionComplete ? "🏆" : "💪"}</Text>
          <Text className="flex-1 font-poppins-medium text-[13px] text-text-primary">
            {missionComplete
              ? t("roleplay.allMissionsDone", { xp: scenario.xpReward })
              : t("roleplay.missionsLeft")}
          </Text>
        </View>

        {feedback ? (
          <View className="mx-4">
            {feedback.praise ? (
              <View className="rounded-2xl bg-[#FFF7E0] p-4 mb-4">
                <Text className="font-poppins-semibold text-sm text-text-primary">
                  🌟 {feedback.praise}
                </Text>
              </View>
            ) : null}

            <Text className="font-poppins-semibold text-[15px] text-text-primary mb-2">
              {t("roleplay.couldBeBetter")}
            </Text>
            {feedback.corrections.length === 0 ? (
              <Text className="font-poppins text-[13px] text-text-secondary">
                {t("roleplay.nothingToFix")}
              </Text>
            ) : (
              feedback.corrections.map((correction, index) => (
                <View
                  key={`${index}-${correction.said}`}
                  className="rounded-2xl border border-border bg-white p-4 mb-3"
                >
                  <Text className="font-poppins text-xs text-text-secondary">{t("roleplay.saidLabel")}</Text>
                  <Text className="font-poppins text-sm text-text-secondary mb-2">
                    {correction.said}
                  </Text>
                  <Text className="font-poppins text-xs text-lingua-green">{t("roleplay.betterLabel")}</Text>
                  <Text className="font-poppins-semibold text-[15px] text-text-primary mb-2">
                    {correction.better}
                  </Text>
                  {correction.tip ? (
                    <Text className="font-poppins text-[13px] leading-5 text-text-secondary">
                      💡 {correction.tip}
                    </Text>
                  ) : null}
                </View>
              ))
            )}
          </View>
        ) : (
          <Text className="mx-4 font-poppins text-[13px] text-text-secondary">
            {t("roleplay.tooShort")}
          </Text>
        )}
      </ScrollView>

      <View className="px-5 pt-2 pb-5">
        <TouchableOpacity
          className="bg-lingua-purple rounded-2xl py-3.5 items-center"
          activeOpacity={0.85}
          onPress={onDone}
          testID="roleplay-review-done"
        >
          <Text className="font-poppins-semibold text-[15px] text-white">{t("roleplay.done")}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function micLabel(
  practice: boolean,
  canSpeak: boolean,
  isReady: boolean,
  micOn: boolean,
  teacherName: string,
  t: Translate,
): string {
  if (!isReady) return t("roleplay.mic.wait");
  if (!micOn) return t("roleplay.mic.off");
  if (practice) {
    return canSpeak ? t("roleplay.mic.yourTurn") : t("roleplay.mic.listenFirst", { name: teacherName });
  }
  return t("roleplay.mic.listening");
}

function getDisplayStatus(
  callStatus: CallStatus,
  agentStatus: AgentStatus,
  aiName: string,
  t: Translate,
): { color: string; label: string } {
  if (callStatus === "error") {
    return { color: colors.semantic.error, label: t("roleplay.connectFailed") };
  }
  if (callStatus !== "joined") {
    return { color: colors.semantic.warning, label: t("roleplay.status.connecting") };
  }
  const map: Record<AgentStatus, { color: string; label: string }> = {
    idle: { color: colors.neutral.textSecondary, label: t("roleplay.status.preparing") },
    connecting: {
      color: colors.semantic.warning,
      label: t("roleplay.status.agentJoining", { name: aiName }),
    },
    connected: { color: colors.semantic.success, label: t("roleplay.status.talking") },
    failed: {
      color: colors.semantic.error,
      label: t("roleplay.status.agentFailed", { name: aiName }),
    },
  };
  return map[agentStatus];
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  hangUpIcon: { transform: [{ rotate: "135deg" }] },
  transcriptContent: {
    flexGrow: 1,
    padding: 14,
  },
  reviewContent: {
    paddingBottom: 16,
  },
  comicImage: {
    width: "100%",
    height: "100%",
  },
  micButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 6,
  },
  micButtonOn: {
    backgroundColor: colors.primary.purple,
    shadowColor: colors.primary.purple,
    shadowOpacity: 0.4,
  },
  micButtonOff: {
    backgroundColor: colors.neutral.surface,
    shadowColor: "#000",
    shadowOpacity: 0.12,
  },
  micButtonDisabled: {
    opacity: 0.5,
  },
  micButtonPressed: {
    transform: [{ scale: 0.96 }],
  },
});
