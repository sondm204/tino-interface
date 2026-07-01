import { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react-native";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { RadioItem } from "@/components/ui/radio-group";
import { Text } from "@/components/ui/text";
import { EmptyState, LoadingState, Screen } from "@/components/screen";
import { formatCurrency, getCurrentMonth } from "@/lib/format";
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
import type { Expense } from "@/types/domain";

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

export function WalletDetailScreen() {
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
  const [editAmount, setEditAmount] = useState("");
  const [splitMethod, setSplitMethod] =
    useState<"equal" | "amount" | "percentage" | "shares">("equal");
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
    const numericAmount = Number(amount);
    const payerId = currentUser?.id || membersQuery.data?.[0]?.user_id;

    if (!title.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      Alert.alert("Thiếu thông tin", "Vui lòng nhập tên khoản chi và số tiền hợp lệ.");
      return;
    }

    if (!payerId) {
      Alert.alert("Chưa có người thanh toán", "Chưa xác định được người thanh toán.");
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
        title: title.trim(),
        total_amount: numericAmount,
      },
    });

    if ("error" in result) {
      Alert.alert("Không thể tạo khoản chi", result.error?.message || "Đã có lỗi xảy ra.");
      return;
    }

    setCreateDialogVisible(false);
    setTitle("");
    setAmount("");
    setSplitMethod("equal");
  }

  function openEditExpense(expense: Expense) {
    setActionExpense(null);
    setEditingExpense(expense);
    setEditTitle(expense.title);
    setEditAmount(String(expense.total_amount));
  }

  async function handleUpdateExpense() {
    if (!editingExpense) return;
    const numericAmount = Number(editAmount);

    if (!editTitle.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      Alert.alert("Thông tin chưa hợp lệ", "Vui lòng nhập tên và số tiền hợp lệ.");
      return;
    }

    const result = await updateExpense({
      walletId,
      expenseId: editingExpense.id,
      payload: {
        title: editTitle.trim(),
        total_amount: numericAmount,
      },
    });

    if ("error" in result) {
      Alert.alert("Không thể cập nhật", result.error?.message || "Đã có lỗi xảy ra.");
      return;
    }

    setEditingExpense(null);
  }

  function confirmDeleteExpense(expense: Expense) {
    setActionExpense(null);
    Alert.alert("Xóa khoản chi?", `"${expense.title}" sẽ bị xóa khỏi ví.`, [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          const result = await deleteExpense({ walletId, expenseId: expense.id });

          if ("error" in result) {
            Alert.alert("Không thể xóa", result.error?.message || "Đã có lỗi xảy ra.");
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
        <Input keyboardType="numeric" onChangeText={setAmount} placeholder="Số tiền" value={amount} />
        <View>
          {splitOptions.map((option) => (
            <RadioItem
              key={option.value}
              label={option.label}
              onPress={() => setSplitMethod(option.value)}
              selected={splitMethod === option.value}
            />
          ))}
        </View>
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
        onOpenChange={(open) => !open && setEditingExpense(null)}
        title="Sửa khoản chi"
      >
        <Input onChangeText={setEditTitle} placeholder="Tên khoản chi" value={editTitle} />
        <Input
          keyboardType="numeric"
          onChangeText={setEditAmount}
          placeholder="Số tiền"
          value={editAmount}
        />
        <View className="flex-row justify-end gap-2">
          <Button onPress={() => setEditingExpense(null)} variant="ghost">Hủy</Button>
          <Button loading={updateState.isLoading} onPress={handleUpdateExpense}>Lưu thay đổi</Button>
        </View>
      </Dialog>
    </>
  );
}
