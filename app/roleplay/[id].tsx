import { useAuth, useUser } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import {
  Call,
  callManager,
  StreamCall,
  StreamVideo,
  StreamVideoClient,
  useCallStateHooks,
} from "@stream-io/video-react-native-sdk";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AIPilotNotice } from "@/components/AIPilotNotice";
import { TalkStage } from "@/components/TalkStage";
import { TeacherMood } from "@/components/TeacherFace";
import { CHILD_AI_RELEASE_READY } from "@/constants/releaseSafety";
import { images } from "@/constants/images";
import { colors } from "@/constants/theme";
import { getClassTopic } from "@/data/classManagement";
import { apiUrl } from "@/lib/api";
import { resetPhoneAudioToMedia } from "@/lib/audioMode";
import {
  comicCallCustomData,
  comicTeacherName,
  comicTopicToScenario,
} from "@/lib/comicRoleplay";
import { getInstructionLanguages } from "@/lib/instructionLanguage";
import { newSessionClientId, recordSessionResult } from "@/lib/portfolio";
import { posthog } from "@/lib/posthog";
import { ROLE_PLAY_PASS_SCORE, rolePlayScore } from "@/lib/rolePlayScore";
import { useLanguageStore } from "@/store/languageStore";
import { useLearningStore } from "@/store/learningStore";
import { usePortfolioStore } from "@/store/portfolioStore";
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
  const markRolePlayPassed = useLearningStore((s) => s.markRolePlayPassed);
  const recordRolePlayScore = useLearningStore((s) => s.recordRolePlayScore);

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
  // The comic dialogue on screen. It moves on only when the teacher starts the
  // next dialogue's line, not as soon as the server marks a dialogue done:
  // the teacher may still be correcting the previous one.
  const [displayTurn, setDisplayTurn] = useState(0);
  const pendingTurnRef = useRef<number | null>(null);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Learning Portfolio: one record per session (same clientId). It is saved
  // as soon as every dialogue is done, updated when the AI feedback arrives,
  // and saved a last time when the student leaves (end button, back arrow or
  // the Android back gesture), so a student who never taps "end" still has it.
  const portfolioIdRef = useRef({ clientId: newSessionClientId(), createdAt: new Date().toISOString() });
  const finalSavedRef = useRef(false);
  const latestResultRef = useRef({ completedIds, feedback, stars, missionComplete });
  latestResultRef.current = { completedIds, feedback, stars, missionComplete };

  // Teachers can try a lesson, but it is not saved to any portfolio.
  const portfolioRole = usePortfolioStore((s) => s.role);
  const isTeacherMode = portfolioRole === "teacher" || portfolioRole === "admin";

  function saveSessionResult(final: boolean) {
    if (finalSavedRef.current || !comic || !studentSpokeRef.current || isTeacherMode) return;
    if (final) finalSavedRef.current = true;
    const latest = latestResultRef.current;
    recordSessionResult(getToken, {
      ...portfolioIdRef.current,
      topicId: comic.id,
      mode: isPractice ? "practice" : "roleplay",
      completed: latest.missionComplete,
      objectivesDone: latest.completedIds.length,
      objectivesTotal: scenario?.objectives.length ?? 0,
      xpEarned: latest.missionComplete ? comic.xpReward : 0,
      stars: isPractice ? latest.stars.filter((value) => typeof value === "number") : [],
      praise: latest.feedback?.praise || null,
      corrections: latest.feedback?.corrections ?? [],
      durationSeconds: startTimeRef.current
        ? Math.floor((Date.now() - startTimeRef.current) / 1000)
        : 0,
    });
  }

  useEffect(() => {
    if (!isLoaded || !user || !scenario) return;

    startTimeRef.current = Date.now();
    portfolioIdRef.current = { clientId: newSessionClientId(), createdAt: new Date().toISOString() };
    finalSavedRef.current = false;
    rewardedRef.current = false;
    studentSpokeRef.current = false;
    setCompletedIds([]);
    setFeedback(null);
    setReviewing(false);
    setComicPhase("guru");
    setCorrection(null);
    setDisplayTurn(0);
    pendingTurnRef.current = null;
    setPracticeStep("listen");
    setStars([]);
    posthog.capture("roleplay_started", {
      scenario_id: scenario.id,
      kind: isPractice ? "comic_practice" : "comic",
      tutor_voice: tutorVoice,
    });

    startCall();

    return () => {
      saveSessionResult(true);
      const leaving = callRef.current?.leave() ?? Promise.resolve();
      leaving.catch(console.error).finally(resetPhoneAudioToMedia);
      clientRef.current?.disconnectUser().catch(console.error);
      stopAgentSession(callRef.current?.id ?? null, agentSessionRef.current);
    };
  }, [isLoaded, user, scenario, comic, isPractice, tutorVoice, tutorEmotion]);

  useEffect(() => {
    if (!missionComplete || !comic || rewardedRef.current) return;
    rewardedRef.current = true;
    completeClassTopic(comic.id, isPractice ? "practice" : "roleplay", comic.xpReward);
    saveSessionResult(false);
    posthog.capture("roleplay_completed", {
      scenario_id: comic.id,
      duration_seconds: startTimeRef.current
        ? Math.floor((Date.now() - startTimeRef.current) / 1000)
        : 0,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missionComplete, comic, isPractice, completeClassTopic]);

  // After the last dialogue the Done button waits for Bu Guru's feedback
  // (it holds the score), but not longer than RESULTS_WAIT_MS.
  const [resultsTimedOut, setResultsTimedOut] = useState(false);
  useEffect(() => {
    if (!missionComplete) {
      setResultsTimedOut(false);
      return;
    }
    const timer = setTimeout(() => setResultsTimedOut(true), RESULTS_WAIT_MS);
    return () => clearTimeout(timer);
  }, [missionComplete]);
  const resultsReady = feedback !== null || resultsTimedOut;

  // Bu Guru sends feedback whenever the student pauses, so one may already be
  // here from before the last dialogue. The score must come from the feedback
  // on the whole session (it follows the last answer), so drop the old one.
  useEffect(() => {
    if (missionComplete) setFeedback(null);
  }, [missionComplete]);

  // Role Play score, once every dialogue is done and Bu Guru's feedback is in.
  const rolePlayResult =
    !isPractice && missionComplete && feedback && scenario
      ? rolePlayScore(scenario.objectives.length, feedback.corrections.length)
      : null;
  useEffect(() => {
    if (rolePlayResult === null || !comic) return;
    recordRolePlayScore(comic.id, rolePlayResult);
    if (rolePlayResult >= ROLE_PLAY_PASS_SCORE) markRolePlayPassed(comic.id);
  }, [rolePlayResult, comic, markRolePlayPassed, recordRolePlayScore]);

  // The AI feedback can arrive after the dialogues are done: update the record.
  useEffect(() => {
    if (feedback && rewardedRef.current) saveSessionResult(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedback]);

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
      // Play the teacher through the speaker, not the earpiece.
      callManager.start({ audioRole: "communicator", deviceEndpointType: "speaker" });
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

  const showTurn = useCallback((index: number) => {
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    advanceTimerRef.current = null;
    pendingTurnRef.current = null;
    setDisplayTurn(index);
    // Next comic dialogue: Bu Guru speaks first.
    setComicPhase("guru");
    setCorrection((current) => (current && current.turnIndex < index ? null : current));
  }, []);

  // Move on now if the teacher is already saying the next dialogue's line,
  // or after a short wait when the line is never heard (fallback).
  const scheduleAdvance = useCallback(
    (index: number) => {
      pendingTurnRef.current = index;
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = setTimeout(() => showTurn(index), COMIC_ADVANCE_FALLBACK_MS);
    },
    [showTurn],
  );

  useEffect(() => () => {
    if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
  }, []);

  useEffect(() => {
    if (completedIds.length > displayTurn) scheduleAdvance(completedIds.length);
    // displayTurn is read only to know whether a move is needed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completedIds.length, scheduleAdvance]);

  const handleAgentText = useCallback(
    (text: string) => {
      const pending = pendingTurnRef.current;
      if (pending === null || !comic) return;
      const nextGuruLine = comic.turns[pending]?.guruLine.id;
      // No next dialogue (all done) or the teacher started it: show it.
      if (!nextGuruLine || saysLine(text, nextGuruLine)) showTurn(pending);
      // Still on the current dialogue (e.g. correcting it): wait again.
      else scheduleAdvance(pending);
    },
    [comic, showTurn, scheduleAdvance],
  );

  // Bu Guru's face: a short reaction, then back to normal.
  const [reaction, setReaction] = useState<TeacherMood | null>(null);
  const reactionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const react = useCallback((mood: TeacherMood, ms = 1800) => {
    if (reactionTimerRef.current) clearTimeout(reactionTimerRef.current);
    setReaction(mood);
    reactionTimerRef.current = setTimeout(() => setReaction(null), ms);
  }, []);
  useEffect(() => () => {
    if (reactionTimerRef.current) clearTimeout(reactionTimerRef.current);
  }, []);
  // Right answers in a row light her up; a second correction on the same
  // dialogue gets a gentle "it's okay" instead of another "almost".
  const correctStreakRef = useRef(0);
  const correctedTurnRef = useRef<number | null>(null);

  const handleObjectiveDone = useCallback(
    (objectiveId: string) => {
      correctStreakRef.current += 1;
      correctedTurnRef.current = null;
      react(correctStreakRef.current >= 2 ? "onFire" : "happy", 2200);
      setCompletedIds((prev) =>
        prev.includes(objectiveId) ? prev : [...prev, objectiveId],
      );
      posthog.capture("roleplay_objective_completed", {
        scenario_id: scenario?.id ?? null,
        objective_id: objectiveId,
      });
    },
    [scenario?.id, react],
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
      correctStreakRef.current = 0;
      react(correctedTurnRef.current === next.turnIndex ? "comfort" : "encourage", 2600);
      correctedTurnRef.current = next.turnIndex;
      setDisplayTurn(next.turnIndex);
      // Still move on afterwards, once the teacher continues.
      if (pendingTurnRef.current !== null) scheduleAdvance(pendingTurnRef.current);
      posthog.capture("roleplay_correction_shown", {
        scenario_id: scenario?.id ?? null,
        turn_index: next.turnIndex,
      });
    },
    [scenario?.id, scheduleAdvance, react],
  );

  const handlePracticeStep = useCallback((step: PracticeStep) => {
    setPracticeStep(step);
    // A new step starts clean; its own mistakes bring a new card.
    setCorrection(null);
  }, []);

  const handlePracticeResult = useCallback((turnIndex: number, value: number) => {
    react(value >= 3 ? "wow" : value === 2 ? "happy" : "encourage", value >= 2 ? 2000 : 2600);
    setStars((prev) => {
      const next = [...prev];
      next[turnIndex] = value;
      return next;
    });
  }, [react]);

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
    resetPhoneAudioToMedia();
    callRef.current = null;
    clientRef.current = null;
    agentSessionRef.current = null;
    stopAgentSession(callId, sessionId);

    if (!studentSpokeRef.current) {
      router.back();
      return;
    }
    saveSessionResult(true);
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
        score={rolePlayResult}
        teacherMode={isTeacherMode}
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
          turnIndex={displayTurn}
          step={practiceStep}
          stars={stars}
        />
      ) : (
        <ComicPanel topic={comic} turnIndex={displayTurn} phase={comicPhase} />
      )}
      {correction && correction.turnIndex === displayTurn ? (
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
              resultsReady={resultsReady}
              reaction={missionComplete ? "celebrate" : reaction}
              onObjectiveDone={handleObjectiveDone}
              onStudentTurn={handleStudentTurn}
              onAgentTurn={handleAgentTurn}
              onAgentText={handleAgentText}
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

// After the last dialogue, wait at most this long for Bu Guru's feedback.
const RESULTS_WAIT_MS = 20000;

// Move the comic anyway when the teacher has been quiet this long without
// starting the next dialogue (each piece of her speech restarts the wait).
const COMIC_ADVANCE_FALLBACK_MS = 8000;

function comparableWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/** True when the teacher's speech contains the start of a comic line. */
function saysLine(speech: string, line: string): boolean {
  const words = comparableWords(line);
  if (!words.length) return false;
  // The first three words are enough to recognise the line (all of a short one).
  const start = words.slice(0, Math.min(3, words.length)).join(" ");
  return comparableWords(speech).join(" ").includes(start);
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
        <Text className="font-poppins text-[13px] text-[#E0A100]">
          {stars.map((value) => "★".repeat(value) + "☆".repeat(3 - value)).join("  ")}
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
  resultsReady,
  reaction,
  onObjectiveDone,
  onStudentTurn,
  onAgentTurn,
  onAgentText,
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
  /** Feedback arrived (or we stopped waiting): Done can open the results. */
  resultsReady: boolean;
  /** Bu Guru's reaction to the last answer (or the finished lesson), if any. */
  reaction: TeacherMood | null;
  onObjectiveDone: (objectiveId: string) => void;
  onStudentTurn: () => void;
  onAgentTurn: () => void;
  /** Every piece of the teacher's speech (partial and final). */
  onAgentText: (text: string) => void;
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
  const { useMicrophoneState, useParticipants } = useCallStateHooks();
  const participants = useParticipants();
  const { microphone, optimisticIsMute, mediaStream } = useMicrophoneState({
    optimisticUpdates: true,
  });
  const [messages, setMessages] = useState<TranscriptMessage[]>([]);
  const [partials, setPartials] = useState<Partial<Record<Speaker, string>>>({});
  const [showHints, setShowHints] = useState(false);
  // Role Play: the student holds Bu Guru's face to talk.
  const [holding, setHolding] = useState(false);
  const nextMessageIdRef = useRef(0);
  // Latest in-progress student words, and the bubble they were placed in
  // when Bu Guru replied before they were final.
  const userPartialRef = useRef("");
  const userDraftIdRef = useRef<number | null>(null);
  const micAutoStartedRef = useRef(false);

  const isReady = agentStatus === "connected";

  // Open mic for the whole session. Toggling it per answer (tap-to-talk)
  // re-published the audio track and the agent lost the student's audio, so
  // in Latihan the server decides when the AI listens instead.
  useEffect(() => {
    if (!isReady || micAutoStartedRef.current) return;
    micAutoStartedRef.current = true;
    microphone.enable().catch((e) => console.warn("[roleplay] mic enable failed:", e));
  }, [isReady, microphone]);

  // Every dialogue is done: the conversation is over, the student can't
  // talk to Bu Guru any more (she can still finish her last sentence).
  useEffect(() => {
    if (!missionComplete) return;
    microphone.disable().catch((e) => console.warn("[roleplay] mic disable failed:", e));
  }, [missionComplete, microphone]);

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
        else onAgentText(text);
        setPartials((prev) => ({ ...prev, [speaker]: text }));
        return;
      }

      if (data.type === "transcript_final" && data.text) {
        const text = data.text;
        setPartials((prev) => ({ ...prev, [speaker]: undefined }));
        if (speaker === "agent") onAgentText(text);

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
    onAgentText,
    onCorrection,
    onFeedback,
    onPracticeStep,
    onPracticeResult,
  ]);

  // Push-to-talk (Role Play and Practice). The mic stays published for the whole call
  // (re-publishing it made the agent lose the student's audio), so holding
  // only switches the track between the student's voice and silence. The
  // AI hears silence after the student lets go and answers.
  useEffect(() => {
    const talking = holding && !missionComplete;
    // The SDK publishes a clone of the mic track, so switch the clone that is
    // actually sent. The local track stays on for the voice bars.
    const apply = () =>
      call.publisher
        ?.getPublishedTracks()
        .filter((track) => track.kind === "audio")
        .forEach((track) => {
          if (track.enabled !== talking) track.enabled = talking;
        });
    apply();
    // A reconnect publishes a new clone (switched on): keep it in line.
    const timer = setInterval(apply, 500);
    return () => clearInterval(timer);
  }, [call, holding, missionComplete, mediaStream]);

  function startTalking() {
    if (optimisticIsMute) {
      microphone.enable().catch((e) => console.warn("[roleplay] mic enable failed:", e));
    }
    setHolding(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }

  function handleToggleHints() {
    if (!showHints) {
      posthog.capture("roleplay_hints_opened", { scenario_id: scenario.id });
    }
    setShowHints((prev) => !prev);
  }

  // Bu Guru's face: her voice from the call, or her words still arriving.
  const teacher = participants.find((participant) => !participant.isLocalParticipant);
  const student = participants.find((participant) => participant.isLocalParticipant);
  const teacherSpeaking = Boolean(teacher?.isSpeaking) || Boolean(partials.agent);
  const faceMood: TeacherMood =
    reaction ??
    (!isReady
      ? "sleepy"
      : holding || student?.isSpeaking || partials.user
        ? "listening"
        : !teacherSpeaking && messages.at(-1)?.speaker === "user"
          ? "thinking" // the student finished; her answer is on its way
          : "neutral");


  const hintsCard = showHints ? (
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
  ) : null;

  const donePanel = (
    <View className="px-6 pt-2 pb-6">
      <Text className="mb-3 text-center font-poppins-medium text-[13px] text-text-secondary">
        {resultsReady
          ? t("roleplay.finishedBody")
          : t("roleplay.preparingResults", { name: scenario.aiName })}
      </Text>
      <TouchableOpacity
        className={`h-14 items-center justify-center rounded-2xl ${resultsReady ? "bg-lingua-purple" : "bg-[#C9BEFB]"}`}
        activeOpacity={0.85}
        disabled={!resultsReady}
        onPress={onFinish}
        testID="roleplay-done-button"
      >
        {resultsReady ? (
          <Text className="font-poppins-semibold text-base text-white">{t("roleplay.done")}</Text>
        ) : (
          <ActivityIndicator color="#fff" />
        )}
      </TouchableOpacity>
    </View>
  );

  // ---- Hold Bu Guru's face to talk, let go and she answers ----
  // In Practice only during the student's step (repeat / answer).
  {
    const canTalk = isReady && !missionComplete && (!practice || canSpeak);
    // Once every dialogue is done there is nothing to hold any more: the
    // Done panel below says what to do.
    const talkStatus = missionComplete
      ? ""
      : !isReady
      ? t("roleplay.ptt.connecting", { name: scenario.aiName })
      : holding
        ? t("roleplay.ptt.listening")
        : practice && !canSpeak && !missionComplete
          ? t("roleplay.mic.listenFirst", { name: scenario.aiName })
          : teacherSpeaking
          ? t("roleplay.ptt.speaking", { name: scenario.aiName })
          : faceMood === "thinking"
            ? t("roleplay.ptt.thinking", { name: scenario.aiName })
            : t("roleplay.ptt.hold", { name: scenario.aiName });
    // The last two lines of the conversation, words still arriving included.
    const talkLines = [
      ...messages.map((message) => ({ speaker: message.speaker, text: message.text })),
      ...(partials.user ? [{ speaker: "user" as const, text: partials.user }] : []),
      ...(partials.agent ? [{ speaker: "agent" as const, text: partials.agent }] : []),
    ].slice(-2);

    return (
      <View className="flex-1">
        {agentStatus === "failed" ? (
          <TouchableOpacity onPress={onRetry} className="flex-1 items-center justify-center">
            <Text className="font-poppins-semibold text-sm text-text-primary">
              {t("roleplay.cantJoin", { name: scenario.aiName })}
            </Text>
            <Text className="font-poppins text-[13px] text-lingua-purple mt-1">{t("roleplay.tapRetry")}</Text>
          </TouchableOpacity>
        ) : (
          <TalkStage
            mood={faceMood}
            teacherSpeaking={teacherSpeaking}
            teacherLevel={teacher?.audioLevel ?? 0}
            studentLevel={student?.audioLevel ?? 0}
            holding={holding}
            canTalk={canTalk}
            status={talkStatus}
            lines={talkLines}
            teacherName={scenario.aiName}
            youLabel={t("roleplay.you")}
            onPressIn={startTalking}
            onPressOut={() => setHolding(false)}
          />
        )}
        {hintsCard}
        {missionComplete ? (
          donePanel
        ) : (
          <View className="items-center pt-1 pb-5">
            <TouchableOpacity
              className={`flex-row items-center gap-1.5 rounded-full px-4 py-2 ${showHints ? "bg-lingua-purple" : "bg-surface"}`}
              activeOpacity={0.8}
              onPress={handleToggleHints}
              testID="roleplay-hints-button"
            >
              <Ionicons name="bulb-outline" size={16} color={showHints ? "#fff" : colors.neutral.textPrimary} />
              <Text className={`font-poppins-medium text-xs ${showHints ? "text-white" : "text-text-primary"}`}>
                {t("roleplay.youCanSay")}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

}


function RoleplayReview({
  scenario,
  completedIds,
  feedback,
  stars,
  score = null,
  teacherMode = false,
  onDone,
}: {
  scenario: RoleplayScenario;
  completedIds: string[];
  feedback: RoleplayFeedback | null;
  /** Latihan only: stars earned per dialogue. */
  stars?: number[];
  /** Role Play only: score 0–100, null until the feedback arrives. */
  score?: number | null;
  /** A teacher trying the lesson: nothing is saved to a portfolio. */
  teacherMode?: boolean;
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
        {teacherMode ? (
          <View className="mx-4 mb-3 rounded-2xl border border-[#e4dcff] bg-[#f6f3ff] px-4 py-3">
            <Text className="font-poppins text-[13px] leading-5 text-text-secondary">{t("roleplay.teacherMode")}</Text>
          </View>
        ) : null}
        <MissionCard scenario={scenario} completedIds={completedIds} />

        {stars && stars.length > 0 ? (
          <View className="mx-4 mb-4 rounded-2xl bg-[#FFF7E0] p-3">
            {stars.map((value, index) => (
              <View key={index} className="flex-row items-center justify-between py-0.5">
                <Text className="font-poppins-medium text-[13px] text-text-primary">
                  {t("roleplay.dialogueN", { n: index + 1 })}
                </Text>
                <Text className="font-poppins text-sm text-[#E0A100]">
                  {"★".repeat(value)}
                  {"☆".repeat(3 - value)}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {score !== null ? (
          <View className="mx-4 mb-4 flex-row items-center gap-3 rounded-2xl border border-border bg-white p-4">
            {score >= ROLE_PLAY_PASS_SCORE ? (
              <Image source={images.stampPass} contentFit="contain" style={styles.reviewStamp} />
            ) : null}
            <View className="flex-1">
              <Text className="font-poppins-semibold text-base text-text-primary">
                {t("roleplay.score", { score })}
              </Text>
              <Text className="mt-0.5 font-poppins text-[13px] leading-5 text-text-secondary">
                {score >= ROLE_PLAY_PASS_SCORE
                  ? t("roleplay.stampEarned")
                  : t("roleplay.stampNeeds", { score: ROLE_PLAY_PASS_SCORE })}
              </Text>
            </View>
          </View>
        ) : null}

        <View className="mx-4 mb-4 flex-row items-center rounded-2xl bg-surface p-3">
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
                  {feedback.praise}
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
  reviewStamp: {
    width: 64,
    height: 64,
  },
  reviewContent: {
    paddingBottom: 16,
  },
  comicImage: {
    width: "100%",
    height: "100%",
  },
});
