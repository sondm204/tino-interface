"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Plus, ReceiptText, Trash2 } from "lucide-react";
import { AppShell } from "@/src/components/layout/app-shell";
import { Button } from "@/src/components/ui/button";
import { Card, CardBody, CardHeader } from "@/src/components/ui/card";
import { EmptyState } from "@/src/components/ui/empty-state";
import { SelectField, TextAreaField, TextField } from "@/src/components/ui/field";
import { Badge } from "@/src/components/ui/status";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/src/lib/format";
import { settlementStatusLabel, splitMethodLabel } from "@/src/lib/labels";
import { tinoApi } from "@/src/services/tino-api";
import type { Expense, Group, GroupSummary, User } from "@/src/types/domain";

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

export function GroupDetailScreen({ groupId }: { groupId: string }) {
  const [group, setGroup] = useState<Group | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<GroupSummary | null>(null);
  const [month, setMonth] = useState(currentMonth());
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [splitMethod, setSplitMethod] = useState<"equal" | "amount" | "percentage" | "shares">("equal");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const totalExpense = useMemo(
    () => expenses.reduce((sum, expense) => sum + Number(expense.total_amount), 0),
    [expenses]
  );

  const loadData = useCallback(async (targetMonth = month) => {
    setError(null);
    setLoading(true);

    try {
      const [meResponse, groupResponse, expensesResponse, summaryResponse] =
        await Promise.all([
          tinoApi.me().catch(() => ({ data: null })),
          tinoApi.getGroup(groupId),
          tinoApi.listExpenses(groupId),
          tinoApi.getSummary(groupId, targetMonth),
        ]);

      setCurrentUser(meResponse.data);
      setGroup(groupResponse.data);
      setExpenses(expensesResponse.data?.items ?? []);
      setSummary(summaryResponse.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải thông tin nhóm");
    } finally {
      setLoading(false);
    }
  }, [groupId, month]);

  useEffect(() => {
    async function run() {
      await loadData();
    }

    void run();
  }, [loadData]);

  async function handleCreateExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!currentUser) {
      setError("Vui lòng đăng nhập trước khi thêm chi tiêu.");
      return;
    }

    if (!group) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await tinoApi.createExpense(group.id, {
        title,
        description,
        total_amount: Number(amount),
        currency: group.currency,
        paid_by_user_id: currentUser.id,
        created_by_user_id: currentUser.id,
        expense_date: expenseDate,
        split_method: splitMethod,
      });

      const createdExpense = response.data;

      if (createdExpense) {
        setExpenses((current) => [createdExpense, ...current]);
      }

      setTitle("");
      setDescription("");
      setAmount("");
      setExpenseDate(new Date().toISOString().slice(0, 10));
      setSplitMethod("equal");
      await loadData(month);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tạo chi tiêu");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteExpense(expenseId: string) {
    if (!group) {
      return;
    }

    try {
      await tinoApi.deleteExpense(group.id, expenseId);
      setExpenses((current) => current.filter((expense) => expense.id !== expenseId));
      await loadData(month);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể xóa chi tiêu");
    }
  }

  async function handleMonthChange(value: string) {
    setMonth(value);
    await loadData(value);
  }

  return (
    <AppShell
      action={
        <Button className="hidden sm:inline-flex" form="create-expense-form" type="submit">
          <Plus size={17} />
          Thêm chi tiêu
        </Button>
      }
      subtitle="Chi tiết nhóm"
      title={group?.name || "Nhóm"}
    >
      <div className="mb-4">
        <Link
          className="text-sm font-medium text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
          href="/groups"
        >
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
                Chi tiêu đang hiển thị
              </p>
              <p className="mt-3 text-2xl font-semibold">
                {formatCurrency(totalExpense, group?.currency || "VND")}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Tổng tháng
              </p>
              <p className="mt-3 text-2xl font-semibold">
                {formatCurrency(summary?.total_amount || 0, group?.currency || "VND")}
              </p>
            </Card>
            <Card className="p-4">
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Quyết toán
              </p>
              <p className="mt-3 text-2xl font-semibold">
                {summary?.settlements.length || 0}
              </p>
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
              <CardBody>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Đang tải chi tiêu...
                </p>
              </CardBody>
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
                      <TableHead>Cách chia</TableHead>
                      <TableHead className="text-right">Số tiền</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell>
                          <p className="font-semibold">{expense.title}</p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {expense.description || "Chưa có mô tả"}
                          </p>
                        </TableCell>
                        <TableCell className="text-zinc-600 dark:text-zinc-300">
                          {formatDate(expense.expense_date)}
                        </TableCell>
                        <TableCell>
                          <Badge>{splitMethodLabel(expense.split_method)}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(expense.total_amount, expense.currency)}
                        </TableCell>
                        <TableCell>
                          <Button
                            aria-label="Xóa chi tiêu"
                            className="ml-auto"
                            onClick={() => void handleDeleteExpense(expense.id)}
                            size="icon"
                            type="button"
                            variant="ghost"
                          >
                            <Trash2 size={16} />
                          </Button>
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
                description="Số đã trả trừ đi phần cần chịu"
                title="Cân bằng thành viên"
              />
              <CardBody className="space-y-3">
                {summary?.member_balances.length ? (
                  summary.member_balances.map((member) => (
                    <div
                      className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800"
                      key={member.user_id}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold">{member.user_id}</p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            Đã trả {formatCurrency(member.paid, summary.currency)}
                          </p>
                        </div>
                        <p
                          className={
                            member.balance >= 0
                              ? "font-semibold text-emerald-700 dark:text-emerald-400"
                              : "font-semibold text-rose-700 dark:text-rose-400"
                          }
                        >
                          {formatCurrency(member.balance, summary.currency)}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Chưa có dữ liệu cân bằng thành viên.
                  </p>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader
                description="Gợi ý chuyển tiền cho tháng đang chọn"
                title="Gợi ý quyết toán"
              />
              <CardBody className="space-y-3">
                {summary?.settlements.length ? (
                  summary.settlements.map((settlement) => (
                    <div
                      className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800"
                      key={`${settlement.from_user_id}-${settlement.to_user_id}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-sm">
                          <span className="font-semibold">{settlement.from_user_id}</span>{" "}
                          trả cho{" "}
                          <span className="font-semibold">{settlement.to_user_id}</span>
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
              <SelectField
                label="Cách chia"
                onValueChange={(value) =>
                  setSplitMethod(
                    value as "equal" | "amount" | "percentage" | "shares"
                  )
                }
                options={[
                  { value: "equal", label: "Chia đều" },
                  { value: "amount", label: "Theo số tiền" },
                  { value: "percentage", label: "Theo phần trăm" },
                  { value: "shares", label: "Theo phần" },
                ]}
                value={splitMethod}
              />
              <Button className="w-full" disabled={saving} type="submit">
                <Plus size={17} />
                {saving ? "Đang lưu..." : "Lưu chi tiêu"}
              </Button>
            </form>
          </CardBody>
        </Card>
      </div>
    </AppShell>
  );
}
