/**
 * Base URL for Expo API routes (`/api/stream-token`, `/api/agent-session`).
 *
 * - Local dev: leave `EXPO_PUBLIC_API_URL` empty → uses relative `/api/...`
 * - Production mobile builds: set to your EAS Hosting URL, e.g.
 *   https://duolingo-clone.expo.app
 */
const API_BASE = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";

export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (!API_BASE) {
    return normalizedPath;
  }
  return `${API_BASE}${normalizedPath}`;
}
