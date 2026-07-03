"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { WalletCards } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Card, CardBody } from "@/src/components/ui/card";
import { TextField } from "@/src/components/ui/field";
import { ThemeToggle } from "@/src/components/layout/theme-toggle";
import {
  setAuthToken,
  setRefreshToken,
  setStoredCurrentUser,
} from "@/src/lib/api-client";
import { setCurrentUser } from "@/src/store/auth-slice";
import { useAppDispatch, useAppSelector } from "@/src/store/hooks";
import {
  useLoginMutation,
  useRegisterMutation,
} from "@/src/store/tino-api-slice";

type Mode = "login" | "register";

export function AuthPanel({ mode }: { mode: Mode }) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector((state) => state.auth.user);
  const authHydrated = useAppSelector((state) => state.auth.hydrated);
  const [login, loginState] = useLoginMutation();
  const [register, registerState] = useRegisterMutation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const isRegister = mode === "register";
  const loading = loginState.isLoading || registerState.isLoading;

  useEffect(() => {
    if (authHydrated && currentUser) {
      router.replace("/wallets");
    }
  }, [authHydrated, currentUser, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    try {
      const response = isRegister
        ? await register({
            email,
            password,
            display_name: displayName,
          }).unwrap()
        : await login({ email, password }).unwrap();

      setAuthToken(response.access_token);
      setRefreshToken(response.refresh_token);
      setStoredCurrentUser(response.user);
      dispatch(setCurrentUser(response.user));

      router.push("/wallets");
    } catch (err) {
      setError(
        typeof err === "object" &&
          err !== null &&
          "message" in err &&
          typeof err.message === "string"
          ? err.message
          : "Đã có lỗi xảy ra"
      );
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f8f5] px-4 py-8 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-lg bg-zinc-950 text-white dark:bg-zinc-50 dark:text-zinc-950">
            <WalletCards size={22} />
          </div>
          <div>
            <p className="text-lg font-semibold">Tino Expense</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Quản lý ví chi tiêu cá nhân và nhóm
            </p>
          </div>
        </div>

        <Card>
          <CardBody className="p-5">
            <div className="mb-5">
              <h1 className="text-xl font-semibold">
                {isRegister ? "Tạo tài khoản" : "Chào mừng quay lại"}
              </h1>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {isRegister
                  ? "Bắt đầu quản lý các ví chi tiêu của bạn."
                  : "Đăng nhập để tiếp tục theo dõi chi tiêu."}
              </p>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              {isRegister ? (
                <TextField
                  label="Tên hiển thị"
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Minh Nguyen"
                  required
                  value={displayName}
                />
              ) : null}
              <TextField
                label="Email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
                type="email"
                value={email}
              />
              <TextField
                label="Mật khẩu"
                minLength={8}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Tối thiểu 8 ký tự"
                required
                type="password"
                value={password}
              />

              {error ? (
                <p className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                  {error}
                </p>
              ) : null}

              <Button className="w-full" disabled={loading} type="submit">
                {loading
                  ? "Vui lòng chờ..."
                  : isRegister
                    ? "Tạo tài khoản"
                    : "Đăng nhập"}
              </Button>
            </form>

            <p className="mt-5 text-center text-sm text-zinc-500 dark:text-zinc-400">
              {isRegister ? "Đã có tài khoản?" : "Chưa có tài khoản?"}{" "}
              <Link
                className="font-semibold text-zinc-950 underline-offset-4 hover:underline dark:text-zinc-50"
                href={isRegister ? "/login" : "/register"}
              >
                {isRegister ? "Đăng nhập" : "Đăng ký"}
              </Link>
            </p>
          </CardBody>
        </Card>
      </div>
    </main>
  );
}
