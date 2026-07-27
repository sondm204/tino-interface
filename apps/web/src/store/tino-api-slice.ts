import { createApi, fakeBaseQuery } from "@reduxjs/toolkit/query/react";
import type { ApiResponse, PageableResponse } from "@/src/types/api";
import type {
  Attachment,
  BankAccount,
  DecodedBankQr,
  Expense,
  Notification,
  Wallet,
  WalletMember,
  WalletMemberWithUser,
  WalletSummary,
  User,
  PaymentQr,
} from "@/src/types/domain";
import {
  tinoApi,
  type AuthPayload,
  type BankAccountPayload,
  type CreatePaymentQrPayload,
  type CreateExpensePayload,
  type CreateWalletPayload,
  type ChangePasswordPayload,
  type LoginPayload,
  type ReceiptExpenseDraft,
  type RegisterPayload,
  type TelegramCode,
  type UpdateProfilePayload,
} from "@/src/services/tino-api";

type ApiError = {
  message: string;
};

async function runApi<T>(
  request: () => Promise<ApiResponse<T>>
): Promise<{ data: T } | { error: ApiError }> {
  try {
    const response = await request();

    if (response.data === null) {
      return { error: { message: response.message || "Không có dữ liệu trả về" } };
    }

    return { data: response.data };
  } catch (error) {
    return {
      error: {
        message: error instanceof Error ? error.message : "Đã có lỗi xảy ra",
      },
    };
  }
}

export const tinoApiSlice = createApi({
  reducerPath: "tinoApi",
  baseQuery: fakeBaseQuery<ApiError>(),
  keepUnusedDataFor: 60 * 60,
  tagTypes: ["Auth", "Wallets", "WalletMembers", "Expenses", "Summary", "Notifications", "BankAccounts"],
  endpoints: (builder) => ({
    login: builder.mutation<AuthPayload, LoginPayload>({
      queryFn: (payload) => runApi(() => tinoApi.login(payload)),
      invalidatesTags: ["Auth"],
    }),
    register: builder.mutation<AuthPayload, RegisterPayload>({
      queryFn: (payload) => runApi(() => tinoApi.register(payload)),
      invalidatesTags: ["Auth"],
    }),
    logout: builder.mutation<{ revoked: boolean }, void>({
      queryFn: () => runApi(() => tinoApi.logout()),
      invalidatesTags: ["Auth"],
    }),
    getCurrentUser: builder.query<User, void>({
      queryFn: () => runApi(() => tinoApi.me()),
      providesTags: ["Auth"],
    }),
    updateProfile: builder.mutation<User, UpdateProfilePayload>({
      queryFn: (payload) => runApi(() => tinoApi.updateProfile(payload)),
      invalidatesTags: ["Auth"],
    }),
    changePassword: builder.mutation<
      { updated: boolean },
      ChangePasswordPayload
    >({
      queryFn: (payload) => runApi(() => tinoApi.changePassword(payload)),
    }),
    uploadAvatar: builder.mutation<
      { user: User; object_key: string },
      File
    >({
      queryFn: (file) => runApi(() => tinoApi.uploadAvatar(file)),
      invalidatesTags: ["Auth"],
    }),
    getBankAccounts: builder.query<BankAccount[], void>({
      queryFn: () => runApi(() => tinoApi.listBankAccounts()),
      providesTags: ["BankAccounts"],
    }),
    createBankAccount: builder.mutation<BankAccount, BankAccountPayload>({
      queryFn: (payload) => runApi(() => tinoApi.createBankAccount(payload)),
      invalidatesTags: ["BankAccounts"],
    }),
    deleteBankAccount: builder.mutation<{ id: string }, string>({
      queryFn: (bankAccountId) =>
        runApi(() => tinoApi.deleteBankAccount(bankAccountId)),
      invalidatesTags: ["BankAccounts"],
    }),
    decodeBankAccountQrImage: builder.mutation<DecodedBankQr, File>({
      queryFn: (file) => runApi(() => tinoApi.decodeBankAccountQrImage(file)),
    }),
    uploadBankAccountQrImage: builder.mutation<
      BankAccount,
      { bankAccountId: string; file: File }
    >({
      queryFn: ({ bankAccountId, file }) =>
        runApi(() => tinoApi.uploadBankAccountQrImage(bankAccountId, file)),
      invalidatesTags: ["BankAccounts"],
    }),
    findUserByEmail: builder.query<User, string>({
      queryFn: (email) => runApi(() => tinoApi.findUserByEmail(email)),
    }),
    createTelegramLinkCode: builder.mutation<TelegramCode, void>({
      queryFn: () => runApi(() => tinoApi.createTelegramLinkCode()),
    }),
    createTelegramWalletConnectCode: builder.mutation<
      TelegramCode,
      string
    >({
      queryFn: (walletId) =>
        runApi(() => tinoApi.createTelegramWalletConnectCode(walletId)),
    }),
    getWallets: builder.query<
      PageableResponse<Wallet>,
      { page?: number; size?: number; month?: string } | void
    >({
      queryFn: (args) =>
        runApi(() => tinoApi.listWallets(args?.page, args?.size, args?.month)),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map((wallet) => ({
                type: "Wallets" as const,
                id: wallet.id,
              })),
              { type: "Wallets" as const, id: "LIST" },
            ]
          : [{ type: "Wallets" as const, id: "LIST" }],
    }),
    createWallet: builder.mutation<
      { wallet: Wallet; member: WalletMember },
      CreateWalletPayload
    >({
      queryFn: (payload) => runApi(() => tinoApi.createWallet(payload)),
      invalidatesTags: [{ type: "Wallets", id: "LIST" }],
    }),
    addWalletMember: builder.mutation<
      WalletMember,
      { walletId: string; userId: string }
    >({
      queryFn: ({ walletId, userId }) =>
        runApi(() => tinoApi.addWalletMember(walletId, userId)),
      invalidatesTags: (_result, _error, { walletId }) => [
        { type: "Wallets", id: walletId },
        { type: "WalletMembers", id: walletId },
        { type: "Summary", id: walletId },
      ],
    }),
    inviteWalletMember: builder.mutation<
      {
        member: WalletMember;
        user: User;
        notification_sent: boolean;
        email_sent: boolean;
      },
      { walletId: string; email: string }
    >({
      queryFn: ({ walletId, email }) =>
        runApi(() => tinoApi.inviteWalletMember(walletId, email)),
      invalidatesTags: (_result, _error, { walletId }) => [
        { type: "Wallets", id: walletId },
        { type: "WalletMembers", id: walletId },
        { type: "Summary", id: walletId },
        "Notifications",
      ],
    }),
    deleteWallet: builder.mutation<{ id: string }, string>({
      queryFn: (walletId) => runApi(() => tinoApi.deleteWallet(walletId)),
      invalidatesTags: (_result, _error, walletId) => [
        { type: "Wallets", id: "LIST" },
        { type: "Wallets", id: walletId },
        { type: "WalletMembers", id: walletId },
        { type: "Summary", id: walletId },
      ],
    }),
    leaveWallet: builder.mutation<
      { member: WalletMember; new_owner?: WalletMember; new_owner_id: string },
      { walletId: string; newOwnerUserId?: string }
    >({
      queryFn: ({ walletId, newOwnerUserId }) =>
        runApi(() => tinoApi.leaveWallet(walletId, newOwnerUserId)),
      invalidatesTags: (_result, _error, { walletId }) => [
        { type: "Wallets", id: "LIST" },
        { type: "Wallets", id: walletId },
        { type: "WalletMembers", id: walletId },
        { type: "Summary", id: walletId },
      ],
    }),
    getWalletMembers: builder.query<WalletMemberWithUser[], string>({
      queryFn: (walletId) =>
        runApi(() => tinoApi.listWalletMembers(walletId)),
      providesTags: (_result, _error, walletId) => [
        { type: "WalletMembers", id: walletId },
      ],
    }),
    getExpenses: builder.query<
      PageableResponse<Expense>,
      { walletId: string; page?: number; size?: number; month?: string }
    >({
      queryFn: ({ walletId, page, size, month }) =>
        runApi(() => tinoApi.listExpenses(walletId, page, size, month)),
      providesTags: (_result, _error, { walletId }) => [
        { type: "Expenses", id: walletId },
      ],
    }),
    getSummary: builder.query<
      WalletSummary,
      { walletId: string; month: string }
    >({
      queryFn: ({ walletId, month }) =>
        runApi(() => tinoApi.getSummary(walletId, month)),
      providesTags: (_result, _error, { walletId, month }) => [
        { type: "Summary", id: `${walletId}:${month}` },
        { type: "Summary", id: walletId },
      ],
    }),
    createPaymentQr: builder.mutation<
      PaymentQr,
      { walletId: string; payload: CreatePaymentQrPayload }
    >({
      queryFn: ({ walletId, payload }) =>
        runApi(() => tinoApi.createPaymentQr(walletId, payload)),
    }),
    createExpense: builder.mutation<
      Expense,
      { walletId: string; payload: CreateExpensePayload }
    >({
      queryFn: ({ walletId, payload }) =>
        runApi(() => tinoApi.createExpense(walletId, payload)),
      invalidatesTags: (_result, _error, { walletId }) => [
        { type: "Expenses", id: walletId },
        { type: "Summary", id: walletId },
        { type: "Wallets", id: "LIST" },
      ],
    }),
    createReceiptExpenseDraft: builder.mutation<
      ReceiptExpenseDraft,
      { walletId: string; file: File }
    >({
      queryFn: ({ walletId, file }) =>
        runApi(() => tinoApi.createReceiptExpenseDraft(walletId, file)),
    }),
    updateExpense: builder.mutation<
      Expense,
      {
        walletId: string;
        expenseId: string;
        payload: Partial<CreateExpensePayload>;
      }
    >({
      queryFn: ({ walletId, expenseId, payload }) =>
        runApi(() => tinoApi.updateExpense(walletId, expenseId, payload)),
      invalidatesTags: (_result, _error, { walletId }) => [
        { type: "Expenses", id: walletId },
        { type: "Summary", id: walletId },
        { type: "Wallets", id: "LIST" },
      ],
    }),
    uploadExpenseAttachment: builder.mutation<
      Attachment,
      { walletId: string; expenseId: string; file: File }
    >({
      queryFn: ({ walletId, expenseId, file }) =>
        runApi(() => tinoApi.uploadExpenseAttachment(walletId, expenseId, file)),
      invalidatesTags: (_result, _error, { walletId }) => [
        { type: "Expenses", id: walletId },
      ],
    }),
    deleteExpenseAttachment: builder.mutation<
      { id: string },
      { walletId: string; expenseId: string; attachmentId: string }
    >({
      queryFn: ({ walletId, expenseId, attachmentId }) =>
        runApi(() =>
          tinoApi.deleteExpenseAttachment(walletId, expenseId, attachmentId)
        ),
      invalidatesTags: (_result, _error, { walletId }) => [
        { type: "Expenses", id: walletId },
      ],
    }),
    deleteExpense: builder.mutation<
      { id: string },
      { walletId: string; expenseId: string }
    >({
      queryFn: ({ walletId, expenseId }) =>
        runApi(() => tinoApi.deleteExpense(walletId, expenseId)),
      invalidatesTags: (_result, _error, { walletId }) => [
        { type: "Expenses", id: walletId },
        { type: "Summary", id: walletId },
        { type: "Wallets", id: "LIST" },
      ],
    }),
    getNotifications: builder.query<
      PageableResponse<Notification>,
      { page?: number; size?: number } | void
    >({
      queryFn: (args) =>
        runApi(() => tinoApi.listNotifications(args?.page, args?.size)),
      providesTags: ["Notifications"],
    }),
    getUnreadNotificationCount: builder.query<{ count: number }, void>({
      queryFn: () => runApi(() => tinoApi.getUnreadNotificationCount()),
      providesTags: ["Notifications"],
    }),
    markNotificationRead: builder.mutation<Notification, string>({
      queryFn: (notificationId) =>
        runApi(() => tinoApi.markNotificationRead(notificationId)),
      invalidatesTags: ["Notifications"],
    }),
    markAllNotificationsRead: builder.mutation<
      { updated: number; read_at: string },
      void
    >({
      queryFn: () => runApi(() => tinoApi.markAllNotificationsRead()),
      invalidatesTags: ["Notifications"],
    }),
  }),
});

export const {
  useAddWalletMemberMutation,
  useChangePasswordMutation,
  useCreateExpenseMutation,
  useCreateReceiptExpenseDraftMutation,
  useCreateBankAccountMutation,
  useCreatePaymentQrMutation,
  useCreateTelegramLinkCodeMutation,
  useCreateTelegramWalletConnectCodeMutation,
  useCreateWalletMutation,
  useDecodeBankAccountQrImageMutation,
  useDeleteExpenseMutation,
  useDeleteExpenseAttachmentMutation,
  useDeleteBankAccountMutation,
  useDeleteWalletMutation,
  useGetCurrentUserQuery,
  useGetBankAccountsQuery,
  useFindUserByEmailQuery,
  useGetNotificationsQuery,
  useGetUnreadNotificationCountQuery,
  useGetExpensesQuery,
  useGetWalletMembersQuery,
  useGetWalletsQuery,
  useGetSummaryQuery,
  useInviteWalletMemberMutation,
  useLeaveWalletMutation,
  useLoginMutation,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useLogoutMutation,
  useRegisterMutation,
  useUpdateProfileMutation,
  useUpdateExpenseMutation,
  useUploadExpenseAttachmentMutation,
  useUploadAvatarMutation,
  useUploadBankAccountQrImageMutation,
} = tinoApiSlice;
