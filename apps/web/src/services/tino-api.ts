import { apiRequest } from "@/src/lib/api-client";
import type { PageableResponse } from "@/src/types/api";
import type { Expense, ExpenseSplit, Group, GroupMember, GroupSummary, User } from "@/src/types/domain";

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
  token: string;
};

export type CreateGroupPayload = {
  name: string;
  description?: string | null;
  type: "personal" | "shared";
  currency: "VND" | "USD";
  owner_id: string;
};

export type CreateExpensePayload = {
  category_id?: string | null;
  title: string;
  description?: string | null;
  total_amount: number;
  currency: "VND" | "USD";
  paid_by_user_id: string;
  created_by_user_id: string;
  expense_date: string;
  split_method: "equal" | "amount" | "percentage" | "shares";
  splits?: ExpenseSplit[];
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
  logout: () =>
    apiRequest<{ revoked: boolean }>("/auth/logout", {
      method: "POST",
      body: JSON.stringify({}),
    }),
  listUsers: (page = 1, size = 100) =>
    apiRequest<PageableResponse<User>>(`/api/users?page=${page}&size=${size}`),
  listGroups: (page = 1, size = 20) =>
    apiRequest<PageableResponse<Group>>(`/api/groups?page=${page}&size=${size}`),
  getGroup: (groupId: string) => apiRequest<Group>(`/api/groups/${groupId}`),
  createGroup: (payload: CreateGroupPayload) =>
    apiRequest<{ group: Group; member: GroupMember }>("/api/groups", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  addGroupMember: (groupId: string, userId: string) =>
    apiRequest<GroupMember>(`/api/groups/${groupId}/members`, {
      method: "POST",
      body: JSON.stringify({ user_id: userId }),
    }),
  getSummary: (groupId: string, month: string) =>
    apiRequest<GroupSummary>(`/api/groups/${groupId}/summary?month=${month}`),
  listExpenses: (groupId: string, page = 1, size = 20) =>
    apiRequest<PageableResponse<Expense>>(
      `/api/groups/${groupId}/expenses?page=${page}&size=${size}`
    ),
  createExpense: (groupId: string, payload: CreateExpensePayload) =>
    apiRequest<Expense>(`/api/groups/${groupId}/expenses`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateExpense: (
    groupId: string,
    expenseId: string,
    payload: Partial<CreateExpensePayload>
  ) =>
    apiRequest<Expense>(`/api/groups/${groupId}/expenses/${expenseId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteExpense: (groupId: string, expenseId: string) =>
    apiRequest<{ id: string }>(`/api/groups/${groupId}/expenses/${expenseId}`, {
      method: "DELETE",
    }),
};
