export type User = {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string | null;
};

export type Wallet = {
  id: string;
  name: string;
  description: string | null;
  type: "personal" | "shared";
  currency: "VND" | "USD";
  owner_id: string;
  created_at: string;
  updated_at: string | null;
  deleted_at?: string | null;
  total_amount?: number;
  user_share_amount?: number;
};

export type WalletMember = {
  id: string;
  wallet_id: string;
  user_id: string;
  role: "owner" | "member";
  status: "active" | "inactive";
  joined_at: string;
};

export type WalletMemberWithUser = WalletMember & {
  user: Pick<User, "id" | "email" | "display_name" | "avatar_url" | "status">;
};

export type ExpenseSplit = {
  user_id: string;
  amount?: number | null;
  percentage?: number | null;
  shares?: number | null;
};

export type Attachment = {
  id: string;
  expense_id: string;
  file_url: string;
  file_path: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  uploaded_by_user_id: string;
  created_at: string;
};

export type Expense = {
  id: string;
  wallet_id: string;
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
  splits?: ExpenseSplit[];
  attachments?: Attachment[];
};

export type WalletSummary = {
  wallet: Wallet;
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

export type Notification = {
  id: string;
  user_id: string;
  created_by: string | null;
  type: "EXPENSE_CREATED" | "EXPENSE_UPDATED" | "SYSTEM";
  title: string;
  message: string;
  status: "UNREAD" | "READ";
  metadata: {
    wallet_id?: string;
    expense_id?: string;
    [key: string]: unknown;
  };
  created_at: string;
  read_at: string | null;
  creator?: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  } | null;
};
