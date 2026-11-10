import { randomBytes } from "crypto";

import {
  COURSE_TITLE,
  CURRICULUM_PARTS,
  CurriculumPart,
  PART_KEYS,
  PART_TITLES,
} from "../../constants/curriculumParts";
import { getBearerToken, verifyClerkToken } from "../../lib/clerkAuth";
import { isSupabaseConfigured, supabaseRest } from "../../lib/supabase";
import type { Certificate, CertificatesResponse } from "../../types/certificate";

// Digital Certificate API (revision P2).
//   GET /api/certificates → each part's progress, issuing any certificate the
//   student has just earned. A part is earned when every one of its topics has
//   a finished Latihan AND a finished Role Play in the Learning Portfolio.
//   The (user_id, part) unique key makes issuing idempotent: never a duplicate.

type SessionRow = { topic_id: string; mode: "practice" | "roleplay"; created_at: string };
type CertificateRow = {
  certificate_no: string;
  part: CurriculumPart;
  student_name: string;
  course_title: string;
  completed_at: string;
  issued_at: string;
};

// No 0/O/1/I, so the number is easy to read out or type.
const ID_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

function newCertificateNo(part: CurriculumPart): string {
  const bytes = randomBytes(8);
  const code = Array.from(bytes, (byte) => ID_ALPHABET[byte % ID_ALPHABET.length]).join("");
  return `BI-${part}-${code}`;
}

/** When the part was completed: the moment its last required session was first done. */
function completionDate(part: CurriculumPart, sessions: SessionRow[]): string | null {
  let latest: string | null = null;
  for (const topicId of CURRICULUM_PARTS[part]) {
    for (const mode of ["practice", "roleplay"] as const) {
      const first = sessions
        .filter((session) => session.topic_id === topicId && session.mode === mode)
        .map((session) => session.created_at)
        .sort()[0];
      if (!first) return null;
      if (!latest || first > latest) latest = first;
    }
  }
  return latest;
}

function topicsDone(part: CurriculumPart, sessions: SessionRow[]): number {
  const done = new Set(sessions.map((session) => `${session.topic_id}:${session.mode}`));
  return CURRICULUM_PARTS[part].filter((id) => done.has(`${id}:practice`) && done.has(`${id}:roleplay`))
    .length;
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
  if (studentId && studentId !== userId) {
    const callers = await supabaseRest<{ role: string }[]>(
      `profiles?user_id=eq.${encodeURIComponent(userId)}&select=role`,
    ).catch(() => []);
    const role = callers[0]?.role;
    if (role !== "teacher" && role !== "admin") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }
    ownerId = studentId;
  }

  const user = encodeURIComponent(ownerId);
  try {
    const sessions = await supabaseRest<SessionRow[]>(
      `session_results?user_id=eq.${user}&completed=eq.true&select=topic_id,mode,created_at`,
    );
    const existing = await supabaseRest<CertificateRow[]>(`certificates?user_id=eq.${user}`);
    const issuedParts = new Set(existing.map((row) => row.part));

    // Issue certificates for parts finished since the last check.
    const earned = PART_KEYS.filter((part) => !issuedParts.has(part) && completionDate(part, sessions));
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
          course_title: `${COURSE_TITLE.en} · ${PART_TITLES[part].en}`,
          completed_at: completionDate(part, sessions),
        })),
      });
    }

    const certificates = earned.length
      ? await supabaseRest<CertificateRow[]>(`certificates?user_id=eq.${user}`)
      : existing;
    const body: CertificatesResponse = {
      parts: PART_KEYS.map((part) => {
        const row = certificates.find((item) => item.part === part);
        return {
          part,
          topicsDone: topicsDone(part, sessions),
          topicsTotal: CURRICULUM_PARTS[part].length,
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
