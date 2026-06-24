import type { ApiResponse } from "@/src/types/api";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

export function getAuthToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem("tino-auth-token");
}

export function setAuthToken(token: string) {
  window.localStorage.setItem("tino-auth-token", token);
}

export function clearAuthToken() {
  window.localStorage.removeItem("tino-auth-token");
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getAuthToken();
  const headers = new Headers(init.headers);

  headers.set("Content-Type", "application/json");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });
  const payload = (await response.json()) as ApiResponse<T>;

  if (!response.ok) {
    throw new Error(payload.message || "Request failed");
  }

  return payload;
}
