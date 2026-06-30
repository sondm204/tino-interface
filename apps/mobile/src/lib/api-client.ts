import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ApiResponse } from "@/types/api";
import type { User } from "@/types/domain";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || "https://tino-service.onrender.com";
const AUTH_TOKEN_KEY = "tino-auth-token";
const REFRESH_TOKEN_KEY = "tino-refresh-token";
const CURRENT_USER_KEY = "tino-current-user";

let refreshRequest: Promise<string | null> | null = null;

export class ApiHttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string
  ) {
    super(message);
  }
}

export async function getAuthToken() {
  return AsyncStorage.getItem(AUTH_TOKEN_KEY);
}

export async function setAuthToken(token: string) {
  await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
}

export async function getRefreshToken() {
  return AsyncStorage.getItem(REFRESH_TOKEN_KEY);
}

export async function setRefreshToken(token: string) {
  await AsyncStorage.setItem(REFRESH_TOKEN_KEY, token);
}

export async function getStoredCurrentUser() {
  const rawUser = await AsyncStorage.getItem(CURRENT_USER_KEY);

  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser) as User;
  } catch {
    await AsyncStorage.removeItem(CURRENT_USER_KEY);
    return null;
  }
}

export async function setStoredCurrentUser(user: User) {
  await AsyncStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
}

export async function clearAuthToken() {
  await Promise.all([
    AsyncStorage.removeItem(AUTH_TOKEN_KEY),
    AsyncStorage.removeItem(REFRESH_TOKEN_KEY),
    AsyncStorage.removeItem(CURRENT_USER_KEY),
  ]);
}

async function refreshAccessToken() {
  if (refreshRequest) {
    return refreshRequest;
  }

  const refreshToken = await getRefreshToken();

  if (!refreshToken) {
    await clearAuthToken();
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

      await setAuthToken(payload.data.access_token);
      await setRefreshToken(payload.data.refresh_token);

      if (payload.data.user) {
        await setStoredCurrentUser(payload.data.user);
      }

      return payload.data.access_token;
    })
    .catch(async () => {
      await clearAuthToken();
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
  const token = await getAuthToken();
  const headers = new Headers(init.headers);

  if (!(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return executeWithRefresh<T>(path, init, headers);
}
