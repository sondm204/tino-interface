import { createApi, fakeBaseQuery } from "@reduxjs/toolkit/query/react";
import type { ApiResponse, PageableResponse } from "@/types/api";
import type {
  Expense,
  User,
  Wallet,
  WalletMember,
  WalletMemberWithUser,
  WalletSummary,
} from "@/types/domain";
import {
  tinoApi,
  type AuthPayload,
  type ChangePasswordPayload,
  type CreateExpensePayload,
  type CreateWalletPayload,
  type LoginPayload,
  type RegisterPayload,
  type UpdateProfilePayload,
  type UploadAvatarFile,
} from "@/services/tino-api";

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
  tagTypes: ["Auth", "Wallets", "WalletMembers", "Expenses", "Summary"],
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
    changePassword: builder.mutation<{ updated: boolean }, ChangePasswordPayload>({
      queryFn: (payload) => runApi(() => tinoApi.changePassword(payload)),
    }),
    uploadAvatar: builder.mutation<
      { user: User; object_key: string },
      UploadAvatarFile
    >({
      queryFn: (file) => runApi(() => tinoApi.uploadAvatar(file)),
      invalidatesTags: ["Auth"],
    }),
    getWallets: builder.query<
      PageableResponse<Wallet>,
      { page?: number; size?: number } | void
    >({
      queryFn: (args) =>
        runApi(() => tinoApi.listWallets(args?.page, args?.size)),
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
    getWalletMembers: builder.query<WalletMemberWithUser[], string>({
      queryFn: (walletId) => runApi(() => tinoApi.listWalletMembers(walletId)),
      providesTags: (_result, _error, walletId) => [
        { type: "WalletMembers", id: walletId },
      ],
    }),
    getExpenses: builder.query<
      PageableResponse<Expense>,
      { walletId: string; page?: number; size?: number }
    >({
      queryFn: ({ walletId, page, size }) =>
        runApi(() => tinoApi.listExpenses(walletId, page, size)),
      providesTags: (_result, _error, { walletId }) => [
        { type: "Expenses", id: walletId },
      ],
    }),
    getSummary: builder.query<WalletSummary, { walletId: string; month: string }>({
      queryFn: ({ walletId, month }) =>
        runApi(() => tinoApi.getSummary(walletId, month)),
      providesTags: (_result, _error, { walletId, month }) => [
        { type: "Summary", id: `${walletId}:${month}` },
        { type: "Summary", id: walletId },
      ],
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
  }),
});

export const {
  useChangePasswordMutation,
  useCreateExpenseMutation,
  useCreateWalletMutation,
  useDeleteExpenseMutation,
  useGetCurrentUserQuery,
  useGetExpensesQuery,
  useGetSummaryQuery,
  useGetWalletMembersQuery,
  useGetWalletsQuery,
  useLoginMutation,
  useLogoutMutation,
  useRegisterMutation,
  useUpdateProfileMutation,
  useUploadAvatarMutation,
} = tinoApiSlice;
