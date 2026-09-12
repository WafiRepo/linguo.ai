import { CHILD_AI_RELEASE_READY } from "../../constants/releaseSafety";
import { getBearerToken, verifyClerkToken } from "../../lib/clerkAuth";

const PRODUCTION_AGENT_URL = "https://linguoai-production.up.railway.app";
const AGENT_URL =
  process.env.VISION_AGENT_URL?.replace(/\/$/, "") ?? PRODUCTION_AGENT_URL;

// Every callId is minted client-side as `<kind>-<lessonOrTopicId>-<clerkUserId>`
// (see app/lesson/[id].tsx and app/class-management/[id].tsx). With no
// database to look up call membership, that suffix is the only ownership
// signal available: reject any call id that doesn't belong to the caller
// whose Clerk token was just verified.
async function authorizeCallOwner(
  request: Request,
  callId: string | null,
): Promise<Response | null> {
  if (!callId) {
    return Response.json({ error: "callId is required" }, { status: 400 });
  }

  const clerkToken = getBearerToken(request);
  if (!clerkToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!publishableKey) {
    return Response.json({ error: "Auth not configured" }, { status: 500 });
  }

  const userId = await verifyClerkToken(clerkToken, publishableKey);
  if (!userId || !callId.endsWith(`-${userId}`)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  return null;
}

// Shared secret between this backend and the vision-agent process. Never
// forwarded to or readable by the client; absent until the agent is
// migrated to vision-agent/serve_secure.py (see docs/VOICE-SERVER-TAIWAN.md).
function agentServiceHeaders(): Record<string, string> {
  const serviceKey = process.env.AGENT_SERVICE_KEY;
  return serviceKey ? { "X-Agent-Service-Key": serviceKey } : {};
}

export async function POST(request: Request): Promise<Response> {
  if (!CHILD_AI_RELEASE_READY) {
    return Response.json({ error: "AI practice is not available in the student pilot." }, { status: 503 });
  }
  let body: { callId?: string; callType?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { callId = null, callType = "default" } = body;

  const denied = await authorizeCallOwner(request, callId);
  if (denied) return denied;

  console.log(
    `[agent-session] Starting session for call ${callId} at ${AGENT_URL}`,
  );

  try {
    const res = await fetch(
      `${AGENT_URL}/calls/${encodeURIComponent(callId!)}/sessions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...agentServiceHeaders(),
        },
        body: JSON.stringify({ call_type: callType }),
      },
    );

    if (!res.ok) {
      const text = await res.text();
      console.error(
        `[agent-session] Vision agent returned ${res.status}: ${text}`,
      );
      return Response.json({ error: text }, { status: res.status });
    }

    const data = await res.json();
    console.log(`[agent-session] Session started: ${data.session_id}`);
    return Response.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[agent-session] Failed to reach vision agent at ${AGENT_URL}: ${message}`,
    );
    return Response.json(
      { error: `Cannot reach vision agent: ${message}` },
      { status: 503 },
    );
  }
}

export async function DELETE(request: Request): Promise<Response> {
  if (!CHILD_AI_RELEASE_READY) {
    return Response.json({ error: "AI practice is not available in the student pilot." }, { status: 503 });
  }
  const { searchParams } = new URL(request.url);
  const callId = searchParams.get("callId");
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return Response.json(
      { error: "callId and sessionId are required" },
      { status: 400 },
    );
  }

  const denied = await authorizeCallOwner(request, callId);
  if (denied) return denied;

  try {
    const res = await fetch(
      `${AGENT_URL}/calls/${encodeURIComponent(callId!)}/sessions/${encodeURIComponent(sessionId)}`,
      { method: "DELETE", headers: agentServiceHeaders() },
    );

    if (!res.ok && res.status !== 404) {
      const text = await res.text();
      return Response.json({ error: text }, { status: res.status });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[agent-session] DELETE failed: ${message}`);
    return Response.json(
      { error: "Failed to reach vision agent" },
      { status: 503 },
    );
  }

  return Response.json({ ok: true });
}
