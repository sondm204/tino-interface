import { useState } from "react";
import { Pressable, Switch, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import {
  Bell,
  ChevronRight,
  Copy,
  LogOut,
  Moon,
  Send,
  Sun,
} from "lucide-react-native";
import { useTheme } from "@/components/theme-provider";
import { useAlertDialog } from "@/components/ui/alert-dialog";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Text } from "@/components/ui/text";
import { Screen } from "@/components/screen";
import { clearAuthToken } from "@/lib/api-client";
import { unregisterCurrentPushDevice } from "@/lib/push-notifications";
import { clearCurrentUser } from "@/store/auth-slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  tinoApiSlice,
  useCreateTelegramLinkCodeMutation,
  useGetUnreadNotificationCountQuery,
  useLogoutMutation,
} from "@/store/tino-api-slice";
import type { TelegramCode } from "@/services/tino-api";

export function SettingsScreen() {
  const { alert } = useAlertDialog();
  const { isDark, setDarkMode } = useTheme();
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector((state) => state.auth.user);
  const [logout, logoutState] = useLogoutMutation();
  const [createTelegramLinkCode, telegramCodeState] =
    useCreateTelegramLinkCodeMutation();
  const { data: unreadNotifications } =
    useGetUnreadNotificationCountQuery(undefined, {
      pollingInterval: 60_000,
    });
  const [logoutDialogVisible, setLogoutDialogVisible] = useState(false);
  const [telegramDialogVisible, setTelegramDialogVisible] = useState(false);
  const [telegramCode, setTelegramCode] = useState<TelegramCode | null>(null);
  const [telegramError, setTelegramError] = useState("");

  async function handleLogout() {
    setLogoutDialogVisible(false);
    try {
      await Promise.race([
        Promise.allSettled([unregisterCurrentPushDevice(), logout()]),
        new Promise((resolve) => setTimeout(resolve, 1500)),
      ]);
    } finally {
      await clearAuthToken();
      dispatch(clearCurrentUser());
      dispatch(tinoApiSlice.util.resetApiState());
      router.replace("/(auth)/login");
    }
  }

  async function handleCreateTelegramCode() {
    setTelegramError("");

    try {
      setTelegramCode(await createTelegramLinkCode().unwrap());
    } catch (error) {
      setTelegramError(
        error instanceof Error ? error.message : "Không thể tạo mã liên kết."
      );
    }
  }

  async function handleCopyTelegramCode() {
    if (!telegramCode) return;
    await Clipboard.setStringAsync(`/link ${telegramCode.code}`);
    alert("Đã sao chép", "Lệnh liên kết Telegram đã được sao chép.");
  }

  const initials = (currentUser?.display_name || currentUser?.email || "TE")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      <Screen>
        <View className="gap-1">
          <Text variant="headline">Cài đặt</Text>
          <Text variant="muted">Quản lý tài khoản và giao diện ứng dụng.</Text>
        </View>

        <Card className="gap-0 p-0">
          <Pressable
            className="flex-row items-center gap-3 px-4 py-4"
            onPress={() => router.push("/profile")}
          >
            <Avatar initials={initials} size={44} uri={currentUser?.avatar_url} />
            <View className="min-w-0 flex-1">
              <Text className="font-semibold" numberOfLines={1}>
                {currentUser?.display_name || "Hồ sơ cá nhân"}
              </Text>
              <Text numberOfLines={1} variant="muted">
                {currentUser?.email}
              </Text>
            </View>
            <ChevronRight color={isDark ? "#94a3b8" : "#64748b"} size={20} />
          </Pressable>
        </Card>

        <Card className="gap-0 p-0">
          <Pressable
            className="flex-row items-center gap-3 px-4 py-4"
            onPress={() => setTelegramDialogVisible(true)}
          >
            <View className="size-10 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950">
              <Send color="#2563eb" size={20} />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="font-semibold">Kết nối Telegram</Text>
              <Text numberOfLines={2} variant="muted">
                Tạo mã để liên kết tài khoản với Tino Bot.
              </Text>
            </View>
            <ChevronRight color={isDark ? "#94a3b8" : "#64748b"} size={20} />
          </Pressable>
        </Card>

        <Card className="gap-0 p-0">
          <Pressable
            className="flex-row items-center gap-3 px-4 py-4"
            onPress={() => router.push("/notifications")}
          >
            <View className="relative size-10 items-center justify-center rounded-xl bg-red-50 dark:bg-red-950">
              <Bell color="#dc2626" size={20} />
              {unreadNotifications?.count ? (
                <View className="absolute -right-1 -top-1 min-w-5 items-center rounded-full bg-red-600 px-1">
                  <Text className="text-xs font-bold leading-5 text-white">
                    {unreadNotifications.count > 99
                      ? "99+"
                      : unreadNotifications.count}
                  </Text>
                </View>
              ) : null}
            </View>
            <View className="min-w-0 flex-1">
              <Text className="font-semibold">Thông báo</Text>
              <Text numberOfLines={1} variant="muted">
                Xem các thay đổi chi tiêu trong ví.
              </Text>
            </View>
            <ChevronRight color={isDark ? "#94a3b8" : "#64748b"} size={20} />
          </Pressable>
        </Card>

        <Card className="gap-3">
          <Text variant="title">Giao diện</Text>
          <View className="flex-row items-center gap-3">
            {isDark ? (
              <Moon color="#93c5fd" size={20} />
            ) : (
              <Sun color="#f59e0b" size={20} />
            )}
            <View className="flex-1 gap-0.5">
              <Text className="font-semibold">Chế độ tối</Text>
              <Text variant="muted">Giảm độ sáng khi sử dụng ban đêm.</Text>
            </View>
            <Switch
              onValueChange={(enabled) => void setDarkMode(enabled)}
              thumbColor="#ffffff"
              trackColor={{ false: "#cbd5e1", true: "#2563eb" }}
              value={isDark}
            />
          </View>
        </Card>

        <Button
          className="mb-20 w-full"
          onPress={() => setLogoutDialogVisible(true)}
          variant="outline"
        >
          <LogOut color="#dc2626" size={16} />
          <Text className="font-semibold text-red-600">Đăng xuất</Text>
        </Button>
      </Screen>

      <Dialog
        onOpenChange={setTelegramDialogVisible}
        open={telegramDialogVisible}
        title="Kết nối Telegram"
      >
        <Text variant="muted">
          Tạo mã dùng một lần, sau đó gửi lệnh cho Tino Telegram Bot. Mã có
          hiệu lực trong 10 phút.
        </Text>
        {telegramCode ? (
          <View className="gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
            <Text variant="small">Lệnh liên kết</Text>
            <Text className="font-mono text-xl font-bold tracking-widest">
              /link {telegramCode.code}
            </Text>
            <Text variant="small">
              Hết hạn:{" "}
              {new Intl.DateTimeFormat("vi-VN", {
                dateStyle: "short",
                timeStyle: "short",
              }).format(new Date(telegramCode.expires_at))}
            </Text>
            <Button onPress={() => void handleCopyTelegramCode()} variant="outline">
              <Copy color={isDark ? "#f8fafc" : "#0f172a"} size={16} />
              Sao chép lệnh
            </Button>
          </View>
        ) : null}
        {telegramError ? (
          <Text className="text-sm text-red-600">{telegramError}</Text>
        ) : null}
        <Button
          loading={telegramCodeState.isLoading}
          onPress={() => void handleCreateTelegramCode()}
        >
          <Send color="#fff" size={16} />
          {telegramCode ? "Tạo mã mới" : "Tạo mã liên kết"}
        </Button>
      </Dialog>

      <Dialog
        onOpenChange={setLogoutDialogVisible}
        open={logoutDialogVisible}
        title="Đăng xuất?"
      >
        <Text variant="muted">
          Bạn sẽ cần đăng nhập lại để tiếp tục sử dụng Tino Expense.
        </Text>
        <View className="flex-row justify-end gap-2">
          <Button onPress={() => setLogoutDialogVisible(false)} variant="ghost">
            Hủy
          </Button>
          <Button
            loading={logoutState.isLoading}
            onPress={() => void handleLogout()}
            variant="destructive"
          >
            Đăng xuất
          </Button>
        </View>
      </Dialog>
    </>
  );
}
