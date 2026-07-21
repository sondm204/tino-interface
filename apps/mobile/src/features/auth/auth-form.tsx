import { useState } from "react";
import { Image, View } from "react-native";
import { Link, router } from "expo-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAlertDialog } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import {
  clearAuthToken,
  setAuthToken,
  setRefreshToken,
  setStoredCurrentUser,
} from "@/lib/api-client";
import { registerPushDevice } from "@/lib/push-notifications";
import { setCurrentUser } from "@/store/auth-slice";
import { useAppDispatch } from "@/store/hooks";
import {
  useLoginMutation,
  useRegisterMutation,
} from "@/store/tino-api-slice";

const tinoIcon = require("../../../assets/tino-icon.png");

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const { alert } = useAlertDialog();
  const dispatch = useAppDispatch();
  const [login, loginState] = useLoginMutation();
  const [register, registerState] = useRegisterMutation();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const isRegister = mode === "register";
  const isLoading = loginState.isLoading || registerState.isLoading;

  async function handleSubmit() {
    setError("");

    if (!email.trim() || !password.trim() || (isRegister && !displayName.trim())) {
      setError("Vui lòng nhập đầy đủ thông tin.");
      return;
    }

    const result = isRegister
      ? await register({
          display_name: displayName.trim(),
          email: email.trim(),
          password,
        })
      : await login({ email: email.trim(), password });

    if ("error" in result) {
      setError(result.error?.message || "Không thể đăng nhập.");
      return;
    }

    await setAuthToken(result.data.access_token);
    await setRefreshToken(result.data.refresh_token);
    await setStoredCurrentUser(result.data.user);
    dispatch(setCurrentUser(result.data.user));
    registerPushDevice().catch((error) => {
      console.warn("Could not register push device", error);
    });
    router.replace("/wallets");
  }

  async function resetLocalSession() {
    await clearAuthToken();
    alert("Đã xóa", "Phiên đăng nhập local đã được xóa.");
  }

  return (
    <View className="flex-1 justify-center bg-slate-50 p-4 dark:bg-slate-950">
      <Card className="gap-3">
        <View className="mb-2 items-center gap-2">
          <Image
            accessibilityIgnoresInvertColors
            className="size-16"
            resizeMode="contain"
            source={tinoIcon}
          />
          <Text className="text-center" variant="headline">Tino Expense</Text>
          <Text variant="muted">
            {isRegister
              ? "Tạo tài khoản để bắt đầu tracking chi tiêu."
              : "Đăng nhập để tiếp tục quản lý ví chi tiêu."}
          </Text>
        </View>

        {isRegister ? (
          <Input
            onChangeText={setDisplayName}
            placeholder="Tên hiển thị"
            value={displayName}
          />
        ) : null}
        <Input
          autoCapitalize="none"
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="Email"
          value={email}
        />
        <Input
          onChangeText={setPassword}
          placeholder="Mật khẩu"
          secureTextEntry
          value={password}
        />
        {error ? <Text className="text-red-600" variant="small">{error}</Text> : null}
        <Button loading={isLoading} onPress={handleSubmit}>
          {isRegister ? "Tạo tài khoản" : "Đăng nhập"}
        </Button>
        <Button onPress={resetLocalSession} variant="ghost">
          Xóa phiên local
        </Button>
        <Text className="text-center" variant="muted">
          {isRegister ? "Đã có tài khoản? " : "Chưa có tài khoản? "}
          <Link href={isRegister ? "/login" : "/register"}>
            {isRegister ? "Đăng nhập" : "Đăng ký"}
          </Link>
        </Text>
      </Card>
    </View>
  );
}
