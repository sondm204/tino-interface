"use client";

import Link from "next/link";
import { FormEvent, useCallback, useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, Plus, ReceiptText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/src/components/layout/app-shell";
import { Button } from "@/src/components/ui/button";
import { Card, CardBody, CardHeader } from "@/src/components/ui/card";
import { ConfirmDialog } from "@/src/components/ui/confirm-dialog";
import { EmptyState } from "@/src/components/ui/empty-state";
import { SelectField, TextAreaField, TextField } from "@/src/components/ui/field";
import { Badge } from "@/src/components/ui/status";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatCurrency, formatDate } from "@/src/lib/format";
import { settlementStatusLabel, splitMethodLabel } from "@/src/lib/labels";
import { useAppSelector } from "@/src/store/hooks";
import {
  useCreateExpenseMutation,
  useDeleteExpenseMutation,
  useGetExpensesQuery,
  useGetSummaryQuery,
  useGetUsersQuery,
} from "@/src/store/tino-api-slice";
import type { Expense, ExpenseSplit } from "@/src/types/domain";

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export function GroupDetailScreen({ groupId }: { groupId: string }) {
  const currentUser = useAppSelector((state) => state.auth.user);
  const authHydrated = useAppSelector((state) => state.auth.hydrated);
  const [month, setMonth] = useState(currentMonth());
  const {
    data: usersData,
    error: usersError,
    isLoading: usersLoading,
  } = useGetUsersQuery(undefined, { skip: !authHydrated });
  const {
    data: expensesData,
    error: expensesError,
    isLoading: expensesLoading,
  } = useGetExpensesQuery(
    { groupId, page: 1, size: 20 },
    { skip: !authHydrated }
  );
  const {
    data: summary,
    error: summaryError,
    isLoading: summaryLoading,
  } = useGetSummaryQuery(
    { groupId, month },
    { skip: !authHydrated }
  );
  const [createExpense, createExpenseState] = useCreateExpenseMutation();
  const [deleteExpense] = useDeleteExpenseMutation();
  const users = useMemo(() => usersData?.items ?? [], [usersData]);
  const expenses = expensesData?.items ?? [];
  const group = summary?.group ?? null;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [splitMethod, setSplitMethod] = useState<"equal" | "amount" | "percentage" | "shares">("equal");
  const [splitValues, setSplitValues] = useState<Record<string, string>>({});
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const queryError = [usersError, expensesError, summaryError]
    .map((error) =>
      error &&
      "message" in error &&
      typeof error.message === "string"
        ? error.message
        : null
    )
    .find(Boolean);
  const error = formError || queryError || null;
  const loading =
    !authHydrated || usersLoading || expensesLoading || summaryLoading;
  const saving = createExpenseState.isLoading;

  const currentUserGroupExpense = useMemo(() => {
    if (!currentUser || !summary) {
      return 0;
    }

    return (
      summary.member_balances.find((member) => member.user_id === currentUser.id)
        ?.share ?? 0
    );
  }, [currentUser, summary]);

  const userNameById = useMemo(() => {
    const entries = users.map((user) => [user.id, user.display_name || user.email] as const);

    if (currentUser) {
      entries.push([currentUser.id, currentUser.display_name || currentUser.email]);
    }

    return new Map(entries);
  }, [currentUser, users]);

  const getUserName = useCallback(
    (userId: string) => userNameById.get(userId) ?? userId,
    [userNameById]
  );

  const userById = useMemo(() => {
    const entries = users.map((user) => [user.id, user] as const);

    if (currentUser) {
      entries.push([currentUser.id, currentUser]);
    }

    return new Map(entries);
  }, [currentUser, users]);

  const splitMembers = useMemo(() => {
    const memberIds = summary?.member_balances.map((member) => member.user_id) ?? [];

    if (memberIds.length > 0) {
      return memberIds;
    }

    return currentUser ? [currentUser.id] : [];
  }, [currentUser, summary]);

  const splitInputMeta = useMemo(() => {
    if (splitMethod === "amount") {
      return { label: "Số tiền", suffix: group?.currency || "VND" };
    }

    if (splitMethod === "percentage") {
      return { label: "Phần trăm", suffix: "%" };
    }

    return { label: "Số phần", suffix: "phần" };
  }, [group?.currency, splitMethod]);

  const splitValueTotal = useMemo(
    () =>
      splitMembers.reduce(
        (sum, userId) => sum + Number(splitValues[userId] || 0),
        0
      ),
    [splitMembers, splitValues]
  );

  function buildExpenseSplits(totalAmount: number): ExpenseSplit[] | undefined {
    if (group?.type !== "shared" || splitMethod === "equal") {
      return undefined;
    }

    if (splitMembers.length === 0) {
      throw new Error("Nhóm chưa có thành viên để chia chi tiêu.");
    }

    const values = splitMembers.map((userId) => ({
      userId,
      value: Number(splitValues[userId] || 0),
    }));

    if (values.some((item) => !Number.isFinite(item.value) || item.value < 0)) {
      throw new Error("Giá trị chia tiền phải là số không âm.");
    }

    if (values.every((item) => item.value === 0)) {
      throw new Error("Vui lòng nhập giá trị chia cho ít nhất một thành viên.");
    }

    if (splitMethod === "amount") {
      const splitTotal = values.reduce((sum, item) => sum + item.value, 0);

      if (Math.abs(splitTotal - totalAmount) > 0.01) {
        throw new Error("Tổng số tiền chia phải bằng tổng chi tiêu.");
      }

      return values.map((item) => ({
        user_id: item.userId,
        amount: item.value,
      }));
    }

    if (splitMethod === "percentage") {
      const percentageTotal = values.reduce((sum, item) => sum + item.value, 0);

      if (Math.abs(percentageTotal - 100) > 0.01) {
        throw new Error("Tổng phần trăm phải bằng 100%.");
      }

      return values.map((item) => ({
        user_id: item.userId,
        percentage: item.value,
        amount: (totalAmount * item.value) / 100,
      }));
    }

    const totalShares = values.reduce((sum, item) => sum + item.value, 0);

    return values.map((item) => ({
      user_id: item.userId,
      shares: item.value,
      amount: (totalAmount * item.value) / totalShares,
    }));
  }

  async function handleCreateExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!currentUser) {
      const message = "Vui lòng đăng nhập trước khi thêm chi tiêu.";
      setFormError(message);
      toast.error(message);
      return;
    }

    if (!group) {
      return;
    }

    setFormError(null);

    try {
      const totalAmount = Number(amount);
      const splits = buildExpenseSplits(totalAmount);
      await createExpense({
        groupId: group.id,
        payload: {
          title,
          description,
          total_amount: totalAmount,
          currency: group.currency,
          paid_by_user_id: currentUser.id,
          created_by_user_id: currentUser.id,
          expense_date: expenseDate,
          split_method: splitMethod,
          splits,
        },
      }).unwrap();

      setTitle("");
      setDescription("");
      setAmount("");
      setExpenseDate(new Date().toISOString().slice(0, 10));
      setSplitMethod("equal");
      setSplitValues({});
      toast.success("Lưu chi tiêu thành công");
    } catch (err) {
      const message =
        typeof err === "object" &&
        err !== null &&
        "message" in err &&
        typeof err.message === "string"
          ? err.message
          : "Không thể tạo chi tiêu";
      setFormError(message);
      toast.error(message);
    }
  }

  async function handleDeleteExpense(expenseId: string) {
    if (!group) {
      return;
    }

    try {
      await deleteExpense({ groupId: group.id, expenseId }).unwrap();
      toast.success("Xóa chi tiêu thành công");
    } catch (err) {
      const message =
        typeof err === "object" &&
        err !== null &&
        "message" in err &&
        typeof err.message === "string"
          ? err.message
          : "Không thể xóa chi tiêu";
      setFormError(message);
      toast.error(message);
    }
  }

  function handleMonthChange(value: string) {
    setMonth(value);
  }

  function getUserInitials(userId: string) {
    const source = getUserName(userId);
    const words = source.trim().split(/\s+/).filter(Boolean);

    if (words.length >= 2) {
      return `${words[0][0]}${words[1][0]}`.toUpperCase();
    }

    return source.slice(0, 2).toUpperCase();
  }

  function renderUserAvatar(userId: string) {
    const user = userById.get(userId);
    const name = getUserName(userId);

    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              aria-label={name}
              className="inline-flex size-8 items-center justify-center overflow-hidden rounded-full border border-zinc-200 bg-zinc-100 text-xs font-semibold text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
              type="button"
            />
          }
        >
          {user?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt="" className="size-full object-cover" src={user.avatar_url} />
          ) : (
            getUserInitials(userId)
          )}
        </TooltipTrigger>
        <TooltipContent>{name}</TooltipContent>
      </Tooltip>
    );
  }

  function getExpenseSplitRows(expense: Expense) {
    if (expense.splits?.length) {
      return expense.splits.map((split) => ({
        userId: split.user_id,
        amount: Number(split.amount ?? 0),
        percentage: split.percentage,
        shares: split.shares,
      }));
    }

    if (splitMembers.length === 0) {
      return [];
    }

    const equalAmount = Number(expense.total_amount) / splitMembers.length;

    return splitMembers.map((userId) => ({
      userId,
      amount: equalAmount,
      percentage: null,
      shares: null,
    }));
  }

  return (
    <AppShell
      subtitle="Chi tiết nhóm"
      title={group?.name || "Nhóm"}
    >
      <div className="mb-4">
        <Link
          className="text-sm flex items-center gap-2 font-medium text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
          href="/groups"
        >
          <ArrowLeft size={16} />
          Quay lại danh sách nhóm
        </Link>
      </div>

      {error ? (
        <p className="mb-4 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
          {error}
        </p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <section className="grid gap-3 md:grid-cols-3">
            <Card className="p-4">
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Tổng tháng
              </p>
              {loading ? (
                <Skeleton className="mt-3 h-8 w-28" />
              ) : (
                <p className="mt-3 text-2xl font-semibold">
                  {formatCurrency(summary?.total_amount || 0, group?.currency || "VND")}
                </p>
              )}
            </Card>
            <Card className="p-4">
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Tổng chi tiêu cá nhân
              </p>
              {loading ? (
                <Skeleton className="mt-3 h-8 w-28" />
              ) : (
                <p className="mt-3 text-2xl font-semibold">
                  {formatCurrency(currentUserGroupExpense, group?.currency || "VND")}
                </p>
              )}
            </Card>
            <Card className="p-4">
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Quyết toán
              </p>
              {loading ? (
                <Skeleton className="mt-3 h-8 w-16" />
              ) : (
                <p className="mt-3 text-2xl font-semibold">
                  {summary?.settlements.length || 0}
                </p>
              )}
            </Card>
          </section>

          <Card>
            <CardHeader
              action={
                <div className="flex items-center gap-2">
                  <CalendarDays size={16} />
                  <input
                    className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none dark:border-zinc-800 dark:bg-zinc-950"
                    onChange={(event) => void handleMonthChange(event.target.value)}
                    type="month"
                    value={month}
                  />
                </div>
              }
              description="Các khoản chi tiêu hiện tại của nhóm"
              title="Chi tiêu"
            />
            {loading ? (
              <div className="px-2 pb-2">
                <div className="min-w-[760px] divide-y divide-zinc-200 dark:divide-zinc-800">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <div
                      className="grid grid-cols-[1.6fr_0.8fr_0.7fr_0.8fr_0.8fr_40px] items-center gap-4 px-2 py-4"
                      key={index}
                    >
                      <div className="space-y-2">
                        <Skeleton className="h-5 w-44" />
                        <Skeleton className="h-4 w-56" />
                      </div>
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="size-8 rounded-full" />
                      <Skeleton className="h-6 w-20 rounded-full" />
                      <Skeleton className="ml-auto h-5 w-24" />
                      <Skeleton className="size-8" />
                    </div>
                  ))}
                </div>
              </div>
            ) : expenses.length === 0 ? (
              <EmptyState
                description="Thêm tiền nhà, ăn uống, điện nước hoặc bất kỳ khoản chi chung nào."
                icon={<ReceiptText size={20} />}
                title="Chưa có khoản chi nào"
              />
            ) : (
              <div className="px-2 pb-2">
                <Table className="min-w-[760px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Khoản chi</TableHead>
                      <TableHead>Ngày</TableHead>
                      <TableHead>Người trả</TableHead>
                      {group?.type === "shared" && <TableHead>Cách chia</TableHead>}
                      <TableHead className="text-right">Số tiền</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map((expense) => (
                      <TableRow
                        className="cursor-pointer"
                        key={expense.id}
                        onClick={() => setSelectedExpense(expense)}
                      >
                        <TableCell>
                          <p className="font-semibold">{expense.title}</p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {expense.description || ""}
                          </p>
                        </TableCell>
                        <TableCell className="text-zinc-600 dark:text-zinc-300">
                          {formatDate(expense.expense_date)}
                        </TableCell>
                        <TableCell>
                        {renderUserAvatar(expense.paid_by_user_id)}
                        </TableCell>
                        {group?.type === "shared" && (
                          <TableCell className="text-zinc-600 dark:text-zinc-300">
                            {splitMethodLabel(expense.split_method)}
                          </TableCell>
                        )}
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(expense.total_amount, expense.currency)}
                        </TableCell>
                        <TableCell onClick={(event) => event.stopPropagation()}>
                          <ConfirmDialog
                            confirmText="Xóa"
                            description={`Khoản chi "${expense.title}" sẽ bị xóa khỏi nhóm.`}
                            destructive
                            onConfirm={() => handleDeleteExpense(expense.id)}
                            title="Xóa khoản chi?"
                            trigger={
                              <Button
                                aria-label="Xóa chi tiêu"
                                className="ml-auto"
                                size="icon"
                                type="button"
                                variant="ghost"
                              >
                                <Trash2 size={16} />
                              </Button>
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>

          <section className="grid gap-5 xl:grid-cols-2">
            <Card>
              <CardHeader
                description="Tổng số tiền từng thành viên đã thanh toán trong tháng"
                title="Thành viên đã chi"
              />
              {loading ? (
                <CardBody className="space-y-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div
                      className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800"
                      key={index}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                        <Skeleton className="h-5 w-20" />
                      </div>
                    </div>
                  ))}
                </CardBody>
              ) : (
                <CardBody className="space-y-3">
                  {summary?.member_balances.length ? (
                    summary.member_balances.map((member) => (
                      <div
                        className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800"
                        key={member.user_id}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold">{getUserName(member.user_id)}</p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                              Phần cần chịu {formatCurrency(member.share, summary.currency)}
                            </p>
                          </div>
                          <p className="font-semibold">
                            {formatCurrency(member.paid, summary.currency)}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      Chưa có dữ liệu chi tiêu của thành viên.
                    </p>
                  )}
                </CardBody>
              )}
            </Card>

            <Card>
              <CardHeader
                description="Gợi ý chuyển tiền cho tháng đang chọn"
                title="Gợi ý quyết toán"
              />
              {loading ? (
                <CardBody className="space-y-3">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div
                      className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800"
                      key={index}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <Skeleton className="h-4 w-44" />
                        <Skeleton className="h-6 w-20 rounded-full" />
                      </div>
                      <Skeleton className="mt-3 h-6 w-28" />
                    </div>
                  ))}
                </CardBody>
              ) : (
                <CardBody className="space-y-3">
                  {summary?.settlements.length ? (
                    summary.settlements.map((settlement) => (
                      <div
                        className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800"
                        key={`${settlement.from_user_id}-${settlement.to_user_id}`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="truncate text-sm">
                            <span className="font-semibold">
                              {getUserName(settlement.from_user_id)}
                            </span>{" "}
                            trả cho{" "}
                            <span className="font-semibold">
                              {getUserName(settlement.to_user_id)}
                            </span>
                          </p>
                          <Badge tone="amber">{settlementStatusLabel("pending")}</Badge>
                        </div>
                        <p className="mt-2 text-lg font-semibold">
                          {formatCurrency(settlement.amount, settlement.currency)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      Tháng này chưa cần quyết toán.
                    </p>
                  )}
                </CardBody>
              )}
            </Card>
          </section>
        </div>

        <Card>
          <CardHeader
            description="Lưu khoản chi vào nhóm đang chọn"
            title="Thêm chi tiêu"
          />
          <CardBody>
            <form className="space-y-4" id="create-expense-form" onSubmit={handleCreateExpense}>
              <TextField
                label="Tên khoản chi"
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Tiền nhà tháng này"
                required
                value={title}
              />
              <TextAreaField
                label="Mô tả"
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Thông tin bổ sung"
                value={description}
              />
              <div className="grid grid-cols-2 gap-3">
                <TextField
                  label="Số tiền"
                  min="1"
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="0"
                  required
                  type="number"
                  value={amount}
                />
                <TextField
                  label="Ngày"
                  onChange={(event) => setExpenseDate(event.target.value)}
                  required
                  type="date"
                  value={expenseDate}
                />
              </div>
              {group?.type === "shared" && (
                <>
                <SelectField
                  label="Cách chia"
                  onValueChange={(value) => {
                    setSplitMethod(
                      value as "equal" | "amount" | "percentage" | "shares"
                    );
                    setSplitValues({});
                  }}
                  options={[
                    { value: "equal", label: "Chia đều" },
                    { value: "amount", label: "Theo số tiền" },
                    { value: "percentage", label: "Theo phần trăm" },
                    { value: "shares", label: "Theo phần" },
                  ]}
                  value={splitMethod}
                />
                {splitMethod !== "equal" ? (
                  <div className="space-y-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                    <div>
                      <p className="text-sm font-semibold">
                        Giá trị chia theo thành viên
                      </p>
                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        Nhập {splitInputMeta.label.toLowerCase()} cho từng thành viên.
                      </p>
                    </div>
                    <div className="space-y-2">
                      {splitMembers.map((userId) => (
                        <div
                          className="grid grid-cols-[minmax(0,1fr)_130px] items-center gap-3"
                          key={userId}
                        >
                          <p className="truncate text-sm font-medium">
                            {getUserName(userId)}
                          </p>
                          <div className="flex items-center gap-2">
                            <input
                              className="h-9 min-w-0 rounded-md border border-zinc-200 bg-white px-3 text-right text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950"
                              min="0"
                              onChange={(event) =>
                                setSplitValues((current) => ({
                                  ...current,
                                  [userId]: event.target.value,
                                }))
                              }
                              placeholder="0"
                              step="0.01"
                              type="number"
                              value={splitValues[userId] ?? ""}
                            />
                            <span className="w-10 text-xs text-zinc-500 dark:text-zinc-400">
                              {splitInputMeta.suffix}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Tổng đang nhập:{" "}
                      <span className="font-medium text-zinc-950 dark:text-zinc-50">
                        {splitMethod === "amount"
                          ? formatCurrency(splitValueTotal, group.currency)
                          : `${splitValueTotal} ${splitInputMeta.suffix}`}
                      </span>
                    </p>
                  </div>
                ) : null}
                </>
              )}

              <Button className="w-full" disabled={saving} type="submit">
                <Plus size={17} />
                {saving ? "Đang lưu..." : "Lưu chi tiêu"}
              </Button>
            </form>
          </CardBody>
        </Card>
      </div>

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setSelectedExpense(null);
          }
        }}
        open={selectedExpense !== null}
      >
        <DialogContent className="sm:max-w-xl">
          {selectedExpense ? (
            <>
              <DialogHeader>
                <DialogTitle>{selectedExpense.title}</DialogTitle>
                <DialogDescription>
                  {selectedExpense.description || "Chi tiết khoản chi trong nhóm."}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    Người trả
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    {renderUserAvatar(selectedExpense.paid_by_user_id)}
                    <p className="text-sm font-semibold">
                      {getUserName(selectedExpense.paid_by_user_id)}
                    </p>
                  </div>
                </div>
                <div className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    Tổng tiền
                  </p>
                  <p className="mt-2 text-lg font-semibold">
                    {formatCurrency(
                      selectedExpense.total_amount,
                      selectedExpense.currency
                    )}
                  </p>
                </div>
                <div className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    Ngày chi
                  </p>
                  <p className="mt-2 text-sm font-semibold">
                    {formatDate(selectedExpense.expense_date)}
                  </p>
                </div>
                <div className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    Cách chia
                  </p>
                  <p className="mt-2 text-sm font-semibold">
                    {splitMethodLabel(selectedExpense.split_method)}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold">Phần chia</p>
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    Số tiền mỗi thành viên chịu cho khoản chi này.
                  </p>
                </div>
                <div className="space-y-2">
                  {getExpenseSplitRows(selectedExpense).map((split) => (
                    <div
                      className="flex items-center justify-between gap-3 rounded-md border border-zinc-200 p-3 dark:border-zinc-800"
                      key={split.userId}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        {renderUserAvatar(split.userId)}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">
                            {getUserName(split.userId)}
                          </p>
                          {selectedExpense.split_method === "percentage" &&
                          split.percentage ? (
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                              {Number(split.percentage)}%
                            </p>
                          ) : null}
                          {selectedExpense.split_method === "shares" && split.shares ? (
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                              {Number(split.shares)} phần
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <p className="shrink-0 text-sm font-semibold">
                        {formatCurrency(split.amount, selectedExpense.currency)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
