import { useMemo, useState } from "react";
import { Alert, FlatList, RefreshControl, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Plus, Trash2 } from "lucide-react-native";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { RadioItem } from "@/components/ui/radio-group";
import { Text } from "@/components/ui/text";
import { EmptyState, LoadingState, Screen } from "@/components/screen";
import { formatCurrency, formatDate, getCurrentMonth } from "@/lib/format";
import { splitMethodLabel } from "@/lib/labels";
import { useAppSelector } from "@/store/hooks";
import {
  useCreateExpenseMutation,
  useDeleteExpenseMutation,
  useGetExpensesQuery,
  useGetSummaryQuery,
  useGetWalletMembersQuery,
} from "@/store/tino-api-slice";

const splitOptions = [
  { label: "Chia đều", value: "equal" },
  { label: "Theo số tiền", value: "amount" },
  { label: "Theo phần trăm", value: "percentage" },
  { label: "Theo phần", value: "shares" },
] as const;

export function WalletDetailScreen() {
  const { walletId } = useLocalSearchParams<{ walletId: string }>();
  const currentUser = useAppSelector((state) => state.auth.user);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [splitMethod, setSplitMethod] = useState<"equal" | "amount" | "percentage" | "shares">("equal");
  const expensesQuery = useGetExpensesQuery({ walletId, page: 1, size: 50 }, { skip: !walletId });
  const membersQuery = useGetWalletMembersQuery(walletId, { skip: !walletId });
  const summaryQuery = useGetSummaryQuery(
    { walletId, month: getCurrentMonth() },
    { skip: !walletId }
  );
  const [createExpense, createState] = useCreateExpenseMutation();
  const [deleteExpense, deleteState] = useDeleteExpenseMutation();

  const memberNameById = useMemo(() => {
    const map = new Map<string, string>();
    membersQuery.data?.forEach((member) => {
      map.set(member.user_id, member.user.display_name || member.user.email);
    });
    return map;
  }, [membersQuery.data]);

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

    setDialogVisible(false);
    setTitle("");
    setAmount("");
    setSplitMethod("equal");
    Alert.alert("Thành công", "Đã thêm khoản chi.");
  }

  function confirmDeleteExpense(expenseId: string) {
    Alert.alert("Xóa khoản chi?", "Khoản chi này sẽ bị xóa khỏi ví.", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          const result = await deleteExpense({ walletId, expenseId });

          if ("error" in result) {
            Alert.alert("Không thể xóa", result.error?.message || "Đã có lỗi xảy ra.");
            return;
          }

          Alert.alert("Đã xóa", "Khoản chi đã được xóa.");
        },
      },
    ]);
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
          <Button onPress={() => setDialogVisible(true)}>
            <Plus color="#fff" size={18} />
            <Text className="font-semibold text-white">Thêm chi</Text>
          </Button>
        </View>

        <Card className="gap-2">
          <Text variant="title">{summaryQuery.data?.wallet.name || "Chi tiết ví"}</Text>
          <Text variant="muted">Tổng chi tháng này</Text>
          <Text variant="headline">{formatCurrency(summaryQuery.data?.total_amount, "VND")}</Text>
        </Card>

        <Card className="gap-3">
          <Text variant="title">Cân bằng thành viên</Text>
          {(summaryQuery.data?.member_balances || []).map((item) => (
            <View key={item.user_id} className="flex-row items-center gap-3">
              <Text className="flex-1">{memberNameById.get(item.user_id) || item.user_id}</Text>
              <Text className="font-semibold">{formatCurrency(item.balance, "VND")}</Text>
            </View>
          ))}
        </Card>

        <FlatList
          contentContainerClassName="gap-3 pb-6"
          data={expensesQuery.data?.items || []}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <EmptyState
              title="Chưa có khoản chi"
              description="Thêm khoản chi đầu tiên cho ví này."
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
          renderItem={({ item }) => (
            <Card className="gap-3">
              <View className="flex-row items-center gap-3">
                <View className="flex-1">
                  <Text variant="title">{item.title}</Text>
                  <Text variant="muted">
                    {formatDate(item.expense_date)} · {splitMethodLabel(item.split_method)}
                  </Text>
                </View>
                <Text className="font-semibold">
                  {formatCurrency(item.total_amount, item.currency)}
                </Text>
              </View>
              <Button
                disabled={deleteState.isLoading}
                onPress={() => confirmDeleteExpense(item.id)}
                variant="ghost"
              >
                <Trash2 color="#dc2626" size={16} />
                <Text className="font-semibold text-red-600">Xóa</Text>
              </Button>
            </Card>
          )}
        />
      </Screen>

      <Dialog open={dialogVisible} onOpenChange={setDialogVisible} title="Thêm khoản chi">
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
          <Button onPress={() => setDialogVisible(false)} variant="ghost">
            Hủy
          </Button>
          <Button loading={createState.isLoading} onPress={handleCreateExpense}>
            Lưu
          </Button>
        </View>
      </Dialog>
    </>
  );
}
