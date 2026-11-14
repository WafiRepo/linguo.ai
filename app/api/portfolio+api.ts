import { getBearerToken, verifyClerkToken } from "../../lib/clerkAuth";
import { isPassedRolePlay } from "../../lib/rolePlayScore";
import { isSupabaseConfigured, supabaseRest } from "../../lib/supabase";
import type {
  NewSessionResult,
  PortfolioResponse,
  PortfolioRole,
  SessionResult,
  StudentOverview,
  StudentSummary,
} from "../../types/portfolio";

// Learning Portfolio API (revision P1). Every request needs a Clerk token;
// the database rows are linked to that Clerk user id.
//   GET    /api/portfolio               → my portfolio (+ student list for teachers)
//   GET    /api/portfolio?studentId=... → a student's portfolio (teachers only)
//   POST   /api/portfolio               → save one finished session
//   DELETE /api/portfolio               → delete all my records

type ProfileRow = {
  user_id: string;
  role: PortfolioRole;
  nickname: string | null;
  class_group: string | null;
};

type SessionRow = {
  client_id: string;
  topic_id: string;
  mode: SessionResult["mode"];
  completed: boolean;
  objectives_done: number;
  objectives_total: number;
  xp_earned: number;
  stars: number[];
  praise: string | null;
  corrections: SessionResult["corrections"];
  duration_seconds: number;
  created_at: string;
};

// What the teacher list needs from every session.
type StudentSessionRow = Pick<
  SessionRow,
  "topic_id" | "mode" | "completed" | "objectives_total" | "praise" | "corrections" | "created_at"
> & { user_id: string };

const MAX_SESSIONS = 200;

async function authenticate(request: Request): Promise<string | Response> {
  if (!isSupabaseConfigured()) {
    return Response.json({ error: "Portfolio database not configured" }, { status: 503 });
  }
  const token = getBearerToken(request);
  const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!publishableKey) return Response.json({ error: "Auth not configured" }, { status: 500 });
  const userId = await verifyClerkToken(token, publishableKey);
  return userId ?? Response.json({ error: "Forbidden" }, { status: 403 });
}

async function getProfile(userId: string): Promise<ProfileRow | null> {
  const rows = await supabaseRest<ProfileRow[]>(
    `profiles?user_id=eq.${encodeURIComponent(userId)}&select=user_id,role,nickname,class_group`,
  );
  return rows[0] ?? null;
}

function toStudent(row: ProfileRow | null, userId: string): StudentSummary {
  return { userId, nickname: row?.nickname ?? null, classGroup: row?.class_group ?? null };
}

// client_id is stored as "<clerk user id>:<phone id>" so one student can never
// update another student's row, even with a guessed id.
function toStoredClientId(userId: string, clientId: string): string {
  return `${userId}:${clientId}`;
}

function fromStoredClientId(stored: string): string {
  const separator = stored.indexOf(":");
  return separator === -1 ? stored : stored.slice(separator + 1);
}

function toSession(row: SessionRow): SessionResult {
  return {
    clientId: fromStoredClientId(row.client_id),
    topicId: row.topic_id,
    mode: row.mode,
    completed: row.completed,
    objectivesDone: row.objectives_done,
    objectivesTotal: row.objectives_total,
    xpEarned: row.xp_earned,
    stars: row.stars,
    praise: row.praise,
    corrections: row.corrections,
    durationSeconds: row.duration_seconds,
    createdAt: row.created_at,
  };
}

async function getSessions(userId: string): Promise<SessionResult[]> {
  const rows = await supabaseRest<SessionRow[]>(
    `session_results?user_id=eq.${encodeURIComponent(userId)}` +
      `&order=created_at.desc&limit=${MAX_SESSIONS}`,
  );
  return rows.map(toSession);
}

/** Teacher's list: every student with a few progress numbers. */
async function getStudentOverviews(): Promise<StudentOverview[]> {
  const [students, sessions, certificates] = await Promise.all([
    supabaseRest<ProfileRow[]>("profiles?role=eq.student&select=user_id,role,nickname,class_group"),
    supabaseRest<StudentSessionRow[]>("session_results?select=user_id,topic_id,mode,completed,objectives_total,praise,corrections,created_at"),
    supabaseRest<{ user_id: string; part: string }[]>("certificates?select=user_id,part"),
  ]);
  return students
    .map((row) => {
      const own = sessions.filter((session) => session.user_id === row.user_id);
      // A topic is done when a Role Play earned the PASS stamp.
      const passedTopics = new Set(
        own
          .filter((s) => isPassedRolePlay({ ...s, objectivesTotal: s.objectives_total }))
          .map((s) => s.topic_id),
      );
      return {
        ...toStudent(row, row.user_id),
        sessionsCount: own.length,
        topicsCompleted: passedTopics.size,
        certificateParts: certificates.filter((c) => c.user_id === row.user_id).map((c) => c.part).sort(),
        lastActiveAt: own.map((session) => session.created_at).sort().at(-1) ?? null,
      };
    })
    .sort(
      (a, b) =>
        (a.classGroup ?? "").localeCompare(b.classGroup ?? "") || (a.nickname ?? "").localeCompare(b.nickname ?? ""),
    );
}

export async function GET(request: Request): Promise<Response> {
  const auth = await authenticate(request);
  if (auth instanceof Response) return auth;

  try {
    let me = await getProfile(auth);
    if (!me) {
      // First visit: create the profile row, so an admin can give this
      // account the teacher role in Supabase before it has any sessions.
      await supabaseRest("profiles?on_conflict=user_id", {
        method: "POST",
        prefer: "resolution=ignore-duplicates",
        body: { user_id: auth },
      });
      me = await getProfile(auth);
    }
    const role = me?.role ?? "student";
    const isStaff = role === "teacher" || role === "admin";
    const studentId = new URL(request.url).searchParams.get("studentId");

    // Role-based access: only teachers/admins may open someone else's portfolio.
    if (studentId && studentId !== auth) {
      if (!isStaff) return Response.json({ error: "Forbidden" }, { status: 403 });
      const student = await getProfile(studentId);
      if (!student) return Response.json({ error: "Not found" }, { status: 404 });
      const body: PortfolioResponse = {
        role,
        student: toStudent(student, studentId),
        sessions: await getSessions(studentId),
      };
      return Response.json(body);
    }

    const body: PortfolioResponse = {
      role,
      student: toStudent(me, auth),
      sessions: await getSessions(auth),
    };
    if (isStaff) body.students = await getStudentOverviews();
    return Response.json(body);
  } catch (error) {
    console.error("[portfolio] GET failed", error);
    return Response.json({ error: "Could not load portfolio" }, { status: 502 });
  }
}

function isValidSession(input: Partial<NewSessionResult>): input is NewSessionResult {
  return (
    typeof input.clientId === "string" &&
    input.clientId.length > 0 &&
    input.clientId.length <= 100 &&
    typeof input.topicId === "string" &&
    (input.mode === "practice" || input.mode === "roleplay") &&
    Array.isArray(input.stars) &&
    Array.isArray(input.corrections)
  );
}

// Trust the phone's date (offline uploads arrive later), but never a future one.
function sessionDate(value: unknown): string {
  const date = typeof value === "string" ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime()) || date.getTime() > Date.now()) {
    return new Date().toISOString();
  }
  return date.toISOString();
}

export async function POST(request: Request): Promise<Response> {
  const auth = await authenticate(request);
  if (auth instanceof Response) return auth;

  let input: Partial<NewSessionResult>;
  try {
    input = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!isValidSession(input)) {
    return Response.json({ error: "Invalid session result" }, { status: 400 });
  }

  try {
    // Teachers may try lessons, but their practice is not student data:
    // accept the upload (so the phone's queue clears) and store nothing.
    const caller = await getProfile(auth);
    if (caller?.role === "teacher" || caller?.role === "admin") {
      return Response.json({ ok: true, skipped: "staff" });
    }

    // Create the profile on first save; never touch `role` from the phone.
    await supabaseRest("profiles?on_conflict=user_id", {
      method: "POST",
      prefer: "resolution=merge-duplicates",
      body: {
        user_id: auth,
        nickname: input.nickname?.slice(0, 50) ?? null,
        class_group: input.classGroup?.slice(0, 30) ?? null,
        updated_at: new Date().toISOString(),
      },
    });
    // client_id is unique: saving the same session again updates its row
    // (first when the dialogues are done, then with the AI feedback).
    await supabaseRest("session_results?on_conflict=client_id", {
      method: "POST",
      prefer: "resolution=merge-duplicates",
      body: {
        user_id: auth,
        client_id: toStoredClientId(auth, input.clientId),
        topic_id: input.topicId,
        mode: input.mode,
        completed: !!input.completed,
        objectives_done: Math.max(0, Math.round(input.objectivesDone ?? 0)),
        objectives_total: Math.max(0, Math.round(input.objectivesTotal ?? 0)),
        xp_earned: Math.max(0, Math.round(input.xpEarned ?? 0)),
        stars: input.stars.slice(0, 20).map((value) => Math.max(0, Math.min(3, Math.round(value) || 0))),
        praise: input.praise?.slice(0, 1000) ?? null,
        corrections: input.corrections.slice(0, 10),
        duration_seconds: Math.max(0, Math.round(input.durationSeconds ?? 0)),
        created_at: sessionDate(input.createdAt),
      },
    });
    return Response.json({ ok: true });
  } catch (error) {
    console.error("[portfolio] POST failed", error);
    return Response.json({ error: "Could not save session" }, { status: 502 });
  }
}

export async function DELETE(request: Request): Promise<Response> {
  const auth = await authenticate(request);
  if (auth instanceof Response) return auth;

  try {
    // Sessions go with the profile (on delete cascade).
    await supabaseRest(`profiles?user_id=eq.${encodeURIComponent(auth)}`, { method: "DELETE" });
    return Response.json({ ok: true });
  } catch (error) {
    console.error("[portfolio] DELETE failed", error);
    return Response.json({ error: "Could not delete portfolio" }, { status: 502 });
  }
}
