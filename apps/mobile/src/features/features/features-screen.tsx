import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { ArrowRight, Calculator, RotateCcw } from "lucide-react-native";
import { Screen } from "@/components/screen";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";

const featureCards = [
  {
    description: "Chia đều một cuộc chơi ngắn và gợi ý ai chuyển cho ai.",
    href: "/features/quick-settle",
    icon: Calculator,
    title: "Chia chi tiêu nhanh",
  },
  {
    description: "Nhập các lựa chọn rồi quay vòng để chọn ngẫu nhiên.",
    href: "/features/wheel",
    icon: RotateCcw,
    title: "Vòng quay lựa chọn",
  },
];

export function FeaturesScreen() {
  return (
    <Screen>
      <View className="gap-1">
        <Text variant="headline">Chức năng</Text>
        <Text variant="muted">Các công cụ nhanh ngoài ví chi tiêu.</Text>
      </View>

      <View className="gap-3">
        {featureCards.map((feature) => {
          const Icon = feature.icon;

          return (
            <Pressable
              className="active:opacity-80"
              key={feature.href}
              onPress={() => router.push(feature.href)}
            >
              <Card className="gap-4">
                <View className="flex-row items-start justify-between gap-3">
                  <View className="size-11 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950">
                    <Icon color="#2563eb" size={21} />
                  </View>
                  <ArrowRight color="#64748b" size={18} />
                </View>
                <View className="gap-1">
                  <Text variant="title">{feature.title}</Text>
                  <Text variant="muted">{feature.description}</Text>
                </View>
              </Card>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}
