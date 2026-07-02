"use client";

import {
  type ChangeEvent,
  type FormEvent,
  useMemo,
  useRef,
  useState,
} from "react";
import { Camera, Copy, KeyRound, Save, Send, UserRound } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/src/components/layout/app-shell";
import { TextField } from "@/src/components/ui/field";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { setStoredCurrentUser } from "@/src/lib/api-client";
import { setCurrentUser } from "@/src/store/auth-slice";
import { useAppDispatch, useAppSelector } from "@/src/store/hooks";
import {
  useChangePasswordMutation,
  useCreateTelegramLinkCodeMutation,
  useUpdateProfileMutation,
  useUploadAvatarMutation,
} from "@/src/store/tino-api-slice";
import type { User } from "@/src/types/domain";
import type { TelegramCode } from "@/src/services/tino-api";

function getErrorMessage(error: unknown, fallback: string) {
  return typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
    ? error.message
    : fallback;
}

export function ProfileScreen() {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector((state) => state.auth.user);
  const authHydrated = useAppSelector((state) => state.auth.hydrated);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updateProfile, profileState] = useUpdateProfileMutation();
  const [changePassword, passwordState] = useChangePasswordMutation();
  const [uploadAvatar, avatarState] = useUploadAvatarMutation();
  const [createTelegramLinkCode, telegramCodeState] =
    useCreateTelegramLinkCodeMutation();
  const [telegramCode, setTelegramCode] = useState<TelegramCode | null>(null);

  const initials = useMemo(() => {
    const words = (currentUser?.display_name || currentUser?.email || "TE")
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    return (words.length > 1
      ? `${words[0][0]}${words[1][0]}`
      : words[0]?.slice(0, 2) || "TE"
    ).toUpperCase();
  }, [currentUser]);

  function syncUser(user: User) {
    dispatch(setCurrentUser(user));
    setStoredCurrentUser(user);
  }

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    try {
      const user = await updateProfile({
        display_name: String(formData.get("display_name") || ""),
      }).unwrap();
      syncUser(user);
      toast.success("Đã cập nhật thông tin tài khoản");
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể cập nhật thông tin"));
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp");
      return;
    }

    try {
      await changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      }).unwrap();
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Đã đổi mật khẩu");
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể đổi mật khẩu"));
    }
  }

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ảnh đại diện không được vượt quá 5 MB");
      return;
    }

    try {
      const result = await uploadAvatar(file).unwrap();
      syncUser(result.user);
      toast.success("Đã cập nhật ảnh đại diện");
    } catch (error) {
      toast.error(getErrorMessage(error, "Không thể tải ảnh đại diện"));
    }
  }

  async function handleCreateTelegramCode() {
    try {
      const code = await createTelegramLinkCode().unwrap();
      setTelegramCode(code);
      toast.success("Đã tạo mã liên kết Telegram");
    } catch (error) {
      toast.error(
        getErrorMessage(error, "Không thể tạo mã liên kết Telegram")
      );
    }
  }

  async function handleCopyTelegramCode() {
    if (!telegramCode) return;
    await navigator.clipboard.writeText(`/link ${telegramCode.code}`);
    toast.success("Đã sao chép lệnh liên kết");
  }

  return (
    <AppShell subtitle="Tài khoản" title="Hồ sơ cá nhân">
      {!authHydrated || !currentUser ? (
        <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
          <Skeleton className="h-72" />
          <div className="space-y-5">
            <Skeleton className="h-72" />
            <Skeleton className="h-72" />
          </div>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Ảnh đại diện</CardTitle>
              <CardDescription>JPEG, PNG, WebP hoặc GIF, tối đa 5 MB.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <div
                className="flex size-32 items-center justify-center rounded-full border-4 border-background bg-muted bg-cover bg-center text-3xl font-semibold ring-1 ring-border"
                style={
                  currentUser.avatar_url
                    ? { backgroundImage: `url("${currentUser.avatar_url}")` }
                    : undefined
                }
              >
                {!currentUser.avatar_url ? initials : null}
              </div>
              <input
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleAvatarChange}
                ref={fileInputRef}
                type="file"
              />
              <Button
                className="w-full"
                disabled={avatarState.isLoading}
                onClick={() => fileInputRef.current?.click()}
                type="button"
                variant="outline"
              >
                <Camera />
                {avatarState.isLoading ? "Đang tải lên..." : "Chọn ảnh mới"}
              </Button>
              <div className="w-full border-t pt-4 text-center">
                <p className="font-medium">{currentUser.display_name}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {currentUser.email}
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserRound />
                  Thông tin cơ bản
                </CardTitle>
                <CardDescription>
                  Thông tin này được hiển thị trong các ví bạn tham gia.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  className="space-y-4"
                  key={`${currentUser.id}:${currentUser.updated_at}`}
                  onSubmit={handleProfileSubmit}
                >
                  <TextField
                    defaultValue={currentUser.display_name}
                    label="Tên hiển thị"
                    name="display_name"
                    required
                  />
                  <TextField
                    defaultValue={currentUser.email}
                    disabled
                    label="Email"
                    type="email"
                  />
                  <p className="text-xs text-muted-foreground">
                    Email đăng nhập hiện chưa thể thay đổi.
                  </p>
                  <div className="flex justify-end">
                    <Button disabled={profileState.isLoading} type="submit">
                      <Save />
                      {profileState.isLoading ? "Đang lưu..." : "Lưu thay đổi"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <KeyRound />
                  Đổi mật khẩu
                </CardTitle>
                <CardDescription>
                  Mật khẩu mới cần có ít nhất 8 ký tự.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={handlePasswordSubmit}>
                  <TextField
                    autoComplete="current-password"
                    label="Mật khẩu hiện tại"
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    required
                    type="password"
                    value={currentPassword}
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <TextField
                      autoComplete="new-password"
                      label="Mật khẩu mới"
                      minLength={8}
                      onChange={(event) => setNewPassword(event.target.value)}
                      required
                      type="password"
                      value={newPassword}
                    />
                    <TextField
                      autoComplete="new-password"
                      label="Xác nhận mật khẩu"
                      minLength={8}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      required
                      type="password"
                      value={confirmPassword}
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button disabled={passwordState.isLoading} type="submit">
                      <KeyRound />
                      {passwordState.isLoading ? "Đang cập nhật..." : "Đổi mật khẩu"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send />
                  Telegram
                </CardTitle>
                <CardDescription>
                  Tạo mã dùng một lần để liên kết tài khoản Tino với Telegram.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {telegramCode ? (
                  <div className="space-y-3 rounded-md border bg-muted/40 p-4">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        Gửi lệnh này cho Tino Telegram Bot
                      </p>
                      <p className="mt-2 font-mono text-xl font-semibold tracking-wider">
                        /link {telegramCode.code}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Hết hạn lúc{" "}
                      {new Intl.DateTimeFormat("vi-VN", {
                        dateStyle: "short",
                        timeStyle: "short",
                      }).format(new Date(telegramCode.expires_at))}
                    </p>
                    <Button
                      className="w-full sm:w-auto"
                      onClick={() => void handleCopyTelegramCode()}
                      type="button"
                      variant="outline"
                    >
                      <Copy />
                      Sao chép lệnh
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Mã có hiệu lực trong 10 phút và chỉ sử dụng được một lần.
                  </p>
                )}
                <Button
                  disabled={telegramCodeState.isLoading}
                  onClick={() => void handleCreateTelegramCode()}
                  type="button"
                >
                  <Send />
                  {telegramCodeState.isLoading
                    ? "Đang tạo mã..."
                    : telegramCode
                      ? "Tạo mã mới"
                      : "Tạo mã liên kết"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </AppShell>
  );
}
