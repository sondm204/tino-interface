import {
  apiRequest,
  getRefreshToken,
} from "@/src/lib/api-client";
import type { PageableResponse } from "@/src/types/api";
import type {
  Attachment,
  Expense,
  ExpenseSplit,
  Notification,
  Wallet,
  WalletMember,
  WalletMemberWithUser,
  WalletSummary,
  User,
} from "@/src/types/domain";

export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = LoginPayload & {
  display_name: string;
  avatar_url?: string | null;
};

export type AuthPayload = {
  user: User;
  access_token: string;
  refresh_token: string;
  access_token_expires_in: number;
};

export type CreateWalletPayload = {
  name: string;
  description?: string | null;
  type: "personal" | "shared";
  currency: "VND" | "USD";
};

export type CreateExpensePayload = {
  category_id?: string | null;
  title: string;
  description?: string | null;
  total_amount: number;
  currency: "VND" | "USD";
  paid_by_user_id: string;
  expense_date: string;
  split_method: "equal" | "amount" | "percentage" | "shares";
  splits?: ExpenseSplit[];
};

export type UpdateProfilePayload = {
  display_name: string;
};

export type ChangePasswordPayload = {
  current_password: string;
  new_password: string;
};

export type TelegramCode = {
  code: string;
  expires_at: string;
};

export const tinoApi = {
  register: (payload: RegisterPayload) =>
    apiRequest<AuthPayload>("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  login: (payload: LoginPayload) =>
    apiRequest<AuthPayload>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  me: () => apiRequest<User>("/auth/me"),
  refresh: (refreshToken: string) =>
    apiRequest<AuthPayload>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken }),
    }),
  logout: () =>
    apiRequest<{ revoked: boolean }>("/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refresh_token: getRefreshToken() }),
    }),
  updateProfile: (payload: UpdateProfilePayload) =>
    apiRequest<User>("/api/users/me", {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  changePassword: (payload: ChangePasswordPayload) =>
    apiRequest<{ updated: boolean }>("/api/users/me/password", {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  uploadAvatar: (file: File) => {
    const formData = new FormData();
    formData.append("avatar", file);

    return apiRequest<{ user: User; object_key: string }>("/api/users/me/avatar", {
      method: "POST",
      body: formData,
    });
  },
  createTelegramLinkCode: () =>
    apiRequest<TelegramCode>("/api/telegram/link-code", {
      method: "POST",
    }),
  createTelegramWalletConnectCode: (walletId: string) =>
    apiRequest<TelegramCode>(
      `/api/telegram/wallets/${walletId}/connect-code`,
      { method: "POST" }
    ),
  listWallets: (page = 1, size = 20, month?: string) => {
    const params = new URLSearchParams({
      page: String(page),
      size: String(size),
    });

    if (month) {
      params.set("month", month);
    }

    return apiRequest<PageableResponse<Wallet>>(`/api/wallets?${params.toString()}`);
  },
  getWallet: (walletId: string) => apiRequest<Wallet>(`/api/wallets/${walletId}`),
  listWalletMembers: (walletId: string) =>
    apiRequest<WalletMemberWithUser[]>(`/api/wallets/${walletId}/members`),
  createWallet: (payload: CreateWalletPayload) =>
    apiRequest<{ wallet: Wallet; member: WalletMember }>("/api/wallets", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  addWalletMember: (walletId: string, userId: string) =>
    apiRequest<WalletMember>(`/api/wallets/${walletId}/members`, {
      method: "POST",
      body: JSON.stringify({ user_id: userId }),
    }),
  deleteWallet: (walletId: string) =>
    apiRequest<{ id: string }>(`/api/wallets/${walletId}`, {
      method: "DELETE",
    }),
  getSummary: (walletId: string, month: string) =>
    apiRequest<WalletSummary>(`/api/wallets/${walletId}/summary?month=${month}`),
  listExpenses: (walletId: string, page = 1, size = 20, month?: string) => {
    const params = new URLSearchParams({
      page: String(page),
      size: String(size),
    });

    if (month) {
      params.set("month", month);
    }

    return apiRequest<PageableResponse<Expense>>(
      `/api/wallets/${walletId}/expenses?${params.toString()}`
    );
  },
  createExpense: (walletId: string, payload: CreateExpensePayload) =>
    apiRequest<Expense>(`/api/wallets/${walletId}/expenses`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateExpense: (
    walletId: string,
    expenseId: string,
    payload: Partial<CreateExpensePayload>
  ) =>
    apiRequest<Expense>(`/api/wallets/${walletId}/expenses/${expenseId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteExpense: (walletId: string, expenseId: string) =>
    apiRequest<{ id: string }>(`/api/wallets/${walletId}/expenses/${expenseId}`, {
      method: "DELETE",
    }),
  uploadExpenseAttachment: (
    walletId: string,
    expenseId: string,
    file: File
  ) => {
    const formData = new FormData();
    formData.append("attachment", file);

    return apiRequest<Attachment>(
      `/api/wallets/${walletId}/expenses/${expenseId}/attachments`,
      { method: "POST", body: formData }
    );
  },
  deleteExpenseAttachment: (
    walletId: string,
    expenseId: string,
    attachmentId: string
  ) =>
    apiRequest<{ id: string }>(
      `/api/wallets/${walletId}/expenses/${expenseId}/attachments/${attachmentId}`,
      { method: "DELETE" }
    ),
  listNotifications: (page = 1, size = 50) =>
    apiRequest<PageableResponse<Notification>>(
      `/api/notifications?page=${page}&size=${size}`
    ),
  getUnreadNotificationCount: () =>
    apiRequest<{ count: number }>("/api/notifications/unread-count"),
  markNotificationRead: (notificationId: string) =>
    apiRequest<Notification>(`/api/notifications/${notificationId}/read`, {
      method: "PATCH",
    }),
  markAllNotificationsRead: () =>
    apiRequest<{ updated: number; read_at: string }>(
      "/api/notifications/read-all",
      { method: "PATCH" }
    ),
};
