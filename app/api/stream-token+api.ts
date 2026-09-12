import { createHmac } from "crypto";
import { CHILD_AI_RELEASE_READY } from "../../constants/releaseSafety";
import { getBearerToken, verifyClerkToken } from "../../lib/clerkAuth";

function base64urlEncode(input: string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function generateStreamToken(userId: string, secret: string): string {
  const header = base64urlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 3600;
  const payload = base64urlEncode(JSON.stringify({ user_id: userId, iat, exp }));
  const signingInput = `${header}.${payload}`;
  const sig = createHmac("sha256", secret)
    .update(signingInput)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
  return `${signingInput}.${sig}`;
}

export async function GET(request: Request): Promise<Response> {
  if (!CHILD_AI_RELEASE_READY) {
    return Response.json({ error: "AI practice is not available in the student pilot." }, { status: 503 });
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
  if (!userId) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const secret = process.env.STREAM_API_SECRET;
  const apiKey = process.env.STREAM_API_KEY;

  if (!secret || !apiKey) {
    return Response.json({ error: "Stream not configured" }, { status: 500 });
  }

  const token = generateStreamToken(userId, secret);
  return Response.json({ token, apiKey });
}
