import {
  apiRequest,
  getRefreshToken,
} from "@/src/lib/api-client";
import type { PageableResponse } from "@/src/types/api";
import type {
  Attachment,
  BankAccount,
  DecodedBankQr,
  Expense,
  ExpenseSplit,
  Notification,
  Wallet,
  WalletMember,
  WalletMemberWithUser,
  WalletSummary,
  User,
  PaymentQr,
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

export type ReceiptExpenseDraft = {
  title: string;
  description: string | null;
  total_amount: number | null;
  expense_date: string;
  merchant_name: string | null;
  confidence: number | null;
  source: {
    model_id: string;
    api_version: string;
  };
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

export type RegisterPushDevicePayload = {
  device_id: string;
  platform: "ios" | "android" | "web";
  fcm_token: string;
  app_version?: string | null;
  device_name?: string | null;
};

export type BankAccountPayload = {
  bank_name: string;
  bank_bin: string;
  account_number: string;
  account_name: string;
  is_default?: boolean;
};

export type CreatePaymentQrPayload = {
  to_user_id: string;
  amount: number;
  currency: "VND" | "USD";
  content?: string;
  month?: string;
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
  listBankAccounts: () =>
    apiRequest<BankAccount[]>("/api/users/me/bank-accounts"),
  createBankAccount: (payload: BankAccountPayload) =>
    apiRequest<BankAccount>("/api/users/me/bank-accounts", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  deleteBankAccount: (bankAccountId: string) =>
    apiRequest<{ id: string }>(`/api/users/me/bank-accounts/${bankAccountId}`, {
      method: "DELETE",
    }),
  decodeBankAccountQrImage: (file: File) => {
    const formData = new FormData();
    formData.append("qr_image", file);

    return apiRequest<DecodedBankQr>("/api/users/me/bank-accounts/qr-decode", {
      method: "POST",
      body: formData,
    });
  },
  uploadBankAccountQrImage: (bankAccountId: string, file: File) => {
    const formData = new FormData();
    formData.append("qr_image", file);

    return apiRequest<BankAccount>(
      `/api/users/me/bank-accounts/${bankAccountId}/qr-image`,
      { method: "POST", body: formData }
    );
  },
  findUserByEmail: (email: string) => {
    const params = new URLSearchParams({ email });

    return apiRequest<User>(`/api/users/lookup?${params.toString()}`);
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
  inviteWalletMember: (walletId: string, email: string) =>
    apiRequest<{
      member: WalletMember;
      user: User;
      notification_sent: boolean;
      email_sent: boolean;
    }>(`/api/wallets/${walletId}/invitations`, {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  deleteWallet: (walletId: string) =>
    apiRequest<{ id: string }>(`/api/wallets/${walletId}`, {
      method: "DELETE",
    }),
  leaveWallet: (walletId: string, newOwnerUserId?: string) =>
    apiRequest<{
      member: WalletMember;
      new_owner?: WalletMember;
      new_owner_id: string;
    }>(`/api/wallets/${walletId}/leave`, {
      method: "POST",
      body: JSON.stringify(
        newOwnerUserId ? { new_owner_user_id: newOwnerUserId } : {}
      ),
    }),
  getSummary: (walletId: string, month: string) =>
    apiRequest<WalletSummary>(`/api/wallets/${walletId}/summary?month=${month}`),
  createPaymentQr: (walletId: string, payload: CreatePaymentQrPayload) =>
    apiRequest<PaymentQr>(`/api/wallets/${walletId}/payment-qr`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
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
  createReceiptExpenseDraft: (walletId: string, file: File) => {
    const formData = new FormData();
    formData.append("receipt", file);

    return apiRequest<ReceiptExpenseDraft>(
      `/api/wallets/${walletId}/expenses/receipt-draft`,
      { method: "POST", body: formData }
    );
  },
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
  registerPushDevice: (payload: RegisterPushDevicePayload) =>
    apiRequest("/api/push-devices", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  unregisterPushDevice: (deviceId: string) =>
    apiRequest<{ revoked: number }>(
      `/api/push-devices/${encodeURIComponent(deviceId)}`,
      { method: "DELETE" }
    ),
};
