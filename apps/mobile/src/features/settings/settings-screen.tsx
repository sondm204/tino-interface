import { useState } from "react";
import { Pressable, Switch, View } from "react-native";
import { router } from "expo-router";
import { ChevronRight, LogOut, Moon, Sun } from "lucide-react-native";
import { useTheme } from "@/components/theme-provider";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Text } from "@/components/ui/text";
import { Screen } from "@/components/screen";
import { clearAuthToken } from "@/lib/api-client";
import { clearCurrentUser } from "@/store/auth-slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { tinoApiSlice, useLogoutMutation } from "@/store/tino-api-slice";

export function SettingsScreen() {
  const { isDark, setDarkMode } = useTheme();
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector((state) => state.auth.user);
  const [logout, logoutState] = useLogoutMutation();
  const [logoutDialogVisible, setLogoutDialogVisible] = useState(false);

  async function handleLogout() {
    setLogoutDialogVisible(false);
    try {
      await Promise.race([
        logout(),
        new Promise((resolve) => setTimeout(resolve, 1500)),
      ]);
    } finally {
      await clearAuthToken();
      dispatch(clearCurrentUser());
      dispatch(tinoApiSlice.util.resetApiState());
      router.replace("/(auth)/login");
    }
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
