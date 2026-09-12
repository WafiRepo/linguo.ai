import { createPublicKey, createVerify } from "crypto";

// Server-only: verifies the Clerk session token attached to API requests.
// Shared by every Expo API route that must confirm which student/guardian
// account is calling before touching AI or Stream resources.

// Derives the Clerk JWKS URL from the publishable key.
// Publishable key format: pk_{env}_{base64url-of-frontend-api-host}
function clerkJwksUrl(publishableKey: string): string {
  const parts = publishableKey.split("_");
  if (parts.length < 3 || parts[0] !== "pk") {
    throw new Error("Invalid CLERK publishable key format");
  }
  const host = Buffer.from(parts[2], "base64url")
    .toString()
    .replace(/\$$/, "");
  return `https://${host}/.well-known/jwks.json`;
}

// Verifies a Clerk-issued JWT and returns the authenticated user id (sub).
// Returns null if the token is missing, malformed, expired, or has an invalid signature.
export async function verifyClerkToken(
  token: string,
  publishableKey: string
): Promise<string | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  let header: { alg?: string; kid?: string };
  let payload: { sub?: string; exp?: number };
  try {
    header = JSON.parse(Buffer.from(parts[0], "base64url").toString());
    payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
  } catch {
    return null;
  }

  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }

  let jwks: { keys: object[] };
  try {
    const res = await fetch(clerkJwksUrl(publishableKey));
    if (!res.ok) return null;
    jwks = await res.json();
  } catch {
    return null;
  }

  const jwk = (jwks.keys as Array<Record<string, unknown>>).find(
    (k) => k.kid === header.kid
  );
  if (!jwk) return null;

  try {
    const publicKey = createPublicKey({ key: jwk as object, format: "jwk" });
    const verifier = createVerify("RSA-SHA256");
    verifier.update(`${parts[0]}.${parts[1]}`);
    const valid = verifier.verify(
      publicKey,
      Buffer.from(parts[2], "base64url")
    );
    if (!valid) return null;
  } catch {
    return null;
  }

  return payload.sub ?? null;
}

export function getBearerToken(request: Request): string | null {
  const authHeader = request.headers.get("Authorization");
  return authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
}
