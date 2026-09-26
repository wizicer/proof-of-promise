import type { HumanPromise } from "@/types";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...init, headers: { "content-type": "application/json", ...init?.headers } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? "Something went wrong");
  return body as T;
}

export const api = {
  session: () => request<{ authenticated: boolean; loginHandle?: string }>("/api/session"),
  loginContext: (loginHandle: string) => request<{ sessionId: `session_${string}` }>("/api/auth/login-context", { method: "POST", body: JSON.stringify({ loginHandle }) }),
  logout: () => request<{ success: true }>("/api/session", { method: "DELETE" }),
  promises: () => request<HumanPromise[]>("/api/promises"),
  promise: (id: string) => request<HumanPromise>(`/api/promises/${id}`),
  createPromise: (value: { item: string; deadline: string; note: string }) => request<HumanPromise>("/api/promises", { method: "POST", body: JSON.stringify(value) }),
  createShowUpPromise: (value: { latitude: number; longitude: number; scheduledAt: string; centerTime: string; windowHours: number; timezone: string; note: string }) => request<HumanPromise>("/api/promises/show-up", { method: "POST", body: JSON.stringify(value) }),
  act: (id: string, action: string) => request<{ success: true }>(`/api/promises/${id}/${action}`, { method: "POST" }),
};
