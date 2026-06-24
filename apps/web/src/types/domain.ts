export type User = {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string | null;
};

export type Group = {
  id: string;
  name: string;
  description: string | null;
  type: "personal" | "shared";
  currency: "VND" | "USD";
  owner_id: string;
  created_at: string;
  updated_at: string | null;
};

export type GroupMember = {
  id: string;
  group_id: string;
  user_id: string;
  role: "owner" | "member";
  status: "active" | "inactive";
  joined_at: string;
};

export type ExpenseSplit = {
  user_id: string;
  amount?: number | null;
  percentage?: number | null;
  shares?: number | null;
};

export type Expense = {
  id: string;
  group_id: string;
  category_id: string | null;
  title: string;
  description: string | null;
  total_amount: number;
  currency: "VND" | "USD";
  paid_by_user_id: string;
  created_by_user_id: string;
  expense_date: string;
  split_method: "equal" | "amount" | "percentage" | "shares";
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
};

export type GroupSummary = {
  group: Group;
  period_start: string;
  period_end: string;
  total_amount: number;
  currency: "VND" | "USD";
  member_balances: Array<{
    user_id: string;
    paid: number;
    share: number;
    balance: number;
  }>;
  settlements: Array<{
    from_user_id: string;
    to_user_id: string;
    amount: number;
    currency: "VND" | "USD";
  }>;
};
