import { View } from "react-native";
import { Card } from "@/components/ui/card";
import { Pressable } from "react-native";
import { router } from "expo-router";
import { Bell } from "lucide-react-native";
import { useTheme } from "@/components/theme-provider";
import { Text } from "@/components/ui/text";
import { Screen } from "@/components/screen";
import { formatCurrency } from "@/lib/format";
import {
  useGetUnreadNotificationCountQuery,
  useGetWalletsQuery,
} from "@/store/tino-api-slice";

export function DashboardScreen() {
  const { isDark } = useTheme();
  const { data } = useGetWalletsQuery({ page: 1, size: 50 });
  const { data: unreadNotifications } =
    useGetUnreadNotificationCountQuery(undefined, {
      pollingInterval: 60_000,
    });
  const wallets = data?.items || [];
  const totalAmount = wallets.reduce(
    (sum, wallet) => sum + Number(wallet.total_amount || 0),
    0
  );
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

      <Card className="gap-2">
        <Text variant="muted">Tổng chi đã ghi nhận</Text>
        <Text variant="headline">{formatCurrency(totalAmount, "VND")}</Text>
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
