"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { Users, WalletCards } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/src/components/layout/app-shell";
import { Button } from "@/src/components/ui/button";
import { Card, CardBody, CardHeader } from "@/src/components/ui/card";
import { EmptyState } from "@/src/components/ui/empty-state";
import { SelectField, TextAreaField, TextField } from "@/src/components/ui/field";
import { MonthPicker } from "@/src/components/ui/month-picker";
import { Badge } from "@/src/components/ui/status";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/src/lib/format";
import { walletTypeLabel } from "@/src/lib/labels";
import { useAppSelector } from "@/src/store/hooks";
import {
  useCreateWalletMutation,
  useGetWalletsQuery,
} from "@/src/store/tino-api-slice";

export function WalletsScreen() {
  const currentUser = useAppSelector((state) => state.auth.user);
  const authHydrated = useAppSelector((state) => state.auth.hydrated);
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const {
    data: walletsData,
    error: walletsError,
    isLoading: walletsLoading,
  } = useGetWalletsQuery(
    { page: 1, size: 20, month },
    { skip: !authHydrated || !currentUser }
  );
  const [createWallet, createWalletState] = useCreateWalletMutation();
  const wallets = useMemo(() => walletsData?.items ?? [], [walletsData]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"personal" | "shared">("shared");
  const [currency, setCurrency] = useState<"VND" | "USD">("VND");
  const [formError, setFormError] = useState<string | null>(null);
  const loading = !authHydrated || walletsLoading;
  const saving = createWalletState.isLoading;
  const queryError =
    walletsError &&
      "message" in walletsError &&
      typeof walletsError.message === "string"
      ? walletsError.message
      : null;
  const error = formError || queryError;

  const totalWallets = wallets.length;
  const sharedWallets = useMemo(
    () => wallets.filter((wallet) => wallet.type === "shared").length,
    [wallets]
  );
  const currentUserExpenseByCurrency = useMemo(() => {
    const totals = wallets.reduce<Record<string, number>>((result, wallet) => {
      result[wallet.currency] =
        (result[wallet.currency] ?? 0) + Number(wallet.user_share_amount ?? 0);

      return result;
    }, {});

    const entries = Object.entries(totals).filter(([, amount]) => amount > 0) as Array<
      [string, number]
    >;

    return entries.length > 0 ? entries : ([["VND", 0]] as Array<[string, number]>);
  }, [wallets]);

  async function handleCreateWallet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!currentUser) {
      const message = "Vui lòng đăng nhập trước khi tạo ví.";
      setFormError(message);
      toast.error(message);
      return;
    }

    setFormError(null);

    try {
      await createWallet({
        name,
        description,
        type,
        currency,
      }).unwrap();

      setName("");
      setDescription("");
      setType("shared");
      setCurrency("VND");
      toast.success("Tạo ví thành công");
    } catch (err) {
      const message =
        typeof err === "object" &&
          err !== null &&
          "message" in err &&
          typeof err.message === "string"
          ? err.message
          : "Không thể tạo ví";
      setFormError(message);
      toast.error(message);
    }
  }

  return (
    <AppShell
      subtitle="Ví chi tiêu"
      title="Ví của bạn"
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <section className="grid gap-3 md:grid-cols-3">
            <Card className="p-4 gap-2">
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Tổng số ví
              </p>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-2xl font-semibold">{totalWallets}</p>
              )}
            </Card>
            <Card className="p-4 gap-2">
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Ví nhóm
              </p>
              {loading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-2xl font-semibold">{sharedWallets}</p>
              )}
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    Tổng chi tiêu của bạn
                  </p>
                  {loading ? (
                    <Skeleton className="mt-3 h-8 w-28" />
                  ) : (
                    <p className="mt-2 text-xl font-semibold md:text-2xl">
                      {currentUserExpenseByCurrency
                        .map(([currency, amount]) => formatCurrency(amount, currency))
                        .join(" + ")}
                    </p>
                  )}
                </div>
                <MonthPicker
                  ariaLabel="Chọn tháng tổng chi tiêu"
                  onValueChange={setMonth}
                  value={month}
                />
              </div>
            </Card>
          </section>

          <Card>
            <CardHeader
              description="Mở một ví để quản lý chi tiêu và khoản cần thanh toán."
              title="Danh sách ví"
            />
            {error ? (
              <p className="mx-4 mt-4 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                {error}
              </p>
            ) : null}
            {loading ? (
              <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    className="flex items-center justify-between gap-4 p-4"
                    key={index}
                  >
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </div>
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Skeleton className="h-4 w-12" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            ) : wallets.length === 0 ? (
              <EmptyState
                description="Tạo ví đầu tiên cho chi tiêu cá nhân, phòng trọ hoặc công ty."
                icon={<Users size={20} />}
                title="Chưa có ví nào"
              />
            ) : (
              <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {wallets.map((wallet) => (
                  <Link
                    className="flex items-center justify-between gap-4 p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                    href={`/wallets/${wallet.id}`}
                    key={wallet.id}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-semibold">{wallet.name}</p>
                        <Badge tone={wallet.type === "shared" ? "blue" : "green"}>
                          {walletTypeLabel(wallet.type)}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        {wallet.description || "Chưa có mô tả"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{wallet.currency}</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {formatCurrency(wallet.user_share_amount ?? 0, wallet.currency)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>

        <Card>
          <CardHeader
            description="Mỗi ví có danh mục, chi tiêu, thành viên và quyết toán riêng."
            title="Tạo ví"
          />
          <CardBody>
            <form className="space-y-4" id="create-wallet-form" onSubmit={handleCreateWallet}>
              <TextField
                label="Tên ví"
                onChange={(event) => setName(event.target.value)}
                placeholder="Phòng 302"
                required
                value={name}
              />
              <TextAreaField
                label="Mô tả"
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Chi tiêu chung hằng tháng"
                value={description}
              />
              <div className="grid grid-cols-2 gap-3">
                <SelectField
                  label="Loại ví"
                  onValueChange={(value) => setType(value as "personal" | "shared")}
                  options={[
                    { value: "personal", label: "Cá nhân" },
                    { value: "shared", label: "Nhóm" },
                  ]}
                  value={type}
                />
                <SelectField
                  label="Tiền tệ"
                  onValueChange={(value) => setCurrency(value as "VND" | "USD")}
                  options={[
                    { value: "VND", label: "VND" },
                    { value: "USD", label: "USD" },
                  ]}
                  value={currency}
                />
              </div>
              <Button className="w-full" disabled={saving} type="submit">
                <WalletCards size={17} />
                {saving ? "Đang tạo..." : "Tạo ví"}
              </Button>
            </form>
          </CardBody>
        </Card>
      </div>
    </AppShell>
  );
}
