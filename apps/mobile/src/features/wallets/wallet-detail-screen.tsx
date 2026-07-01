import { useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { router, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react-native";
import { Button } from "@/components/ui/button";
import { useAlertDialog } from "@/components/ui/alert-dialog";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { RadioItem } from "@/components/ui/radio-group";
import { Text } from "@/components/ui/text";
import { EmptyState, LoadingState, Screen } from "@/components/screen";
import {
  formatCurrency,
  formatMoneyInput,
  getCurrentMonth,
  parseMoneyInput,
} from "@/lib/format";
import { splitMethodLabel } from "@/lib/labels";
import { useAppSelector } from "@/store/hooks";
import {
  useCreateExpenseMutation,
  useDeleteExpenseMutation,
  useGetExpensesQuery,
  useGetSummaryQuery,
  useGetWalletMembersQuery,
  useUpdateExpenseMutation,
} from "@/store/tino-api-slice";
import type { Expense, ExpenseSplit } from "@/types/domain";

const splitOptions = [
  { label: "Chia đều", value: "equal" },
  { label: "Theo số tiền", value: "amount" },
  { label: "Theo phần trăm", value: "percentage" },
  { label: "Theo phần", value: "shares" },
] as const;

function getMonthOptions(count = 12) {
  const today = new Date();

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth() - index, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    return {
      label: index === 0 ? "Tháng này" : `Tháng ${date.getMonth() + 1}`,
      value,
      year: date.getFullYear(),
    };
  });
}

function formatExpenseDay(date: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    weekday: "long",
  }).format(new Date(`${date.slice(0, 10)}T00:00:00`));
}

function getSplitAmount(
  method: "equal" | "amount" | "percentage" | "shares",
  userId: string,
  totalAmount: number,
  values: Record<string, string>,
  memberIds: string[]
) {
  if (method === "equal") {
    return totalAmount / Math.max(memberIds.length, 1);
  }

  const value =
    method === "amount"
      ? parseMoneyInput(values[userId])
      : Number(values[userId] || 0);

  if (method === "amount") {
    return value;
  }

  if (method === "percentage") {
    return (totalAmount * value) / 100;
  }

  const totalShares = memberIds.reduce(
    (total, memberId) => total + Number(values[memberId] || 0),
    0
  );
  return totalShares > 0 ? (totalAmount * value) / totalShares : 0;
}

export function WalletDetailScreen() {
  const { alert } = useAlertDialog();
  const { walletId } = useLocalSearchParams<{ walletId: string }>();
  const currentUser = useAppSelector((state) => state.auth.user);
  const monthOptions = useMemo(() => getMonthOptions(), []);
  const [month, setMonth] = useState(getCurrentMonth());
  const [createDialogVisible, setCreateDialogVisible] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [actionExpense, setActionExpense] = useState<Expense | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editExpenseDate, setEditExpenseDate] = useState("");
  const [editDatePickerVisible, setEditDatePickerVisible] = useState(false);
  const [editPaidByUserId, setEditPaidByUserId] = useState("");
  const [editSplitMethod, setEditSplitMethod] =
    useState<"equal" | "amount" | "percentage" | "shares">("equal");
  const [editSplitValues, setEditSplitValues] = useState<Record<string, string>>(
    {}
  );
  const [splitMethod, setSplitMethod] =
    useState<"equal" | "amount" | "percentage" | "shares">("equal");
  const [splitValues, setSplitValues] = useState<Record<string, string>>({});
  const expensesQuery = useGetExpensesQuery(
    { walletId, page: 1, size: 100, month },
    { skip: !walletId }
  );
  const membersQuery = useGetWalletMembersQuery(walletId, { skip: !walletId });
  const summaryQuery = useGetSummaryQuery({ walletId, month }, { skip: !walletId });
  const [createExpense, createState] = useCreateExpenseMutation();
  const [updateExpense, updateState] = useUpdateExpenseMutation();
  const [deleteExpense, deleteState] = useDeleteExpenseMutation();

  const memberNameById = useMemo(() => {
    const map = new Map<string, string>();
    membersQuery.data?.forEach((member) => {
      map.set(member.user_id, member.user.display_name || member.user.email);
    });
    return map;
  }, [membersQuery.data]);

  const splitMembers = useMemo(
    () => membersQuery.data?.map((member) => member.user_id) ?? [],
    [membersQuery.data]
  );

  const splitInputMeta = useMemo(() => {
    if (splitMethod === "amount") {
      return {
        label: "Số tiền",
        suffix: summaryQuery.data?.currency || "VND",
      };
    }

    if (splitMethod === "percentage") {
      return { label: "Phần trăm", suffix: "%" };
    }

    return { label: "Số phần", suffix: "phần" };
  }, [splitMethod, summaryQuery.data?.currency]);

  const splitValueTotal = useMemo(
    () =>
      splitMembers.reduce(
        (total, userId) =>
          total +
          (splitMethod === "amount"
            ? parseMoneyInput(splitValues[userId])
            : Number(splitValues[userId] || 0)),
        0
      ),
    [splitMembers, splitMethod, splitValues]
  );

  function buildExpenseSplits(totalAmount: number): ExpenseSplit[] | undefined {
    if (summaryQuery.data?.wallet.type !== "shared" || splitMethod === "equal") {
      return undefined;
    }

    if (splitMembers.length === 0) {
      throw new Error("Ví chưa có thành viên để chia chi tiêu.");
    }

    const values = splitMembers.map((userId) => ({
      userId,
      value:
        splitMethod === "amount"
          ? parseMoneyInput(splitValues[userId])
          : Number(splitValues[userId] || 0),
    }));

    if (values.some((item) => !Number.isFinite(item.value) || item.value < 0)) {
      throw new Error("Giá trị chia phải là số không âm.");
    }

    if (values.every((item) => item.value === 0)) {
      throw new Error("Vui lòng nhập giá trị cho ít nhất một thành viên.");
    }

    if (splitMethod === "amount") {
      const total = values.reduce((sum, item) => sum + item.value, 0);

      if (Math.abs(total - totalAmount) > 0.01) {
        throw new Error("Tổng số tiền chia phải bằng tổng khoản chi.");
      }

      return values.map((item) => ({
        amount: item.value,
        user_id: item.userId,
      }));
    }

    if (splitMethod === "percentage") {
      const total = values.reduce((sum, item) => sum + item.value, 0);

      if (Math.abs(total - 100) > 0.01) {
        throw new Error("Tổng phần trăm phải bằng 100%.");
      }

      return values.map((item) => ({
        amount: (totalAmount * item.value) / 100,
        percentage: item.value,
        user_id: item.userId,
      }));
    }

    const totalShares = values.reduce((sum, item) => sum + item.value, 0);

    return values.map((item) => ({
      amount: (totalAmount * item.value) / totalShares,
      shares: item.value,
      user_id: item.userId,
    }));
  }

  const expenseSections = useMemo(() => {
    const groups = new Map<string, Expense[]>();

    for (const expense of expensesQuery.data?.items ?? []) {
      if (!expense.expense_date.startsWith(month)) {
        continue;
      }

      const date = expense.expense_date.slice(0, 10);
      groups.set(date, [...(groups.get(date) ?? []), expense]);
    }

    return Array.from(groups.entries()).map(([date, data]) => ({ date, data }));
  }, [expensesQuery.data?.items, month]);

  async function handleCreateExpense() {
    const numericAmount = parseMoneyInput(amount);
    const payerId = currentUser?.id || membersQuery.data?.[0]?.user_id;

    if (!title.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      alert("Thiếu thông tin", "Vui lòng nhập tên khoản chi và số tiền hợp lệ.");
      return;
    }

    if (!payerId) {
      alert("Chưa có người thanh toán", "Chưa xác định được người thanh toán.");
      return;
    }

    let splits: ExpenseSplit[] | undefined;

    try {
      splits = buildExpenseSplits(numericAmount);
    } catch (error) {
      alert(
        "Dữ liệu chia chưa hợp lệ",
        error instanceof Error ? error.message : "Vui lòng kiểm tra lại cách chia."
      );
      return;
    }

    const result = await createExpense({
      walletId,
      payload: {
        category_id: null,
        currency: "VND",
        description: null,
        expense_date: new Date().toISOString().slice(0, 10),
        paid_by_user_id: payerId,
        split_method: splitMethod,
        splits,
        title: title.trim(),
        total_amount: numericAmount,
      },
    });

    if ("error" in result) {
      alert("Không thể tạo khoản chi", result.error?.message || "Đã có lỗi xảy ra.");
      return;
    }

    setCreateDialogVisible(false);
    setTitle("");
    setAmount("");
    setSplitMethod("equal");
    setSplitValues({});
  }

  function openEditExpense(expense: Expense) {
    const values = Object.fromEntries(
      (expense.splits ?? []).map((split) => {
        const value =
          expense.split_method === "amount"
            ? formatMoneyInput(split.amount)
            : expense.split_method === "percentage"
              ? String(split.percentage ?? "")
              : String(split.shares ?? "");

        return [split.user_id, value];
      })
    );

    setActionExpense(null);
    setEditingExpense(expense);
    setEditTitle(expense.title);
    setEditDescription(expense.description || "");
    setEditAmount(formatMoneyInput(expense.total_amount));
    setEditExpenseDate(expense.expense_date.slice(0, 10));
    setEditPaidByUserId(expense.paid_by_user_id);
    setEditSplitMethod(expense.split_method);
    setEditSplitValues(values);
  }

  async function handleUpdateExpense() {
    if (!editingExpense) return;
    const numericAmount = parseMoneyInput(editAmount);

    if (!editTitle.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      alert("Thông tin chưa hợp lệ", "Vui lòng nhập tên và số tiền hợp lệ.");
      return;
    }

    if (!editPaidByUserId) {
      alert("Thiếu người thanh toán", "Vui lòng chọn người đã thanh toán.");
      return;
    }

    let splits: ExpenseSplit[] = [];

    if (
      summaryQuery.data?.wallet.type === "shared" &&
      editSplitMethod !== "equal"
    ) {
      const values = splitMembers.map((userId) => ({
        userId,
        value:
          editSplitMethod === "amount"
            ? parseMoneyInput(editSplitValues[userId])
            : Number(editSplitValues[userId] || 0),
      }));

      if (
        values.some((item) => !Number.isFinite(item.value) || item.value < 0) ||
        values.every((item) => item.value === 0)
      ) {
        alert(
          "Dữ liệu chia chưa hợp lệ",
          "Vui lòng nhập giá trị hợp lệ cho ít nhất một thành viên."
        );
        return;
      }

      const total = values.reduce((sum, item) => sum + item.value, 0);

      if (
        (editSplitMethod === "amount" &&
          Math.abs(total - numericAmount) > 0.01) ||
        (editSplitMethod === "percentage" && Math.abs(total - 100) > 0.01)
      ) {
        alert(
          "Dữ liệu chia chưa hợp lệ",
          editSplitMethod === "amount"
            ? "Tổng số tiền chia phải bằng tổng khoản chi."
            : "Tổng phần trăm phải bằng 100%."
        );
        return;
      }

      splits = values.map((item) => ({
        amount:
          editSplitMethod === "amount"
            ? item.value
            : (numericAmount * item.value) / total,
        percentage:
          editSplitMethod === "percentage" ? item.value : undefined,
        shares: editSplitMethod === "shares" ? item.value : undefined,
        user_id: item.userId,
      }));
    }

    const result = await updateExpense({
      walletId,
      expenseId: editingExpense.id,
      payload: {
        description: editDescription.trim() || null,
        expense_date: editExpenseDate,
        paid_by_user_id: editPaidByUserId,
        split_method: editSplitMethod,
        splits,
        title: editTitle.trim(),
        total_amount: numericAmount,
      },
    });

    if ("error" in result) {
      alert("Không thể cập nhật", result.error?.message || "Đã có lỗi xảy ra.");
      return;
    }

    setEditingExpense(null);
  }

  function confirmDeleteExpense(expense: Expense) {
    setActionExpense(null);
    alert("Xóa khoản chi?", `"${expense.title}" sẽ bị xóa khỏi ví.`, [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          const result = await deleteExpense({ walletId, expenseId: expense.id });

          if ("error" in result) {
            alert("Không thể xóa", result.error?.message || "Đã có lỗi xảy ra.");
          }
        },
      },
    ]);
  }

  function toggleSummary() {
    setSummaryExpanded((expanded) => !expanded);
  }

  if (expensesQuery.isLoading || summaryQuery.isLoading) {
    return <LoadingState />;
  }

  return (
    <>
      <Screen scroll={false}>
        <View className="flex-row items-center justify-between gap-3">
          <Button className="px-3" onPress={() => router.back()} variant="ghost">
            <ArrowLeft color="#0f172a" size={18} />
            <Text className="font-semibold">Quay lại</Text>
          </Button>
          <Button onPress={() => setCreateDialogVisible(true)}>
            <Plus color="#fff" size={18} />
            <Text className="font-semibold text-white">Thêm chi</Text>
          </Button>
        </View>

        <View className="gap-2">
          <Card className="gap-2">
            <Text variant="title">{summaryQuery.data?.wallet.name || "Chi tiết ví"}</Text>
            <Text variant="muted">Tổng chi tháng đã chọn</Text>
            <Text className="text-lg font-bold">
              {formatCurrency(summaryQuery.data?.total_amount, "VND")}
            </Text>
          </Card>
          <Card className="gap-4">
              <View className="flex-row items-center justify-between gap-3">
                <Text variant="title">Chi tiêu và quyết toán</Text>
                <Pressable
                  accessibilityLabel={
                    summaryExpanded
                      ? "Ẩn chi tiêu và quyết toán"
                      : "Hiện chi tiêu và quyết toán"
                  }
                  accessibilityRole="button"
                  className="size-9 items-center justify-center rounded-full bg-slate-100"
                  onPress={toggleSummary}
                >
                  {summaryExpanded ? (
                    <ChevronUp color="#475569" size={19} />
                  ) : (
                    <ChevronDown color="#475569" size={19} />
                  )}
                </Pressable>
              </View>

              {summaryExpanded ? (
                <>
                <View className="gap-2">
                  <Text className="text-sm font-semibold text-slate-600">
                    Chi tiêu theo thành viên
                  </Text>
              {(summaryQuery.data?.member_balances || []).map((item) => (
                <View
                  className="flex-row items-center gap-3 border-t border-slate-100 pt-2"
                  key={item.user_id}
                >
                  <Text className="flex-1 text-sm font-semibold" numberOfLines={1}>
                    {memberNameById.get(item.user_id) || item.user_id}
                  </Text>
                  <View className="items-end">
                    <Text className="text-xs text-slate-500">Đã trả</Text>
                    <Text className="text-sm font-semibold">
                      {formatCurrency(item.paid, summaryQuery.data?.currency || "VND")}
                    </Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-xs text-slate-500">Phần chi</Text>
                    <Text className="text-sm font-semibold">
                      {formatCurrency(item.share, summaryQuery.data?.currency || "VND")}
                    </Text>
                  </View>
                </View>
              ))}
                </View>

                <View className="gap-2 border-t border-slate-200 pt-3">
                  <Text className="text-sm font-semibold text-slate-600">
                    Quyết toán
                  </Text>
                  {summaryQuery.data?.settlements.length ? (
                    summaryQuery.data.settlements.map((settlement) => (
                      <View
                        className="flex-row items-center gap-2"
                        key={`${settlement.from_user_id}-${settlement.to_user_id}`}
                      >
                        <Text className="flex-1 text-sm" numberOfLines={1}>
                          <Text className="font-semibold">
                            {memberNameById.get(settlement.from_user_id) ||
                              settlement.from_user_id}
                          </Text>
                          {" trả "}
                          <Text className="font-semibold">
                            {memberNameById.get(settlement.to_user_id) ||
                              settlement.to_user_id}
                          </Text>
                        </Text>
                        <Text className="text-sm font-bold">
                          {formatCurrency(settlement.amount, settlement.currency)}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text variant="muted">Tháng này không cần quyết toán.</Text>
                  )}
                </View>
                </>
              ) : null}
          </Card>
        </View>

        <ScrollView
          className="max-h-14 flex-grow-0"
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-2 pr-4"
        >
          {monthOptions.map((option) => {
            const selected = option.value === month;

            return (
              <Pressable
                className={`min-w-24 h-fit rounded-lg border px-4 py-2 ${
                  selected ? "border-slate-900 bg-slate-900" : "border-slate-200 bg-white"
                }`}
                key={option.value}
                onPress={() => setMonth(option.value)}
              >
                <Text className={`text-center text-sm font-semibold ${selected ? "text-white" : ""}`}>
                  {option.label}
                </Text>
                <Text className={`text-center text-xs ${selected ? "text-slate-300" : "text-slate-500"}`}>
                  {option.year}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <FlatList
          className="flex-1"
          contentContainerClassName="gap-3 pb-6"
          data={expenseSections}
          keyExtractor={(group) => group.date}
          ListEmptyComponent={
            <EmptyState
              title="Chưa có khoản chi"
              description="Tháng được chọn chưa có khoản chi nào."
            />
          }
          refreshControl={
            <RefreshControl
              refreshing={expensesQuery.isFetching || summaryQuery.isFetching}
              onRefresh={() => {
                expensesQuery.refetch();
                summaryQuery.refetch();
              }}
            />
          }
          renderItem={({ item: group }) => (
            <Card className="gap-0 p-0">
              <View className="border-b border-slate-100 px-4 py-3">
                <Text className="font-semibold capitalize text-slate-600">
                  {formatExpenseDay(group.date)}
                </Text>
              </View>
              {group.data.map((expense, index) => (
                <Pressable
                  className={index > 0 ? "border-t border-slate-100" : ""}
                  delayLongPress={350}
                  key={expense.id}
                  onLongPress={() => setActionExpense(expense)}
                >
                  <View className="flex-row items-center gap-3 px-4 py-3.5">
                    <View className="flex-1">
                      <Text variant="title">{expense.title}</Text>
                      <Text variant="muted">
                        {splitMethodLabel(expense.split_method)}
                      </Text>
                    </View>
                    <Text className="font-semibold">
                      {formatCurrency(expense.total_amount, expense.currency)}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </Card>
          )}
        />
      </Screen>

      <Dialog
        open={createDialogVisible}
        onOpenChange={setCreateDialogVisible}
        title="Thêm khoản chi"
      >
        <Input onChangeText={setTitle} placeholder="Tên khoản chi" value={title} />
        <Input
          keyboardType="numeric"
          onChangeText={(value) => setAmount(formatMoneyInput(value))}
          placeholder="Số tiền"
          value={amount}
        />
        {summaryQuery.data?.wallet.type === "shared" ? (
          <>
            <View>
              {splitOptions.map((option) => (
                <RadioItem
                  key={option.value}
                  label={option.label}
                  onPress={() => {
                    setSplitMethod(option.value);
                    setSplitValues({});
                  }}
                  selected={splitMethod === option.value}
                />
              ))}
            </View>

            {splitMethod !== "equal" ? (
              <View className="gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <View className="gap-1">
                  <Text className="font-semibold">
                    {splitInputMeta.label} theo thành viên
                  </Text>
                  <Text variant="small">
                    Nhập {splitInputMeta.label.toLowerCase()} cho từng người.
                  </Text>
                </View>

                {splitMembers.map((userId) => (
                  <View className="flex-row items-center gap-3" key={userId}>
                    <Text className="flex-1 text-sm font-medium" numberOfLines={1}>
                      {memberNameById.get(userId) || userId}
                    </Text>
                    <Input
                      className="min-h-10 w-28 text-right"
                      keyboardType={
                        splitMethod === "amount" ? "numeric" : "decimal-pad"
                      }
                      onChangeText={(value) =>
                        setSplitValues((current) => ({
                          ...current,
                          [userId]:
                            splitMethod === "amount"
                              ? formatMoneyInput(value)
                              : value,
                        }))
                      }
                      placeholder="0"
                      value={splitValues[userId] || ""}
                    />
                    <Text className="w-10" variant="small">
                      {splitInputMeta.suffix}
                    </Text>
                  </View>
                ))}

                <View className="flex-row items-center justify-between border-t border-slate-200 pt-2">
                  <Text variant="small">Tổng đã nhập</Text>
                  <Text className="text-sm font-semibold">
                    {splitMethod === "amount"
                      ? formatCurrency(
                          splitValueTotal,
                          summaryQuery.data?.currency || "VND"
                        )
                      : `${splitValueTotal} ${splitInputMeta.suffix}`}
                  </Text>
                </View>
              </View>
            ) : null}
          </>
        ) : null}
        <View className="flex-row justify-end gap-2">
          <Button onPress={() => setCreateDialogVisible(false)} variant="ghost">Hủy</Button>
          <Button loading={createState.isLoading} onPress={handleCreateExpense}>Lưu</Button>
        </View>
      </Dialog>

      <Dialog
        open={actionExpense !== null}
        onOpenChange={(open) => !open && setActionExpense(null)}
        title={actionExpense?.title}
      >
        {actionExpense ? (
          <>
            <Button onPress={() => openEditExpense(actionExpense)} variant="ghost">
              <Pencil color="#0f172a" size={18} />
              Sửa khoản chi
            </Button>
            <Button
              disabled={deleteState.isLoading}
              onPress={() => confirmDeleteExpense(actionExpense)}
              variant="ghost"
            >
              <Trash2 color="#dc2626" size={18} />
              <Text className="font-semibold text-red-600">Xóa khoản chi</Text>
            </Button>
          </>
        ) : null}
      </Dialog>

      <Dialog
        open={editingExpense !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditDatePickerVisible(false);
            setEditingExpense(null);
          }
        }}
        title="Sửa khoản chi"
      >
        <Input
          onChangeText={setEditTitle}
          placeholder="Tên khoản chi"
          value={editTitle}
        />
        <Input
          multiline
          onChangeText={setEditDescription}
          placeholder="Mô tả"
          value={editDescription}
        />
        <Input
          keyboardType="numeric"
          onChangeText={(value) => setEditAmount(formatMoneyInput(value))}
          placeholder="Số tiền"
          value={editAmount}
        />
        {Platform.OS === "web" ? (
          <Input
            autoCapitalize="none"
            onChangeText={setEditExpenseDate}
            placeholder="Ngày chi (YYYY-MM-DD)"
            value={editExpenseDate}
          />
        ) : (
          <>
            <Pressable
              className="min-h-12 flex-row items-center gap-3 rounded-xl border border-slate-200 bg-white px-3"
              onPress={() => setEditDatePickerVisible(true)}
            >
              <CalendarDays color="#475569" size={18} />
              <Text className="flex-1">
                {editExpenseDate
                  ? new Intl.DateTimeFormat("vi-VN", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    }).format(new Date(`${editExpenseDate}T00:00:00`))
                  : "Chọn ngày chi"}
              </Text>
            </Pressable>
            {editDatePickerVisible ? (
              <DateTimePicker
                display={Platform.OS === "ios" ? "compact" : "default"}
                mode="date"
                onChange={(_event, date) => {
                  setEditDatePickerVisible(false);

                  if (date) {
                    const year = date.getFullYear();
                    const monthValue = String(date.getMonth() + 1).padStart(
                      2,
                      "0"
                    );
                    const day = String(date.getDate()).padStart(2, "0");
                    setEditExpenseDate(`${year}-${monthValue}-${day}`);
                  }
                }}
                value={
                  editExpenseDate
                    ? new Date(`${editExpenseDate}T00:00:00`)
                    : new Date()
                }
              />
            ) : null}
          </>
        )}

        <View className="gap-1 rounded-xl border border-slate-200 p-3">
          <Text className="font-semibold">Người thanh toán</Text>
          {membersQuery.data?.map((member) => (
            <RadioItem
              key={member.user_id}
              label={member.user.display_name || member.user.email}
              onPress={() => setEditPaidByUserId(member.user_id)}
              selected={editPaidByUserId === member.user_id}
            />
          ))}
        </View>

        {summaryQuery.data?.wallet.type === "shared" ? (
          <>
            <View className="gap-1 rounded-xl border border-slate-200 p-3">
              <Text className="font-semibold">Cách chia</Text>
              {splitOptions.map((option) => (
                <RadioItem
                  key={option.value}
                  label={option.label}
                  onPress={() => {
                    setEditSplitMethod(option.value);
                    setEditSplitValues({});
                  }}
                  selected={editSplitMethod === option.value}
                />
              ))}
            </View>

            <View className="gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <Text className="font-semibold">Phần chi của từng người</Text>
              {splitMembers.map((userId) => {
                const suffix =
                  editSplitMethod === "amount"
                    ? summaryQuery.data?.currency || "VND"
                    : editSplitMethod === "percentage"
                      ? "%"
                      : "phần";

                return (
                  <View className="gap-1" key={userId}>
                    <View className="flex-row items-center gap-3">
                      <Text className="flex-1 text-sm font-medium" numberOfLines={1}>
                        {memberNameById.get(userId) || userId}
                      </Text>
                      {editSplitMethod === "equal" ? (
                        <Text className="text-sm font-semibold">
                          Chia đều
                        </Text>
                      ) : (
                        <>
                          <Input
                            className="min-h-10 w-28 text-right"
                            keyboardType={
                              editSplitMethod === "amount"
                                ? "numeric"
                                : "decimal-pad"
                            }
                            onChangeText={(value) =>
                              setEditSplitValues((current) => ({
                                ...current,
                                [userId]:
                                  editSplitMethod === "amount"
                                    ? formatMoneyInput(value)
                                    : value,
                              }))
                            }
                            placeholder="0"
                            value={editSplitValues[userId] || ""}
                          />
                          <Text className="w-10" variant="small">
                            {suffix}
                          </Text>
                        </>
                      )}
                    </View>
                    <Text className="text-right text-xs font-semibold text-blue-600">
                      Phải chịu:{" "}
                      {formatCurrency(
                        getSplitAmount(
                          editSplitMethod,
                          userId,
                          parseMoneyInput(editAmount),
                          editSplitValues,
                          splitMembers
                        ),
                        summaryQuery.data?.currency || "VND"
                      )}
                    </Text>
                  </View>
                );
              })}
            </View>
          </>
        ) : null}

        <View className="flex-row justify-end gap-2">
          <Button onPress={() => setEditingExpense(null)} variant="ghost">Hủy</Button>
          <Button loading={updateState.isLoading} onPress={handleUpdateExpense}>Lưu thay đổi</Button>
        </View>
      </Dialog>
    </>
  );
}
