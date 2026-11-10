// Server-only: talks to Supabase's REST API (PostgREST) with plain fetch.
// Used by Expo API routes; never import this from a screen — the service
// role key bypasses Row Level Security and must stay on the server.

export function isSupabaseConfigured(): boolean {
  return !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;
}

/**
 * Calls `${SUPABASE_URL}/rest/v1/${path}` and returns the parsed JSON.
 * `prefer` maps to PostgREST's Prefer header (e.g. "return=representation").
 */
export async function supabaseRest<T>(
  path: string,
  init: { method?: string; body?: unknown; prefer?: string } = {},
): Promise<T> {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase is not configured");

  const headers: Record<string, string> = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
  if (init.prefer) headers.Prefer = init.prefer;

  const res = await fetch(`${url}/rest/v1/${path}`, {
    method: init.method ?? "GET",
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  if (!res.ok) {
    throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  }
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}
