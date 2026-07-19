import { useMemo } from "react";
import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { Bell } from "lucide-react-native";
import { useTheme } from "@/components/theme-provider";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { Screen } from "@/components/screen";
import { formatCurrency, getCurrentMonth } from "@/lib/format";
import {
  useGetUnreadNotificationCountQuery,
  useGetWalletsQuery,
} from "@/store/tino-api-slice";

export function DashboardScreen() {
  const { isDark } = useTheme();
  const currentMonth = useMemo(() => getCurrentMonth(), []);
  const { data } = useGetWalletsQuery({
    page: 1,
    size: 50,
    month: currentMonth,
  });
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

      <Card className="gap-1">
        <Text variant="muted">Tổng chi tiêu của bạn tháng này</Text>
        <Text variant="headline">
          {currentUserExpenseByCurrency
            .map(([currency, amount]) => formatCurrency(amount, currency))
            .join(" + ")}
        </Text>
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
    </Screen>
  );
}
