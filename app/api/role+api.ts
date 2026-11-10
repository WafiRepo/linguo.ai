import { timingSafeEqual } from "crypto";

import { getBearerToken, verifyClerkToken } from "../../lib/clerkAuth";
import { isSupabaseConfigured, supabaseRest } from "../../lib/supabase";
import type { PortfolioRole } from "../../types/portfolio";

// Choosing Student or Teacher after sign-up.
//   GET  /api/role                         → { role } (creates the profile row if missing)
//   POST /api/role { role: "student" }     → becomes a student
//   POST /api/role { role: "teacher", code } → becomes a teacher only with the
//        school's teacher code (TEACHER_SIGNUP_CODE, server env), so a student
//        cannot pick "teacher" and read other students' portfolios.
// "admin" is never set from the app; it is given by hand in Supabase.

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

async function currentRole(userId: string): Promise<PortfolioRole | null> {
  const rows = await supabaseRest<{ role: PortfolioRole }[]>(
    `profiles?user_id=eq.${encodeURIComponent(userId)}&select=role`,
  );
  return rows[0]?.role ?? null;
}

function codeMatches(input: string): boolean {
  const expected = process.env.TEACHER_SIGNUP_CODE?.trim();
  if (!expected) return false; // no code configured → nobody can self-register as teacher
  const a = Buffer.from(input.trim().toUpperCase());
  const b = Buffer.from(expected.toUpperCase());
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: Request): Promise<Response> {
  const auth = await authenticate(request);
  if (auth instanceof Response) return auth;
  try {
    let role = await currentRole(auth);
    if (!role) {
      await supabaseRest("profiles?on_conflict=user_id", {
        method: "POST",
        prefer: "resolution=ignore-duplicates",
        body: { user_id: auth },
      });
      role = "student";
    }
    return Response.json({ role });
  } catch (error) {
    console.error("[role] GET failed", error);
    return Response.json({ error: "Could not load role" }, { status: 502 });
  }
}

export async function POST(request: Request): Promise<Response> {
  const auth = await authenticate(request);
  if (auth instanceof Response) return auth;

  let input: { role?: string; code?: string };
  try {
    input = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (input.role !== "student" && input.role !== "teacher") {
    return Response.json({ error: "Invalid role" }, { status: 400 });
  }
  if (input.role === "teacher" && !codeMatches(typeof input.code === "string" ? input.code : "")) {
    return Response.json({ error: "Wrong teacher code" }, { status: 403 });
  }

  try {
    const existing = await currentRole(auth);
    // Never demote an admin from the app.
    const role: PortfolioRole = existing === "admin" ? "admin" : input.role;
    await supabaseRest("profiles?on_conflict=user_id", {
      method: "POST",
      prefer: "resolution=merge-duplicates",
      body: { user_id: auth, role, updated_at: new Date().toISOString() },
    });
    return Response.json({ role });
  } catch (error) {
    console.error("[role] POST failed", error);
    return Response.json({ error: "Could not save role" }, { status: 502 });
  }
}
