import { useAuth } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { Href, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { WaveHeader } from "@/components/WaveHeader";
import { getClassTopic } from "@/data/classManagement";
import { Translate, TranslationKey, useT } from "@/lib/i18n";
import {
  fetchPortfolio,
  pendingAsResults,
  summarizePortfolio,
  uploadPendingSessions,
} from "@/lib/portfolio";
import { usePortfolioStore } from "@/store/portfolioStore";
import { PortfolioResponse, SessionResult, StudentSummary } from "@/types/portfolio";

const PURPLE = "#6c4ef5";

// Learning Portfolio (revision P1): the student's own records, or — for a
// teacher — a student's records opened from the "My students" list.
export default function PortfolioScreen() {
  const router = useRouter();
  const { studentId } = useLocalSearchParams<{ studentId?: string }>();
  const { getToken } = useAuth();
  const { t, locale } = useT();
  const pendingCount = usePortfolioStore((s) => s.pending.length);

  const [data, setData] = useState<PortfolioResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    // Upload anything saved while offline first, so the list is complete.
    if (!studentId) await uploadPendingSessions(getToken).catch(() => {});
    try {
      setData(await fetchPortfolio(getToken, studentId));
      setOffline(false);
    } catch {
      setOffline(true);
    } finally {
      setLoading(false);
    }
  }, [getToken, studentId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // Own portfolio: also show sessions still waiting to upload.
  const sessions = useMemo(() => {
    const saved = data?.sessions ?? [];
    if (studentId) return saved;
    const savedIds = new Set(saved.map((session) => session.clientId));
    const waiting = pendingAsResults().filter((session) => !savedIds.has(session.clientId));
    return [...waiting, ...saved].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    // pendingCount re-runs this after an upload empties the queue.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, studentId, pendingCount]);
  const pendingIds = useMemo(
    () => new Set(studentId ? [] : pendingAsResults().map((session) => session.clientId)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [studentId, pendingCount],
  );

  const summary = summarizePortfolio(sessions);
  const dateFormat = new Intl.DateTimeFormat(locale === "zh-TW" ? "zh-TW" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const title = studentId ? data?.student.nickname ?? t("portfolio.unnamed") : t("portfolio.title");

  return (
    <View className="flex-1 bg-[#faf8ff]">
      <WaveHeader
        title={title}
        onBack={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/profile"))}
        backLabel={t("common.back")}
      />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loading && !data ? <ActivityIndicator color={PURPLE} className="mt-10" /> : null}

        {offline ? (
          <View className="flex-row items-center gap-2 rounded-2xl bg-[#fff4e5] px-4 py-3">
            <Ionicons name="cloud-offline-outline" size={20} color="#b45309" />
            <Text className="flex-1 font-poppins text-[13px] leading-5 text-[#92400e]">{t("portfolio.offline")}</Text>
            <TouchableOpacity onPress={load} hitSlop={8}>
              <Text className="font-poppins-semibold text-[13px] text-[#b45309]">{t("common.retry")}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Teachers: pick a student */}
        {!studentId && data?.students ? (
          <StudentList students={data.students} t={t} onOpen={(id) => router.push(`/portfolio?studentId=${encodeURIComponent(id)}` as Href)} />
        ) : null}

        {/* Overview */}
        <SectionLabel icon="stats-chart" label={t("portfolio.summary")} />
        <View className="flex-row flex-wrap gap-3">
          <Stat icon="flash" color="#f59e0b" value={String(summary.totalXp)} label={t("portfolio.totalXp")} />
          <Stat
            icon="checkmark-circle"
            color="#22c55e"
            value={`${summary.topicsCompleted}/${summary.totalTopics}`}
            label={t("portfolio.topics")}
          />
          <Stat icon="time" color={PURPLE} value={String(summary.sessionsCount)} label={t("portfolio.sessions")} />
          <Stat
            icon="star"
            color="#facc15"
            value={summary.averageStars === null ? "–" : summary.averageStars.toFixed(1)}
            label={t("portfolio.stars")}
          />
        </View>

        {/* Progress by part */}
        <View className="mt-3 rounded-[24px] border border-[#e4dcff] bg-white p-4" style={styles.softShadow}>
          <Text className="font-poppins-semibold text-[15px] text-text-primary mb-1">{t("portfolio.parts")}</Text>
          {summary.parts.map((part) => (
            <View key={part.key} className="mt-2">
              <View className="flex-row justify-between">
                <Text className="font-poppins text-[13px] text-text-secondary">{t("portfolio.part", { part: part.key })}</Text>
                <Text className="font-poppins-semibold text-[13px] text-[#4a32c9]">
                  {part.done}/{part.total}
                </Text>
              </View>
              <View className="mt-1 h-2.5 rounded-full bg-[#ece6ff] overflow-hidden">
                <View
                  className="h-full rounded-full bg-[#6c4ef5]"
                  style={{ width: `${part.total ? (part.done / part.total) * 100 : 0}%` }}
                />
              </View>
            </View>
          ))}
        </View>

        {/* Strengths & areas to improve */}
        <SectionLabel icon="sparkles" label={t("portfolio.strengths")} />
        <View className="rounded-[24px] bg-[#ecfdf3] p-4 gap-2">
          {summary.strengths.length ? (
            summary.strengths.map((text) => (
              <View key={text} className="flex-row gap-2">
                <Text className="font-poppins text-sm">🌟</Text>
                <Text className="flex-1 font-poppins text-sm leading-6 text-[#166534]">{text}</Text>
              </View>
            ))
          ) : (
            <Text className="font-poppins text-sm text-[#166534]">{t("portfolio.noStrengths")}</Text>
          )}
        </View>

        <SectionLabel icon="construct" label={t("portfolio.improve")} />
        <View className="rounded-[24px] bg-[#fff7ed] p-4 gap-3">
          {summary.improvements.length ? (
            summary.improvements.map((correction) => (
              <Correction key={correction.better} said={correction.said} better={correction.better} tip={correction.tip} t={t} />
            ))
          ) : (
            <Text className="font-poppins text-sm text-[#9a3412]">{t("portfolio.noImprove")}</Text>
          )}
        </View>

        {/* History */}
        <SectionLabel icon="calendar" label={t("portfolio.history")} />
        {sessions.length === 0 && !loading ? (
          <View className="items-center rounded-[24px] border border-dashed border-[#c9b8ff] bg-white px-6 py-8">
            <Ionicons name="school-outline" size={40} color="#a78bfa" />
            <Text className="mt-3 font-poppins text-sm leading-6 text-text-secondary text-center">{t("portfolio.empty")}</Text>
          </View>
        ) : (
          <View className="gap-3">
            {sessions.map((session) => (
              <SessionCard
                key={session.clientId}
                session={session}
                pending={pendingIds.has(session.clientId)}
                date={dateFormat.format(new Date(session.createdAt))}
                t={t}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function SectionLabel({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View className="mt-6 mb-3 flex-row items-center gap-2">
      <Ionicons name={icon} size={20} color={PURPLE} />
      <Text className="font-poppins-bold text-lg text-[#4a32c9]">{label}</Text>
    </View>
  );
}

function Stat({
  icon,
  color,
  value,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  value: string;
  label: string;
}) {
  return (
    <View className="w-[48%] grow rounded-[20px] border border-[#e4dcff] bg-white px-4 py-3" style={styles.softShadow}>
      <Ionicons name={icon} size={22} color={color} />
      <Text className="mt-1 font-poppins-bold text-2xl text-text-primary">{value}</Text>
      <Text className="font-poppins text-[13px] text-text-secondary">{label}</Text>
    </View>
  );
}

function Correction({ said, better, tip, t }: { said: string; better: string; tip: string; t: Translate }) {
  return (
    <View>
      <Text className="font-poppins text-[13px] text-[#9a3412]">
        {t("portfolio.said")}: <Text className="line-through">{said}</Text>
      </Text>
      <Text className="font-poppins-semibold text-sm text-[#166534]">
        {t("portfolio.better")}: {better}
      </Text>
      {tip ? <Text className="font-poppins text-[13px] leading-5 text-text-secondary">{tip}</Text> : null}
    </View>
  );
}

function SessionCard({
  session,
  pending,
  date,
  t,
}: {
  session: SessionResult;
  pending: boolean;
  date: string;
  t: Translate;
}) {
  const [open, setOpen] = useState(false);
  const topic = getClassTopic(session.topicId);
  const hasDetails = !!session.praise || session.corrections.length > 0;

  return (
    <TouchableOpacity
      activeOpacity={hasDetails ? 0.85 : 1}
      onPress={() => hasDetails && setOpen((value) => !value)}
      className="rounded-[24px] border border-[#e4dcff] bg-white p-4"
      style={styles.softShadow}
    >
      <View className="flex-row items-start gap-3">
        <View
          className={`w-11 h-11 rounded-full items-center justify-center ${
            session.completed ? "bg-[#dcfce7]" : "bg-[#f3f4f6]"
          }`}
        >
          <Ionicons
            name={session.mode === "practice" ? "mic" : "chatbubbles"}
            size={22}
            color={session.completed ? "#16a34a" : "#9ca3af"}
          />
        </View>
        <View className="flex-1">
          <Text className="font-poppins-semibold text-[15px] text-text-primary" numberOfLines={2}>
            {topic?.title ?? session.topicId}
          </Text>
          <Text className="font-poppins text-xs text-text-secondary mt-0.5">{date}</Text>
          <View className="flex-row flex-wrap gap-1.5 mt-2">
            <Chip label={t(session.mode === "practice" ? "mode.practice" : "mode.roleplay")} />
            <Chip
              label={
                session.completed
                  ? t("portfolio.goals", { done: session.objectivesDone, total: session.objectivesTotal })
                  : t("portfolio.notFinished")
              }
              tone={session.completed ? "good" : "muted"}
            />
            {session.xpEarned ? <Chip label={`+${session.xpEarned} XP`} tone="xp" /> : null}
            {session.durationSeconds >= 60 ? (
              <Chip label={t("portfolio.minutes", { count: Math.round(session.durationSeconds / 60) })} tone="muted" />
            ) : null}
            {pending ? <Chip label={t("portfolio.pending")} tone="muted" /> : null}
          </View>
          {session.stars.length ? (
            <Text className="mt-2 font-poppins text-sm">{session.stars.map((value) => "⭐".repeat(value)).join("  ")}</Text>
          ) : null}
        </View>
        {hasDetails ? <Ionicons name={open ? "chevron-up" : "chevron-down"} size={20} color={PURPLE} /> : null}
      </View>

      {open ? (
        <View className="mt-3 gap-3 rounded-2xl bg-[#f4f1ff] p-3">
          {session.praise ? (
            <Text className="font-poppins text-sm leading-6 text-[#166534]">🌟 {session.praise}</Text>
          ) : null}
          {session.corrections.map((correction, index) => (
            <Correction key={index} said={correction.said} better={correction.better} tip={correction.tip} t={t} />
          ))}
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

function Chip({ label, tone = "default" }: { label: string; tone?: "default" | "good" | "muted" | "xp" }) {
  const { bg, text } = {
    default: { bg: "bg-[#ece6ff]", text: "text-[#4a32c9]" },
    good: { bg: "bg-[#dcfce7]", text: "text-[#166534]" },
    muted: { bg: "bg-[#f3f4f6]", text: "text-[#4b5563]" },
    xp: { bg: "bg-[#fef3c7]", text: "text-[#92400e]" },
  }[tone];
  return (
    <View className={`rounded-lg px-2 py-0.5 ${bg}`}>
      <Text className={`font-poppins-medium text-xs ${text}`}>{label}</Text>
    </View>
  );
}

function StudentList({
  students,
  t,
  onOpen,
}: {
  students: StudentSummary[];
  t: Translate;
  onOpen: (userId: string) => void;
}) {
  return (
    <>
      <SectionLabel icon="people" label={t("portfolio.students")} />
      <Text className="font-poppins text-[13px] text-text-secondary -mt-1 mb-3">{t("portfolio.studentsHint")}</Text>
      <View className="gap-2">
        {students.map((student) => (
          <TouchableOpacity
            key={student.userId}
            activeOpacity={0.85}
            onPress={() => onOpen(student.userId)}
            className="flex-row items-center rounded-[20px] border border-[#e4dcff] bg-white px-4 py-3"
          >
            <Ionicons name="person-circle" size={32} color="#a78bfa" />
            <View className="flex-1 ml-3">
              <Text className="font-poppins-semibold text-[15px] text-text-primary">
                {student.nickname ?? t("portfolio.unnamed")}
              </Text>
              {student.classGroup ? (
                <Text className="font-poppins text-xs text-text-secondary">{t(`grade.${student.classGroup}` as TranslationKey)}</Text>
              ) : null}
            </View>
            <Ionicons name="chevron-forward" size={20} color={PURPLE} />
          </TouchableOpacity>
        ))}
      </View>
    </>
  );
}

// ScrollView contentContainerStyle and shadows stay in StyleSheet.
const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 48,
  },
  softShadow: {
    shadowColor: "#6c4ef5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
});
