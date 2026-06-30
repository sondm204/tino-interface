import { View } from "react-native";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { Screen } from "@/components/screen";

const pendingFeatures = [
  "Ngân sách",
  "Báo cáo tháng",
  "Nhắc thanh toán",
  "Xuất dữ liệu",
];

export function FeaturesScreen() {
  return (
    <Screen>
      <View className="gap-1">
        <Text variant="headline">Chức năng</Text>
        <Text variant="muted">Khu vực tạm cho các module mở rộng.</Text>
      </View>

      <Card className="gap-3">
        <Text variant="title">Đang chuẩn bị</Text>
        <View className="flex-row flex-wrap gap-2">
          {pendingFeatures.map((feature) => (
            <Badge key={feature}>{feature}</Badge>
          ))}
        </View>
      </Card>
    </Screen>
  );
}
