import { View } from "react-native";
import { Text } from "@/components/ui/text";

export function Badge({ children }: { children: React.ReactNode }) {
  return (
    <View className="rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">
      <Text className="text-xs font-medium text-slate-700 dark:text-slate-200">{children}</Text>
    </View>
  );
}
