import {
  apiRequest,
  getRefreshToken,
} from "@/src/lib/api-client";
import type { PageableResponse } from "@/src/types/api";
import type {
  Expense,
  ExpenseSplit,
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
  listWallets: (page = 1, size = 20) => {
    const params = new URLSearchParams({
      page: String(page),
      size: String(size),
    });

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
  getSummary: (walletId: string, month: string) =>
    apiRequest<WalletSummary>(`/api/wallets/${walletId}/summary?month=${month}`),
  listExpenses: (walletId: string, page = 1, size = 20) =>
    apiRequest<PageableResponse<Expense>>(
      `/api/wallets/${walletId}/expenses?page=${page}&size=${size}`
    ),
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
};
