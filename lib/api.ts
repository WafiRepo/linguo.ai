import Constants from "expo-constants";
import { Platform } from "react-native";

/**
 * Base URL for Expo API routes (`/api/stream-token`, `/api/agent-session`).
 *
 * - Web dev: empty → relative `/api/...` (Metro serves API routes)
 * - Native dev/build: must be absolute — set `EXPO_PUBLIC_API_URL` or use production fallback
 */
const PRODUCTION_API_URL = "https://linguo-ai.expo.app";

function resolveApiBase(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;

  const fromExtra = Constants.expoConfig?.extra?.apiUrl;
  if (typeof fromExtra === "string" && fromExtra.length > 0) {
    return fromExtra.replace(/\/$/, "");
  }

  // Relative paths don't work on iOS/Android — there is no local API server.
  if (Platform.OS !== "web") {
    return PRODUCTION_API_URL;
  }

  return "";
}

const API_BASE = resolveApiBase();

/** Error from an API route, with its HTTP status (0 = no response at all). */
export class ApiError extends Error {
  constructor(public status: number) {
    super(`API request failed (${status})`);
  }
}

/** 401/403/404: the server answered, but this account may not see the data. */
export function isNoAccessError(error: unknown): boolean {
  return error instanceof ApiError && [401, 403, 404].includes(error.status);
}

export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (!API_BASE) {
    return normalizedPath;
  }
  return `${API_BASE}${normalizedPath}`;
}
