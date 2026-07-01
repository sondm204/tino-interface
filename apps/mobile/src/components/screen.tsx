import { PropsWithChildren } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/ui/text";

type ScreenProps = PropsWithChildren<{
  scroll?: boolean;
}>;

export function Screen({ children, scroll = true }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const content = (
    <View
      className="flex-1 gap-4 bg-slate-50 px-4 dark:bg-slate-950"
      style={{
        paddingBottom: Math.max(insets.bottom + 20, 32),
        paddingTop: Math.max(insets.top + 16, 28),
      }}
    >
      {children}
    </View>
  );

  if (!scroll) {
    return content;
  }

  return (
    <ScrollView className="bg-slate-50 dark:bg-slate-950" contentContainerClassName="flex-grow">
      {content}
    </ScrollView>
  );
}

export function LoadingState({ label = "Đang tải dữ liệu..." }: { label?: string }) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="min-h-56 flex-1 items-center justify-center gap-3 bg-slate-50 px-6 dark:bg-slate-950"
      style={{
        paddingBottom: Math.max(insets.bottom + 20, 32),
        paddingTop: Math.max(insets.top + 16, 28),
      }}
    >
      <ActivityIndicator color="#2563eb" />
      <Text>{label}</Text>
    </View>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <View className="min-h-56 items-center justify-center gap-2 p-6">
      <Text className="text-center" variant="title">
        {title}
      </Text>
      {description ? (
        <Text className="text-center" variant="muted">
          {description}
        </Text>
      ) : null}
    </View>
  );
}
