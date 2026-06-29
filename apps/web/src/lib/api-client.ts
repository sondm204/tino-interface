import type { ApiResponse } from "@/src/types/api";
import type { User } from "@/src/types/domain";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";
const AUTH_TOKEN_KEY = "tino-auth-token";
const REFRESH_TOKEN_KEY = "tino-refresh-token";
const CURRENT_USER_KEY = "tino-current-user";
const GET_CACHE_TTL_MS = 5_000;

type CachedResponse = {
  expiresAt: number;
  value: ApiResponse<unknown>;
};

const getResponseCache = new Map<string, CachedResponse>();
const pendingGetRequests = new Map<string, Promise<ApiResponse<unknown>>>();
let refreshRequest: Promise<string | null> | null = null;

class ApiHttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string
  ) {
    super(message);
  }
}

export function getAuthToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthToken(token: string) {
  getResponseCache.clear();
  pendingGetRequests.clear();
  window.localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function getRefreshToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setRefreshToken(token: string) {
  window.localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

export function getStoredCurrentUser() {
  if (typeof window === "undefined") {
    return null;
  }

  const rawUser = window.localStorage.getItem(CURRENT_USER_KEY);

  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser) as User;
  } catch {
    window.localStorage.removeItem(CURRENT_USER_KEY);
    return null;
  }
}

export function setStoredCurrentUser(user: User) {
  window.localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
}

export function clearAuthToken() {
  window.localStorage.removeItem(AUTH_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  window.localStorage.removeItem(CURRENT_USER_KEY);
  getResponseCache.clear();
  pendingGetRequests.clear();
}

function expireSession() {
  clearAuthToken();
  window.dispatchEvent(new Event("tino-auth-expired"));
}

async function refreshAccessToken() {
  if (refreshRequest) {
    return refreshRequest;
  }

  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    expireSession();
    return null;
  }

  refreshRequest = fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })
    .then(async (response) => {
      const payload = (await response.json()) as ApiResponse<{
        access_token: string;
        refresh_token: string;
        user?: User;
      }>;

      if (!response.ok || !payload.data) {
        throw new Error(payload.message || "Không thể làm mới phiên đăng nhập");
      }

      setAuthToken(payload.data.access_token);
      setRefreshToken(payload.data.refresh_token);

      if (payload.data.user) {
        setStoredCurrentUser(payload.data.user);
      }

      return payload.data.access_token;
    })
    .catch(() => {
      expireSession();
      return null;
    })
    .finally(() => {
      refreshRequest = null;
    });

  return refreshRequest;
}

async function executeRequest<T>(
  path: string,
  init: RequestInit,
  headers: Headers
): Promise<ApiResponse<T>> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });
  const payload = (await response.json()) as ApiResponse<T>;

  if (!response.ok) {
    throw new ApiHttpError(
      payload.message || "Request failed",
      response.status,
      payload.code
    );
  }

  return payload;
}

async function executeWithRefresh<T>(
  path: string,
  init: RequestInit,
  headers: Headers
) {
  try {
    return await executeRequest<T>(path, init, headers);
  } catch (error) {
    const isSessionEndpoint = [
      "/auth/login",
      "/auth/register",
      "/auth/refresh",
      "/auth/logout",
    ].includes(path);

    if (
      !(error instanceof ApiHttpError) ||
      error.status !== 401 ||
      isSessionEndpoint
    ) {
      throw error;
    }

    const accessToken = await refreshAccessToken();

    if (!accessToken) {
      throw error;
    }

    const retryHeaders = new Headers(headers);
    retryHeaders.set("Authorization", `Bearer ${accessToken}`);
    return executeRequest<T>(path, init, retryHeaders);
  }
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getAuthToken();
  const method = (init.method || "GET").toUpperCase();
  const headers = new Headers(init.headers);

  if (!(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (method !== "GET") {
    const response = await executeWithRefresh<T>(path, init, headers);
    getResponseCache.clear();
    pendingGetRequests.clear();
    return response;
  }

  const cacheKey = `${token || "anonymous"}:${path}`;
  const cached = getResponseCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.value as ApiResponse<T>;
  }

  if (cached) {
    getResponseCache.delete(cacheKey);
  }

  const pending = pendingGetRequests.get(cacheKey);

  if (pending) {
    return pending as Promise<ApiResponse<T>>;
  }

  const request = executeWithRefresh<T>(path, init, headers)
    .then((response) => {
      getResponseCache.set(cacheKey, {
        expiresAt: Date.now() + GET_CACHE_TTL_MS,
        value: response,
      });
      return response;
    })
    .finally(() => {
      pendingGetRequests.delete(cacheKey);
    });

  pendingGetRequests.set(cacheKey, request);
  return request;
}
