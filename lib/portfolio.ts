import { apiUrl } from "@/lib/api";
import { ALL_CLASS_TOPICS } from "@/lib/topicProgress";
import { useChildProfileStore } from "@/store/childProfileStore";
import { usePortfolioStore } from "@/store/portfolioStore";
import { NewSessionResult, PortfolioResponse, SessionResult } from "@/types/portfolio";

// Phone side of the Learning Portfolio: save results, load the portfolio.
type GetToken = () => Promise<string | null>;

/** A new id for one session; saving again with it updates the same record. */
export function newSessionClientId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Saves a session result: queue it on the phone, then try to upload.
 * Calling it again with the same clientId replaces the earlier version
 * (e.g. first when the dialogues are done, then with the AI feedback).
 */
export function recordSessionResult(
  getToken: GetToken,
  session: Omit<NewSessionResult, "nickname" | "classGroup">,
) {
  const { nickname, classGroup } = useChildProfileStore.getState();
  usePortfolioStore.getState().addPending({
    ...session,
    nickname: nickname ?? null,
    classGroup: classGroup ?? null,
  });
  uploadPendingSessions(getToken).catch(() => {});
}

/** Uploads every queued session; ones that fail stay queued for next time. */
export async function uploadPendingSessions(getToken: GetToken) {
  const token = await getToken();
  if (!token) return;
  for (const session of usePortfolioStore.getState().pending) {
    const res = await fetch(apiUrl("/api/portfolio"), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(session),
    });
    if (!res.ok) throw new Error(`Upload failed (${res.status})`);
    // Only drop this exact version; a newer one may have been queued meanwhile.
    usePortfolioStore.getState().removePending(session);
  }
}

export async function fetchPortfolio(getToken: GetToken, studentId?: string): Promise<PortfolioResponse> {
  const token = await getToken();
  if (!token) throw new Error("Not signed in");
  const query = studentId ? `?studentId=${encodeURIComponent(studentId)}` : "";
  const res = await fetch(apiUrl(`/api/portfolio${query}`), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Load failed (${res.status})`);
  return res.json();
}

export async function deletePortfolio(getToken: GetToken) {
  const token = await getToken();
  if (!token) return;
  const res = await fetch(apiUrl("/api/portfolio"), {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  // 503 = no portfolio database yet, so there is nothing to delete.
  if (!res.ok && res.status !== 503) throw new Error(`Delete failed (${res.status})`);
}

/** Sessions still waiting to upload, shaped like saved ones for the screen. */
export function pendingAsResults(): SessionResult[] {
  return usePortfolioStore.getState().pending.map(({ nickname, classGroup, ...rest }) => rest);
}

export interface PortfolioSummary {
  totalXp: number;
  /** Topics where both Latihan and Role Play were finished at least once. */
  topicsCompleted: number;
  totalTopics: number;
  sessionsCount: number;
  /** Average Latihan stars (0–3), or null before any Latihan. */
  averageStars: number | null;
  /** Finished topics per part: A, B, C. */
  parts: { key: "A" | "B" | "C"; done: number; total: number }[];
  strengths: string[];
  improvements: SessionResult["corrections"];
}

function partOf(topicId: string): "A" | "B" | "C" {
  if (topicId.startsWith("b-")) return "B";
  if (topicId.startsWith("c-")) return "C";
  return "A";
}

export function summarizePortfolio(sessions: SessionResult[]): PortfolioSummary {
  const finished = new Set(
    sessions.filter((session) => session.completed).map((session) => `${session.topicId}:${session.mode}`),
  );
  const completedTopicIds = ALL_CLASS_TOPICS.filter(
    (topic) => finished.has(`${topic.id}:practice`) && finished.has(`${topic.id}:roleplay`),
  ).map((topic) => topic.id);

  const allStars = sessions.flatMap((session) => session.stars).filter((value) => value > 0);

  // Newest first: the latest praise and corrections matter most.
  const strengths = [
    ...new Set(sessions.map((session) => session.praise?.trim()).filter((text): text is string => !!text)),
  ].slice(0, 3);
  const seen = new Set<string>();
  const improvements = sessions
    .flatMap((session) => session.corrections)
    .filter((correction) => {
      if (seen.has(correction.better)) return false;
      seen.add(correction.better);
      return true;
    })
    .slice(0, 3);

  return {
    totalXp: sessions.reduce((sum, session) => sum + session.xpEarned, 0),
    topicsCompleted: completedTopicIds.length,
    totalTopics: ALL_CLASS_TOPICS.length,
    sessionsCount: sessions.length,
    averageStars: allStars.length ? allStars.reduce((a, b) => a + b, 0) / allStars.length : null,
    parts: (["A", "B", "C"] as const).map((key) => ({
      key,
      done: completedTopicIds.filter((id) => partOf(id) === key).length,
      total: ALL_CLASS_TOPICS.filter((topic) => partOf(topic.id) === key).length,
    })),
    strengths,
    improvements,
  };
}
