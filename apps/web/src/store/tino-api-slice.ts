import { createApi, fakeBaseQuery } from "@reduxjs/toolkit/query/react";
import type { ApiResponse, PageableResponse } from "@/src/types/api";
import type {
  Expense,
  Group,
  GroupMember,
  GroupSummary,
  User,
} from "@/src/types/domain";
import {
  tinoApi,
  type AuthPayload,
  type CreateExpensePayload,
  type CreateGroupPayload,
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
  tagTypes: ["Auth", "Users", "Groups", "Expenses", "Summary"],
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
    getUsers: builder.query<
      PageableResponse<User>,
      { page?: number; size?: number } | void
    >({
      queryFn: (args) =>
        runApi(() => tinoApi.listUsers(args?.page, args?.size)),
      providesTags: ["Users"],
    }),
    getGroups: builder.query<
      PageableResponse<Group>,
      { page?: number; size?: number; userId?: string } | void
    >({
      queryFn: (args) =>
        runApi(() =>
          tinoApi.listGroups(args?.page, args?.size, args?.userId)
        ),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map((group) => ({
                type: "Groups" as const,
                id: group.id,
              })),
              { type: "Groups" as const, id: "LIST" },
            ]
          : [{ type: "Groups" as const, id: "LIST" }],
    }),
    createGroup: builder.mutation<
      { group: Group; member: GroupMember },
      CreateGroupPayload
    >({
      queryFn: (payload) => runApi(() => tinoApi.createGroup(payload)),
      invalidatesTags: [{ type: "Groups", id: "LIST" }],
    }),
    addGroupMember: builder.mutation<
      GroupMember,
      { groupId: string; userId: string }
    >({
      queryFn: ({ groupId, userId }) =>
        runApi(() => tinoApi.addGroupMember(groupId, userId)),
      invalidatesTags: (_result, _error, { groupId }) => [
        { type: "Groups", id: groupId },
        { type: "Summary", id: groupId },
      ],
    }),
    getExpenses: builder.query<
      PageableResponse<Expense>,
      { groupId: string; page?: number; size?: number }
    >({
      queryFn: ({ groupId, page, size }) =>
        runApi(() => tinoApi.listExpenses(groupId, page, size)),
      providesTags: (_result, _error, { groupId }) => [
        { type: "Expenses", id: groupId },
      ],
    }),
    getSummary: builder.query<
      GroupSummary,
      { groupId: string; month: string }
    >({
      queryFn: ({ groupId, month }) =>
        runApi(() => tinoApi.getSummary(groupId, month)),
      providesTags: (_result, _error, { groupId, month }) => [
        { type: "Summary", id: `${groupId}:${month}` },
        { type: "Summary", id: groupId },
      ],
    }),
    createExpense: builder.mutation<
      Expense,
      { groupId: string; payload: CreateExpensePayload }
    >({
      queryFn: ({ groupId, payload }) =>
        runApi(() => tinoApi.createExpense(groupId, payload)),
      invalidatesTags: (_result, _error, { groupId }) => [
        { type: "Expenses", id: groupId },
        { type: "Summary", id: groupId },
        { type: "Groups", id: "LIST" },
      ],
    }),
    updateExpense: builder.mutation<
      Expense,
      {
        groupId: string;
        expenseId: string;
        payload: Partial<CreateExpensePayload>;
      }
    >({
      queryFn: ({ groupId, expenseId, payload }) =>
        runApi(() => tinoApi.updateExpense(groupId, expenseId, payload)),
      invalidatesTags: (_result, _error, { groupId }) => [
        { type: "Expenses", id: groupId },
        { type: "Summary", id: groupId },
        { type: "Groups", id: "LIST" },
      ],
    }),
    deleteExpense: builder.mutation<
      { id: string },
      { groupId: string; expenseId: string }
    >({
      queryFn: ({ groupId, expenseId }) =>
        runApi(() => tinoApi.deleteExpense(groupId, expenseId)),
      invalidatesTags: (_result, _error, { groupId }) => [
        { type: "Expenses", id: groupId },
        { type: "Summary", id: groupId },
        { type: "Groups", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useAddGroupMemberMutation,
  useCreateExpenseMutation,
  useCreateGroupMutation,
  useDeleteExpenseMutation,
  useGetCurrentUserQuery,
  useGetExpensesQuery,
  useGetGroupsQuery,
  useGetSummaryQuery,
  useGetUsersQuery,
  useLoginMutation,
  useLogoutMutation,
  useRegisterMutation,
  useUpdateExpenseMutation,
} = tinoApiSlice;
