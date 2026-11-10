import { ApiError, apiUrl } from "@/lib/api";
import { PortfolioRole } from "@/types/portfolio";

// Student / Teacher choice after sign-up (see app/api/role+api.ts).
type GetToken = () => Promise<string | null>;

async function authHeaders(getToken: GetToken) {
  const token = await getToken();
  if (!token) throw new ApiError(401);
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

export async function fetchRole(getToken: GetToken): Promise<PortfolioRole> {
  const res = await fetch(apiUrl("/api/role"), { headers: await authHeaders(getToken) });
  if (!res.ok) throw new ApiError(res.status);
  return (await res.json()).role;
}

/** Throws ApiError(403) when the teacher code is wrong. */
export async function chooseRole(
  getToken: GetToken,
  role: "student" | "teacher",
  code?: string,
): Promise<PortfolioRole> {
  const res = await fetch(apiUrl("/api/role"), {
    method: "POST",
    headers: await authHeaders(getToken),
    body: JSON.stringify({ role, code }),
  });
  if (!res.ok) throw new ApiError(res.status);
  return (await res.json()).role;
}
