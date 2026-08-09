import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { Bell, ReceiptText } from "lucide-react-native";
import { useTheme } from "@/components/theme-provider";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Text } from "@/components/ui/text";
import { Screen } from "@/components/screen";
import { formatCurrency, getCurrentMonth } from "@/lib/format";
import {
  useGetRecentExpensesQuery,
  useGetUnreadNotificationCountQuery,
  useGetWalletsQuery,
} from "@/store/tino-api-slice";

function formatExpenseDate(date: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(`${date.slice(0, 10)}T00:00:00`));
}

function getMonthOptions(count = 12) {
  const today = new Date();

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth() - index, 1);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const value = `${date.getFullYear()}-${month}`;

    return {
      label: index === 0 ? "Tháng này" : `Tháng ${date.getMonth() + 1}`,
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

export function DashboardScreen() {
  const { isDark } = useTheme();
  const [month, setMonth] = useState(getCurrentMonth());
  const [monthDialogVisible, setMonthDialogVisible] = useState(false);
  const monthOptions = useMemo(() => getMonthOptions(), []);
  const selectedMonth = monthParts(month);
  const { data } = useGetWalletsQuery({
    page: 1,
    size: 50,
    month,
  });
  const { data: recentExpenses } = useGetRecentExpensesQuery({ size: 3 });
  const { data: unreadNotifications } =
    useGetUnreadNotificationCountQuery(undefined, {
      pollingInterval: 60_000,
    });
  const wallets = data?.items || [];
  const currentUserExpenseByCurrency = useMemo(() => {
    const totals = wallets.reduce<Record<string, number>>((result, wallet) => {
      result[wallet.currency] =
        (result[wallet.currency] ?? 0) + Number(wallet.user_share_amount ?? 0);

      return result;
    }, {});

    const entries = Object.entries(totals).filter(([, amount]) => amount > 0) as Array<
      [string, number]
    >;

    return entries.length > 0 ? entries : ([["VND", 0]] as Array<[string, number]>);
  }, [wallets]);
  const personalCount = wallets.filter((wallet) => wallet.type === "personal").length;
  const sharedCount = wallets.filter((wallet) => wallet.type === "shared").length;

  return (
    <>
      <Screen>
        <View className="flex-row items-center gap-3">
          <View className="min-w-0 flex-1 gap-1">
            <Text variant="headline">Dashboard</Text>
            <Text variant="muted">Tổng quan nhanh các ví chi tiêu.</Text>
          </View>
          <Pressable
            accessibilityLabel="Thông báo"
            accessibilityRole="button"
            className="relative size-11 items-center justify-center rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
            onPress={() => router.push("/notifications")}
          >
            <Bell color={isDark ? "#f8fafc" : "#0f172a"} size={20} />
            {unreadNotifications?.count ? (
              <View className="absolute -right-1 -top-1 min-w-5 items-center rounded-full bg-red-600 px-1">
                <Text className="text-xs font-bold leading-5 text-white">
                  {unreadNotifications.count > 99
                    ? "99+"
                    : unreadNotifications.count}
                </Text>
              </View>
            ) : null}
          </Pressable>
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

        <View className="flex-row gap-3">
          <Card className="flex-1 gap-2">
            <Text variant="muted">Ví cá nhân</Text>
            <Text variant="title">{personalCount}</Text>
          </Card>
          <Card className="flex-1 gap-2">
            <Text variant="muted">Ví nhóm</Text>
            <Text variant="title">{sharedCount}</Text>
          </Card>
        </View>

        <Card className="gap-3">
          <View className="flex-row items-center gap-2">
            <ReceiptText color={isDark ? "#cbd5e1" : "#475569"} size={18} />
            <Text variant="title">Khoản chi gần đây</Text>
          </View>

          {recentExpenses?.length ? (
            <View className="gap-1">
              {recentExpenses.slice(0, 3).map((expense, index) => (
                <Pressable
                  className={`flex-row items-center gap-3 py-2 ${index > 0 ? "border-t border-slate-100 dark:border-slate-800" : ""
                    }`}
                  key={expense.id}
                  onPress={() => router.push(`/wallets/${expense.wallet_id}`)}
                >
                  <View className="flex-1">
                    <Text className="font-semibold" numberOfLines={1}>
                      {expense.title}
                    </Text>
                    <Text variant="small" numberOfLines={1}>
                      {expense.wallet_name || "Ví"} ·{" "}
                      {formatExpenseDate(expense.expense_date)}
                    </Text>
                  </View>
                  <Text className="font-bold">
                    {formatCurrency(expense.total_amount, expense.currency)}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <Text variant="muted">Chưa có khoản chi nào gần đây.</Text>
          )}
        </Card>
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
    </>
  );
}
