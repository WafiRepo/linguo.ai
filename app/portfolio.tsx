import { useAuth } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import { Href, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
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

  // Clerk's getToken changes identity on every render; keep it in a ref so
  // `load` stays stable and the focus effect doesn't reload in a loop.
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  const load = useCallback(async () => {
    const token = () => getTokenRef.current();
    setLoading(true);
    // Upload anything saved while offline first, so the list is complete.
    if (!studentId) await uploadPendingSessions(token).catch(() => {});
    try {
      setData(await fetchPortfolio(token, studentId));
      setOffline(false);
    } catch {
      setOffline(true);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

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
          <View className="flex-row items-center gap-3 rounded-2xl border border-[#fde3c2] bg-[#fffaf3] px-4 py-3">
            <Text className="flex-1 font-poppins text-[13px] leading-5 text-[#92400e]">{t("portfolio.offline")}</Text>
            <TouchableOpacity onPress={load} hitSlop={8}>
              <Text className="font-poppins-semibold text-[13px] text-[#b45309]">{t("common.retry")}</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Teachers: pick a student */}
        {!studentId && data?.students ? (
          <StudentList
            students={data.students}
            t={t}
            onOpen={(id) => router.push(`/portfolio?studentId=${encodeURIComponent(id)}` as Href)}
          />
        ) : null}

        {/* Overview */}
        <SectionLabel label={t("portfolio.summary")} />
        <View className="rounded-[24px] border border-[#e4dcff] bg-white p-4" style={styles.softShadow}>
          <View className="flex-row">
            <Stat value={String(summary.totalXp)} label={t("portfolio.totalXp")} />
            <Stat value={`${summary.topicsCompleted}/${summary.totalTopics}`} label={t("portfolio.topics")} divider />
            <Stat value={String(summary.sessionsCount)} label={t("portfolio.sessions")} divider />
            <Stat
              value={summary.averageStars === null ? "–" : summary.averageStars.toFixed(1)}
              label={t("portfolio.stars")}
              divider
            />
          </View>

          <View className="mt-4 border-t border-[#f0ecff] pt-3">
            <Text className="font-poppins-semibold text-sm text-text-primary">{t("portfolio.parts")}</Text>
            {summary.parts.map((part) => (
              <View key={part.key} className="mt-2.5">
                <View className="flex-row justify-between">
                  <Text className="font-poppins text-[13px] text-text-secondary">
                    {t("portfolio.part", { part: part.key })}
                  </Text>
                  <Text className="font-poppins-medium text-[13px] text-text-primary">
                    {part.done}/{part.total}
                  </Text>
                </View>
                <View className="mt-1 h-2 rounded-full bg-[#ece6ff] overflow-hidden">
                  <View
                    className="h-full rounded-full bg-[#6c4ef5]"
                    style={{ width: `${part.total ? (part.done / part.total) * 100 : 0}%` }}
                  />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Strengths & areas to improve */}
        <SectionLabel label={t("portfolio.strengths")} />
        <View className="rounded-[24px] border border-[#e4dcff] bg-white px-4 py-1" style={styles.softShadow}>
          {summary.strengths.length ? (
            summary.strengths.map((text, index) => (
              <Text
                key={text}
                className={`py-3 font-poppins text-sm leading-6 text-text-primary ${
                  index > 0 ? "border-t border-[#f0ecff]" : ""
                }`}
              >
                {text}
              </Text>
            ))
          ) : (
            <Text className="py-3 font-poppins text-sm text-text-secondary">{t("portfolio.noStrengths")}</Text>
          )}
        </View>

        <SectionLabel label={t("portfolio.improve")} />
        <View className="rounded-[24px] border border-[#e4dcff] bg-white px-4 py-1" style={styles.softShadow}>
          {summary.improvements.length ? (
            summary.improvements.map((correction, index) => (
              <View key={correction.better} className={`py-3 ${index > 0 ? "border-t border-[#f0ecff]" : ""}`}>
                <Correction said={correction.said} better={correction.better} tip={correction.tip} t={t} />
              </View>
            ))
          ) : (
            <Text className="py-3 font-poppins text-sm text-text-secondary">{t("portfolio.noImprove")}</Text>
          )}
        </View>

        {/* History */}
        <SectionLabel label={t("portfolio.history")} />
        {sessions.length === 0 && !loading ? (
          <View className="rounded-[24px] border border-dashed border-[#c9b8ff] bg-white px-6 py-8">
            <Text className="font-poppins text-sm leading-6 text-text-secondary text-center">{t("portfolio.empty")}</Text>
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

function SectionLabel({ label }: { label: string }) {
  return <Text className="mt-7 mb-3 font-poppins-semibold text-base text-text-primary">{label}</Text>;
}

function Stat({ value, label, divider = false }: { value: string; label: string; divider?: boolean }) {
  return (
    <View className={`flex-1 items-center px-1 ${divider ? "border-l border-[#f0ecff]" : ""}`}>
      <Text className="font-poppins-bold text-xl text-[#4a32c9]">{value}</Text>
      <Text className="mt-0.5 font-poppins text-[11px] leading-4 text-text-secondary text-center">{label}</Text>
    </View>
  );
}

function Correction({ said, better, tip, t }: { said: string; better: string; tip: string; t: Translate }) {
  return (
    <View>
      <Text className="font-poppins text-[13px] text-text-secondary">
        {t("portfolio.said")}: <Text className="line-through">{said}</Text>
      </Text>
      <Text className="font-poppins-semibold text-sm text-text-primary">
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
  const averageStars = session.stars.length
    ? (session.stars.reduce((a, b) => a + b, 0) / session.stars.length).toFixed(1)
    : null;

  // One quiet line of facts instead of a row of badges.
  const details = [
    t(session.mode === "practice" ? "mode.practice" : "mode.roleplay"),
    session.completed
      ? t("portfolio.goals", { done: session.objectivesDone, total: session.objectivesTotal })
      : t("portfolio.notFinished"),
    session.xpEarned ? `+${session.xpEarned} XP` : null,
    averageStars ? `${t("portfolio.stars")} ${averageStars}/3` : null,
    session.durationSeconds >= 60
      ? t("portfolio.minutes", { count: Math.round(session.durationSeconds / 60) })
      : null,
  ].filter(Boolean);

  return (
    <TouchableOpacity
      activeOpacity={hasDetails ? 0.85 : 1}
      onPress={() => hasDetails && setOpen((value) => !value)}
      className="rounded-[20px] border border-[#e4dcff] bg-white px-4 py-3.5"
      style={styles.softShadow}
    >
      <View className="flex-row items-center gap-3">
        <View className="flex-1">
          <View className="flex-row items-center justify-between gap-2">
            <Text className="font-poppins text-xs text-text-secondary">{date}</Text>
            {pending ? <Text className="font-poppins text-xs text-[#b45309]">{t("portfolio.pending")}</Text> : null}
          </View>
          <Text className="mt-1 font-poppins-semibold text-[15px] text-text-primary" numberOfLines={2}>
            {topic?.title ?? session.topicId}
          </Text>
          <Text
            className={`mt-1 font-poppins text-[13px] ${session.completed ? "text-[#4a32c9]" : "text-text-secondary"}`}
          >
            {details.join("  ·  ")}
          </Text>
        </View>
        {hasDetails ? <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color="#9ca3af" /> : null}
      </View>

      {open ? (
        <View className="mt-3 gap-3 border-t border-[#f0ecff] pt-3">
          {session.praise ? (
            <Text className="font-poppins text-sm leading-6 text-text-primary">{session.praise}</Text>
          ) : null}
          {session.corrections.map((correction, index) => (
            <Correction key={index} said={correction.said} better={correction.better} tip={correction.tip} t={t} />
          ))}
        </View>
      ) : null}
    </TouchableOpacity>
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
      <SectionLabel label={t("portfolio.students")} />
      <Text className="-mt-1 mb-3 font-poppins text-[13px] text-text-secondary">{t("portfolio.studentsHint")}</Text>
      <View className="gap-2">
        {students.map((student) => (
          <TouchableOpacity
            key={student.userId}
            activeOpacity={0.85}
            onPress={() => onOpen(student.userId)}
            className="flex-row items-center rounded-[20px] border border-[#e4dcff] bg-white px-4 py-3"
          >
            <View className="flex-1">
              <Text className="font-poppins-semibold text-[15px] text-text-primary">
                {student.nickname ?? t("portfolio.unnamed")}
              </Text>
              {student.classGroup ? (
                <Text className="font-poppins text-xs text-text-secondary">
                  {t(`grade.${student.classGroup}` as TranslationKey)}
                </Text>
              ) : null}
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
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
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 1,
  },
});
