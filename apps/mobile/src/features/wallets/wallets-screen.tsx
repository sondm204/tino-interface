import { useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, View } from "react-native";
import { router } from "expo-router";
import { Plus } from "lucide-react-native";
import { Button } from "@/components/ui/button";
import { useAlertDialog } from "@/components/ui/alert-dialog";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { RadioItem } from "@/components/ui/radio-group";
import { Text } from "@/components/ui/text";
import { EmptyState, LoadingState, Screen } from "@/components/screen";
import { formatCurrency, getCurrentMonth } from "@/lib/format";
import { walletTypeLabel } from "@/lib/labels";
import {
  useCreateWalletMutation,
  useGetWalletsQuery,
} from "@/store/tino-api-slice";

function getMonthOptions(count = 12) {
  const today = new Date();

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth() - index, 1);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const value = `${date.getFullYear()}-${month}`;

    return {
      month,
      value,
      year: String(date.getFullYear()),
    };
  });
}

function monthParts(month: string) {
  const [year, monthNumber] = month.split("-");

  return { monthNumber, year };
}

export function WalletsScreen() {
  const { alert } = useAlertDialog();
  const [month, setMonth] = useState(getCurrentMonth());
  const [monthDialogVisible, setMonthDialogVisible] = useState(false);
  const monthOptions = useMemo(() => getMonthOptions(), []);
  const selectedMonth = monthParts(month);
  const { data, isFetching, isLoading, refetch } = useGetWalletsQuery({
    page: 1,
    size: 50,
    month,
  });
  const [createWallet, createState] = useCreateWalletMutation();
  const [dialogVisible, setDialogVisible] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"personal" | "shared">("personal");
  const currentUserExpenseByCurrency = useMemo(() => {
    const totals = (data?.items || []).reduce<Record<string, number>>((result, wallet) => {
      result[wallet.currency] =
        (result[wallet.currency] ?? 0) + Number(wallet.user_share_amount ?? 0);

      return result;
    }, {});

    const entries = Object.entries(totals).filter(([, amount]) => amount > 0) as Array<
      [string, number]
    >;

    return entries.length > 0 ? entries : ([["VND", 0]] as Array<[string, number]>);
  }, [data?.items]);

  async function handleCreateWallet() {
    if (!name.trim()) {
      alert("Thiếu thông tin", "Vui lòng nhập tên ví.");
      return;
    }

    const result = await createWallet({
      currency: "VND",
      description: description.trim() || null,
      name: name.trim(),
      type,
    });

    if ("error" in result) {
      alert("Không thể tạo ví", result.error?.message || "Đã có lỗi xảy ra.");
      return;
    }

    setDialogVisible(false);
    setName("");
    setDescription("");
    setType("personal");
    alert("Thành công", "Đã tạo ví mới.");
  }

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <>
      <Screen scroll={false}>
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1 gap-1">
            <Text variant="headline">Ví chi tiêu</Text>
            <Text variant="muted">Theo dõi chi tiêu cá nhân và nhóm.</Text>
          </View>
          <Button className="rounded-full px-3" onPress={() => setDialogVisible(true)}>
            <Plus color="#fff" size={18} />
          </Button>
        </View>

        <Card className="flex-row items-center gap-3">
          <View className="min-w-0 flex-1 gap-1">
            <Text variant="muted">Tổng chi tiêu của bạn</Text>
            <Text className="text-2xl font-bold" numberOfLines={2}>
              {currentUserExpenseByCurrency
                .map(([currency, amount]) => formatCurrency(amount, currency))
                .join(" + ")}
            </Text>
          </View>
          <Pressable
            accessibilityLabel="Chọn tháng tổng chi tiêu"
            accessibilityRole="button"
            className="size-16 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950"
            onPress={() => setMonthDialogVisible(true)}
          >
            <Text className="text-2xl font-bold leading-7">
              {selectedMonth.monthNumber}
            </Text>
            <Text className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {selectedMonth.year}
            </Text>
          </Pressable>
        </Card>

        <FlatList
          contentContainerClassName="gap-3 pb-24"
          data={data?.items || []}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <EmptyState
              title="Chưa có ví nào"
              description="Tạo ví đầu tiên để bắt đầu ghi lại chi tiêu."
            />
          }
          refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} />}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/wallets/${item.id}`)}>
              <Card className="gap-2">
                <View className="flex-row items-center gap-3">
                  <View className="flex-1">
                    <Text variant="title">{item.name}</Text>
                    <Text variant="muted">
                      {walletTypeLabel(item.type)} · {item.currency}
                    </Text>
                  </View>
                  <Text className="font-semibold">
                    {formatCurrency(item.user_share_amount ?? 0, item.currency)}
                  </Text>
                </View>
                {item.description ? <Text variant="muted">{item.description}</Text> : null}
              </Card>
            </Pressable>
          )}
        />
      </Screen>

      <Dialog
        open={monthDialogVisible}
        onOpenChange={setMonthDialogVisible}
        title="Chọn tháng"
      >
        <View className="flex-row flex-wrap gap-3">
          {monthOptions.map((option) => {
            const selected = option.value === month;

            return (
              <Pressable
                className={`w-[30%] items-center rounded-xl border px-3 py-3 ${selected
                    ? "border-slate-900 bg-slate-900 dark:border-blue-500 dark:bg-blue-600"
                    : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
                  }`}
                key={option.value}
                onPress={() => {
                  setMonth(option.value);
                  setMonthDialogVisible(false);
                }}
              >
                <Text className={`text-2xl font-bold ${selected ? "text-white" : ""}`}>
                  {option.month}
                </Text>
                <Text className={`text-xs font-semibold ${selected ? "text-slate-300 dark:text-blue-100" : "text-slate-500 dark:text-slate-400"}`}>
                  {option.year}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Dialog>

      <Dialog open={dialogVisible} onOpenChange={setDialogVisible} title="Tạo ví mới">
        <Input onChangeText={setName} placeholder="Tên ví" value={name} />
        <Input multiline onChangeText={setDescription} placeholder="Mô tả" value={description} />
        <View>
          <RadioItem label="Cá nhân" onPress={() => setType("personal")} selected={type === "personal"} />
          <RadioItem label="Nhóm" onPress={() => setType("shared")} selected={type === "shared"} />
        </View>
        <View className="flex-row justify-end gap-2">
          <Button onPress={() => setDialogVisible(false)} variant="ghost">
            Hủy
          </Button>
          <Button loading={createState.isLoading} onPress={handleCreateWallet}>
            Tạo ví
          </Button>
        </View>
      </Dialog>
    </>
  );
}
