"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Plus, Users, WalletCards } from "lucide-react";
import { AppShell } from "@/src/components/layout/app-shell";
import { Button } from "@/src/components/ui/button";
import { Card, CardBody, CardHeader } from "@/src/components/ui/card";
import { EmptyState } from "@/src/components/ui/empty-state";
import { SelectField, TextAreaField, TextField } from "@/src/components/ui/field";
import { Badge } from "@/src/components/ui/status";
import { formatCurrency } from "@/src/lib/format";
import { groupTypeLabel } from "@/src/lib/labels";
import { tinoApi } from "@/src/services/tino-api";
import type { Group, User } from "@/src/types/domain";

export function GroupsScreen() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"personal" | "shared">("shared");
  const [currency, setCurrency] = useState<"VND" | "USD">("VND");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalGroups = groups.length;
  const sharedGroups = useMemo(
    () => groups.filter((group) => group.type === "shared").length,
    [groups]
  );

  async function loadData() {
    setError(null);
    setLoading(true);

    try {
      const [meResponse, groupsResponse] = await Promise.all([
        tinoApi.me().catch(() => ({ data: null })),
        tinoApi.listGroups(),
      ]);

      setCurrentUser(meResponse.data);
      setGroups(groupsResponse.data?.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải danh sách nhóm");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function run() {
      await loadData();
    }

    void run();
  }, []);

  async function handleCreateGroup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!currentUser) {
      setError("Vui lòng đăng nhập trước khi tạo nhóm.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await tinoApi.createGroup({
        name,
        description,
        type,
        currency,
        owner_id: currentUser.id,
      });

      const createdGroup = response.data?.group;

      if (createdGroup) {
        setGroups((current) => [createdGroup, ...current]);
      }

      setName("");
      setDescription("");
      setType("shared");
      setCurrency("VND");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tạo nhóm");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell
      action={
        <Button className="hidden sm:inline-flex" form="create-group-form" type="submit">
          <Plus size={17} />
          Tạo nhóm
        </Button>
      }
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
              <p className="mt-3 text-2xl font-semibold">{totalGroups}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Nhóm dùng chung
              </p>
              <p className="mt-3 text-2xl font-semibold">{sharedGroups}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Tiền tệ mặc định
              </p>
              <p className="mt-3 text-2xl font-semibold">VND</p>
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
              <CardBody>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Đang tải nhóm...
                </p>
              </CardBody>
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
                        {formatCurrency(0, group.currency)}
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
                  onChange={(event) => setType(event.target.value as "personal" | "shared")}
                  value={type}
                >
                  <option value="personal">Cá nhân</option>
                  <option value="shared">Nhóm</option>
                </SelectField>
                <SelectField
                  label="Tiền tệ"
                  onChange={(event) => setCurrency(event.target.value as "VND" | "USD")}
                  value={currency}
                >
                  <option value="VND">VND</option>
                  <option value="USD">USD</option>
                </SelectField>
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
