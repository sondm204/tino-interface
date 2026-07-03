import { Pressable, View } from "react-native";
import { router } from "expo-router";
import {
  ArrowLeft,
  Bell,
  CheckCheck,
  ReceiptText,
} from "lucide-react-native";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { EmptyState, LoadingState, Screen } from "@/components/screen";
import {
  useGetNotificationsQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
} from "@/store/tino-api-slice";
import type { Notification } from "@/types/domain";

function formatNotificationDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function NotificationsScreen() {
  const { isDark } = useTheme();
  const {
    data,
    isFetching,
    isLoading,
    refetch,
  } = useGetNotificationsQuery({ page: 1, size: 50 });
  const [markRead] = useMarkNotificationReadMutation();
  const [markAllRead, markAllState] = useMarkAllNotificationsReadMutation();
  const notifications = data?.items ?? [];
  const hasUnread = notifications.some(
    (notification) => notification.status === "UNREAD"
  );

  async function handleNotification(notification: Notification) {
    if (notification.status === "UNREAD") {
      await markRead(notification.id);
    }

    const walletId = notification.metadata.wallet_id;
    if (walletId) router.push(`/wallets/${walletId}`);
  }

  if (isLoading) {
    return <LoadingState label="Đang tải thông báo..." />;
  }

  return (
    <Screen>
      <View className="flex-row items-center gap-3">
        <Button className="px-3" onPress={() => router.back()} variant="ghost">
          <ArrowLeft color={isDark ? "#f8fafc" : "#0f172a"} size={18} />
        </Button>
        <View className="min-w-0 flex-1">
          <Text variant="headline">Thông báo</Text>
          <Text variant="muted">Các thay đổi chi tiêu trong ví của bạn.</Text>
        </View>
        {hasUnread ? (
          <Button
            accessibilityLabel="Đánh dấu tất cả đã đọc"
            className="px-3"
            loading={markAllState.isLoading}
            onPress={() => void markAllRead()}
            variant="outline"
          >
            <CheckCheck
              color={isDark ? "#f8fafc" : "#0f172a"}
              size={18}
            />
          </Button>
        ) : null}
      </View>

      {notifications.length === 0 ? (
        <Card>
          <View className="items-center gap-3 py-8">
            <Bell color={isDark ? "#94a3b8" : "#64748b"} size={28} />
            <EmptyState
              description="Thông báo mới về chi tiêu sẽ xuất hiện tại đây."
              title="Chưa có thông báo"
            />
          </View>
        </Card>
      ) : (
        <View className="gap-3">
          {notifications.map((notification) => (
            <Pressable
              key={notification.id}
              onPress={() => void handleNotification(notification)}
            >
              <Card
                className={
                  notification.status === "UNREAD"
                    ? "border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950"
                    : undefined
                }
              >
                <View className="flex-row gap-3">
                  <View className="size-10 items-center justify-center rounded-full bg-white dark:bg-slate-900">
                    <ReceiptText
                      color={
                        notification.status === "UNREAD"
                          ? "#2563eb"
                          : isDark
                            ? "#94a3b8"
                            : "#64748b"
                      }
                      size={18}
                    />
                  </View>
                  <View className="min-w-0 flex-1 gap-1">
                    <View className="flex-row items-center gap-2">
                      <Text className="flex-1 font-semibold" numberOfLines={1}>
                        {notification.title}
                      </Text>
                      {notification.status === "UNREAD" ? (
                        <View className="size-2 rounded-full bg-blue-600" />
                      ) : null}
                    </View>
                    <Text variant="small">
                      <Text className="font-semibold">
                        {notification.creator?.display_name || "Hệ thống"}
                      </Text>{" "}
                      {notification.type === "EXPENSE_CREATED"
                        ? "đã tạo khoản chi"
                        : notification.type === "EXPENSE_UPDATED"
                          ? "đã cập nhật khoản chi"
                          : ""}
                    </Text>
                    <Text>{notification.message}</Text>
                    <Text variant="small">
                      {formatNotificationDate(notification.created_at)}
                    </Text>
                  </View>
                </View>
              </Card>
            </Pressable>
          ))}
          <Button
            loading={isFetching}
            onPress={() => void refetch()}
            variant="outline"
          >
            Làm mới
          </Button>
        </View>
      )}
    </Screen>
  );
}
