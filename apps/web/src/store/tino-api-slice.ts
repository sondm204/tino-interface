import { createApi, fakeBaseQuery } from "@reduxjs/toolkit/query/react";
import type { ApiResponse, PageableResponse } from "@/src/types/api";
import type {
  Expense,
  Wallet,
  WalletMember,
  WalletMemberWithUser,
  WalletSummary,
  User,
} from "@/src/types/domain";
import {
  tinoApi,
  type AuthPayload,
  type CreateExpensePayload,
  type CreateWalletPayload,
  type LoginPayload,
  type RegisterPayload,
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
    getWalletMembers: builder.query<WalletMemberWithUser[], string>({
      queryFn: (walletId) =>
        runApi(() => tinoApi.listWalletMembers(walletId)),
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
  useAddWalletMemberMutation,
  useCreateExpenseMutation,
  useCreateWalletMutation,
  useDeleteExpenseMutation,
  useGetCurrentUserQuery,
  useGetExpensesQuery,
  useGetWalletMembersQuery,
  useGetWalletsQuery,
  useGetSummaryQuery,
  useLoginMutation,
  useLogoutMutation,
  useRegisterMutation,
  useUpdateExpenseMutation,
} = tinoApiSlice;
