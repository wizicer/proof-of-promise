import type { BorrowerHistory, HumanPromise } from "@/types";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...init, headers: { "content-type": "application/json", ...init?.headers } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? "Something went wrong");
  return body as T;
}

export const api = {
  session: () => request<{ authenticated: boolean }>("/api/session"),
  logout: () => request<{ success: true }>("/api/session", { method: "DELETE" }),
  promises: () => request<HumanPromise[]>("/api/promises"),
  promise: (id: string) => request<HumanPromise>(`/api/promises/${id}`),
  borrowerHistory: (id: string) => request<BorrowerHistory>(`/api/promises/${id}/borrower-history`),
  createPromise: (value: { item: string; deadline: string; note: string; icon?: string }) => request<HumanPromise>("/api/promises", { method: "POST", body: JSON.stringify(value) }),
  createShowUpPromise: (value: { latitude: number; longitude: number; scheduledAt: string; centerTime: string; windowHours: number; timezone: string; note: string }) => request<HumanPromise>("/api/promises/show-up", { method: "POST", body: JSON.stringify(value) }),
  merchantPromises: () => request<HumanPromise[]>("/api/merchant/promises"),
  createMerchantPromise: (value: { item: string; deadline: string; note: string; durationLabel?: string; icon?: string }) => request<HumanPromise>("/api/merchant/promises", { method: "POST", body: JSON.stringify(value) }),
  borrowB2C: (id: string) => request<HumanPromise>(`/api/promises/${id}/borrow-b2c`, { method: "POST" }),
  act: (id: string, action: string) => request<{ success: true }>(`/api/promises/${id}/${action}`, { method: "POST" }),
};
