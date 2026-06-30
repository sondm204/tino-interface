import { View } from "react-native";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { Screen } from "@/components/screen";
import { formatCurrency } from "@/lib/format";
import { useGetWalletsQuery } from "@/store/tino-api-slice";

export function DashboardScreen() {
  const { data } = useGetWalletsQuery({ page: 1, size: 50 });
  const wallets = data?.items || [];
  const totalAmount = wallets.reduce(
    (sum, wallet) => sum + Number(wallet.total_amount || 0),
    0
  );
  const personalCount = wallets.filter((wallet) => wallet.type === "personal").length;
  const sharedCount = wallets.filter((wallet) => wallet.type === "shared").length;

  return (
    <Screen>
      <View className="gap-1">
        <Text variant="headline">Dashboard</Text>
        <Text variant="muted">Tổng quan nhanh các ví chi tiêu.</Text>
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
