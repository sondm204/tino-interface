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
import { Badge } from "@/src/components/ui/status";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/src/lib/format";
import { groupTypeLabel } from "@/src/lib/labels";
import { useAppSelector } from "@/src/store/hooks";
import {
  useCreateGroupMutation,
  useGetGroupsQuery,
} from "@/src/store/tino-api-slice";

export function GroupsScreen() {
  const currentUser = useAppSelector((state) => state.auth.user);
  const authHydrated = useAppSelector((state) => state.auth.hydrated);
  const {
    data: groupsData,
    error: groupsError,
    isLoading: groupsLoading,
  } = useGetGroupsQuery(
    { page: 1, size: 20 },
    { skip: !authHydrated || !currentUser }
  );
  const [createGroup, createGroupState] = useCreateGroupMutation();
  const groups = useMemo(() => groupsData?.items ?? [], [groupsData]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"personal" | "shared">("shared");
  const [currency, setCurrency] = useState<"VND" | "USD">("VND");
  const [formError, setFormError] = useState<string | null>(null);
  const loading = !authHydrated || groupsLoading;
  const saving = createGroupState.isLoading;
  const queryError =
    groupsError &&
    "message" in groupsError &&
    typeof groupsError.message === "string"
      ? groupsError.message
      : null;
  const error = formError || queryError;

  const totalGroups = groups.length;
  const sharedGroups = useMemo(
    () => groups.filter((group) => group.type === "shared").length,
    [groups]
  );
  const currentUserExpenseByCurrency = useMemo(() => {
    const totals = groups.reduce<Record<string, number>>((result, group) => {
      result[group.currency] =
        (result[group.currency] ?? 0) + Number(group.user_share_amount ?? 0);

      return result;
    }, {});

    const entries = Object.entries(totals).filter(([, amount]) => amount > 0) as Array<
      [string, number]
    >;

    return entries.length > 0 ? entries : ([["VND", 0]] as Array<[string, number]>);
  }, [groups]);

  async function handleCreateGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!currentUser) {
      const message = "Vui lòng đăng nhập trước khi tạo nhóm.";
      setFormError(message);
      toast.error(message);
      return;
    }

    setFormError(null);

    try {
      await createGroup({
        name,
        description,
        type,
        currency,
      }).unwrap();

      setName("");
      setDescription("");
      setType("shared");
      setCurrency("VND");
      toast.success("Tạo nhóm thành công");
    } catch (err) {
      const message =
        typeof err === "object" &&
        err !== null &&
        "message" in err &&
        typeof err.message === "string"
          ? err.message
          : "Không thể tạo nhóm";
      setFormError(message);
      toast.error(message);
    }
  }

  return (
    <AppShell
      subtitle="Nhóm chi tiêu"
      title="Các nhóm chi tiêu"
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <section className="grid gap-3 md:grid-cols-3">
            <Card className="p-4">
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Tổng số nhóm
              </p>
              {loading ? (
                <Skeleton className="mt-3 h-8 w-16" />
              ) : (
                <p className="mt-3 text-2xl font-semibold">{totalGroups}</p>
              )}
            </Card>
            <Card className="p-4">
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Nhóm dùng chung
              </p>
              {loading ? (
                <Skeleton className="mt-3 h-8 w-16" />
              ) : (
                <p className="mt-3 text-2xl font-semibold">{sharedGroups}</p>
              )}
            </Card>
            <Card className="p-4">
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Tổng chi tiêu của bạn
              </p>
              {loading ? (
                <Skeleton className="mt-3 h-8 w-28" />
              ) : (
                <p className="mt-3 text-xl font-semibold md:text-2xl">
                  {currentUserExpenseByCurrency
                    .map(([currency, amount]) => formatCurrency(amount, currency))
                    .join(" + ")}
                </p>
              )}
            </Card>
          </section>

          <Card>
            <CardHeader
              description="Mở một nhóm để quản lý chi tiêu và khoản cần thanh toán."
              title="Nhóm của bạn"
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
            ) : groups.length === 0 ? (
              <EmptyState
                description="Tạo nhóm đầu tiên cho chi tiêu cá nhân, phòng trọ hoặc công ty."
                icon={<Users size={20} />}
                title="Chưa có nhóm nào"
              />
            ) : (
              <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {groups.map((group) => (
                  <Link
                    className="flex items-center justify-between gap-4 p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
                    href={`/groups/${group.id}`}
                    key={group.id}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-semibold">{group.name}</p>
                        <Badge tone={group.type === "shared" ? "blue" : "green"}>
                          {groupTypeLabel(group.type)}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        {group.description || "Chưa có mô tả"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{group.currency}</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {formatCurrency(group.total_amount ?? 0, group.currency)}
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
            description="Mỗi nhóm có danh mục, chi tiêu, thành viên và quyết toán riêng."
            title="Tạo nhóm"
          />
          <CardBody>
            <form className="space-y-4" id="create-group-form" onSubmit={handleCreateGroup}>
              <TextField
                label="Tên nhóm"
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
                  label="Loại nhóm"
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
                {saving ? "Đang tạo..." : "Tạo nhóm"}
              </Button>
            </form>
          </CardBody>
        </Card>
      </div>
    </AppShell>
  );
}
