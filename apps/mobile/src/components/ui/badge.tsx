import { View } from "react-native";
import { Text } from "@/components/ui/text";

export function Badge({ children }: { children: React.ReactNode }) {
  return (
    <View className="rounded-full bg-slate-100 px-3 py-1">
      <Text className="text-xs font-medium text-slate-700">{children}</Text>
    </View>
  );
}
