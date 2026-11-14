import { randomBytes } from "crypto";

import {
  CERTIFICATE_KINDS,
  CERTIFICATE_TITLES,
  CERTIFICATE_TOPICS,
  CertificateKind,
  COURSE_TITLE,
} from "../../constants/curriculumParts";
import { getBearerToken, verifyClerkToken } from "../../lib/clerkAuth";
import { isPassedRolePlay } from "../../lib/rolePlayScore";
import { isSupabaseConfigured, supabaseRest } from "../../lib/supabase";
import type { Certificate, CertificatesResponse } from "../../types/certificate";

// Digital Certificate API (revision P2).
//   GET /api/certificates → each part's progress, issuing any certificate the
//   student has just earned. A part is earned when every one of its topics has
//   a Role Play with the PASS stamp in the Learning Portfolio (Practice is
//   extra training and does not count).
//   The (user_id, part) unique key makes issuing idempotent: never a duplicate.

type SessionRow = {
  topic_id: string;
  mode: "practice" | "roleplay";
  completed: boolean;
  objectives_total: number;
  praise: string | null;
  corrections: unknown[] | null;
  created_at: string;
};

/** First time each topic earned the PASS stamp. */
function passedAt(sessions: SessionRow[]): Map<string, string> {
  const first = new Map<string, string>();
  for (const session of sessions) {
    if (!isPassedRolePlay({ ...session, objectivesTotal: session.objectives_total })) continue;
    const known = first.get(session.topic_id);
    if (!known || session.created_at < known) first.set(session.topic_id, session.created_at);
  }
  return first;
}
type CertificateRow = {
  certificate_no: string;
  part: CertificateKind;
  student_name: string;
  course_title: string;
  completed_at: string;
  issued_at: string;
};

// No 0/O/1/I, so the number is easy to read out or type.
const ID_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

function newCertificateNo(part: CertificateKind): string {
  const bytes = randomBytes(8);
  const code = Array.from(bytes, (byte) => ID_ALPHABET[byte % ID_ALPHABET.length]).join("");
  return `BI-${part}-${code}`;
}

/** When the part was completed: the moment its last topic first earned the PASS stamp. */
function completionDate(part: CertificateKind, sessions: SessionRow[]): string | null {
  const passed = passedAt(sessions);
  let latest: string | null = null;
  for (const topicId of CERTIFICATE_TOPICS[part]) {
    const first = passed.get(topicId);
    if (!first) return null;
    if (!latest || first > latest) latest = first;
  }
  return latest;
}

function topicsDone(part: CertificateKind, sessions: SessionRow[]): number {
  const passed = passedAt(sessions);
  return CERTIFICATE_TOPICS[part].filter((id) => passed.has(id)).length;
}

function toCertificate(row: CertificateRow): Certificate {
  return {
    certificateNo: row.certificate_no,
    part: row.part,
    studentName: row.student_name,
    courseTitle: row.course_title,
    completedAt: row.completed_at,
    issuedAt: row.issued_at,
  };
}

export async function GET(request: Request): Promise<Response> {
  if (!isSupabaseConfigured()) {
    return Response.json({ error: "Portfolio database not configured" }, { status: 503 });
  }
  const token = getBearerToken(request);
  const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!publishableKey) return Response.json({ error: "Auth not configured" }, { status: 500 });
  const userId = await verifyClerkToken(token, publishableKey);
  if (!userId) return Response.json({ error: "Forbidden" }, { status: 403 });

  // Teachers/admins may open a student's certificates with ?studentId=.
  const studentId = new URL(request.url).searchParams.get("studentId");
  let ownerId = userId;
  const callers = await supabaseRest<{ role: string }[]>(
    `profiles?user_id=eq.${encodeURIComponent(userId)}&select=role`,
  ).catch(() => []);
  const callerIsStaff = callers[0]?.role === "teacher" || callers[0]?.role === "admin";
  if (studentId && studentId !== userId) {
    if (!callerIsStaff) return Response.json({ error: "Forbidden" }, { status: 403 });
    ownerId = studentId;
  } else if (callerIsStaff) {
    // Certificates are for students only.
    const body: CertificatesResponse = { parts: [] };
    return Response.json(body);
  }

  const user = encodeURIComponent(ownerId);
  try {
    const sessions = await supabaseRest<SessionRow[]>(
      `session_results?user_id=eq.${user}&mode=eq.roleplay&completed=eq.true` +
        "&select=topic_id,mode,completed,objectives_total,praise,corrections,created_at",
    );
    const existing = await supabaseRest<CertificateRow[]>(`certificates?user_id=eq.${user}`);
    const issuedParts = new Set(existing.map((row) => row.part));

    // Issue certificates for parts finished since the last check.
    // FULL is earned once every topic of A, B and C is done.
    const earned = CERTIFICATE_KINDS.filter((part) => !issuedParts.has(part) && completionDate(part, sessions));
    if (earned.length) {
      const profiles = await supabaseRest<{ nickname: string | null }[]>(
        `profiles?user_id=eq.${user}&select=nickname`,
      );
      const studentName = profiles[0]?.nickname?.trim() || "Student";
      await supabaseRest("certificates?on_conflict=user_id,part", {
        method: "POST",
        prefer: "resolution=ignore-duplicates",
        body: earned.map((part) => ({
          certificate_no: newCertificateNo(part),
          user_id: ownerId,
          part,
          student_name: studentName,
          course_title:
            part === "FULL" ? COURSE_TITLE.en : `${COURSE_TITLE.en} · ${CERTIFICATE_TITLES[part].en}`,
          completed_at: completionDate(part, sessions),
        })),
      });
    }

    const certificates = earned.length
      ? await supabaseRest<CertificateRow[]>(`certificates?user_id=eq.${user}`)
      : existing;
    const body: CertificatesResponse = {
      parts: CERTIFICATE_KINDS.map((part) => {
        const row = certificates.find((item) => item.part === part);
        return {
          part,
          topicsDone: topicsDone(part, sessions),
          topicsTotal: CERTIFICATE_TOPICS[part].length,
          certificate: row ? toCertificate(row) : null,
        };
      }),
    };
    return Response.json(body);
  } catch (error) {
    console.error("[certificates] GET failed", error);
    return Response.json({ error: "Could not load certificates" }, { status: 502 });
  }
}
