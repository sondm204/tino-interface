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
      setError(err instanceof Error ? err.message : "Cannot load groups");
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
      setError("Please login before creating a group.");
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
      setError(err instanceof Error ? err.message : "Cannot create group");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell
      action={
        <Button className="hidden sm:inline-flex" form="create-group-form" type="submit">
          <Plus size={17} />
          Create group
        </Button>
      }
      subtitle="Groups"
      title="Expense groups"
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <section className="grid gap-3 md:grid-cols-3">
            <Card className="p-4">
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Total groups
              </p>
              <p className="mt-3 text-2xl font-semibold">{totalGroups}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Shared groups
              </p>
              <p className="mt-3 text-2xl font-semibold">{sharedGroups}</p>
            </Card>
            <Card className="p-4">
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Default currency
              </p>
              <p className="mt-3 text-2xl font-semibold">VND</p>
            </Card>
          </section>

          <Card>
            <CardHeader
              description="Open a group to manage expenses and settlements."
              title="Your groups"
            />
            {error ? (
              <p className="mx-4 mt-4 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                {error}
              </p>
            ) : null}
            {loading ? (
              <CardBody>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Loading groups...
                </p>
              </CardBody>
            ) : groups.length === 0 ? (
              <EmptyState
                description="Create your first group for personal, room, or company spending."
                icon={<Users size={20} />}
                title="No groups yet"
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
                          {group.type}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        {group.description || "No description"}
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
            description="Groups scope categories, expenses, members and settlements."
            title="Create group"
          />
          <CardBody>
            <form className="space-y-4" id="create-group-form" onSubmit={handleCreateGroup}>
              <TextField
                label="Name"
                onChange={(event) => setName(event.target.value)}
                placeholder="Room 302"
                required
                value={name}
              />
              <TextAreaField
                label="Description"
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Shared monthly spending"
                value={description}
              />
              <div className="grid grid-cols-2 gap-3">
                <SelectField
                  label="Type"
                  onChange={(event) => setType(event.target.value as "personal" | "shared")}
                  value={type}
                >
                  <option value="personal">Personal</option>
                  <option value="shared">Shared</option>
                </SelectField>
                <SelectField
                  label="Currency"
                  onChange={(event) => setCurrency(event.target.value as "VND" | "USD")}
                  value={currency}
                >
                  <option value="VND">VND</option>
                  <option value="USD">USD</option>
                </SelectField>
              </div>
              <Button className="w-full" disabled={saving} type="submit">
                <WalletCards size={17} />
                {saving ? "Creating..." : "Create group"}
              </Button>
            </form>
          </CardBody>
        </Card>
      </div>
    </AppShell>
  );
}
