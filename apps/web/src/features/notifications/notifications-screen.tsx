"use client";

import { useRouter } from "next/navigation";
import { Bell, CheckCheck, ReceiptText } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/src/components/layout/app-shell";
import { Button } from "@/src/components/ui/button";
import { Card, CardHeader } from "@/src/components/ui/card";
import { EmptyState } from "@/src/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useGetNotificationsQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
} from "@/src/store/tino-api-slice";
import type { Notification } from "@/src/types/domain";

function formatNotificationDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function NotificationsScreen() {
  const router = useRouter();
  const { data, isLoading } = useGetNotificationsQuery({ page: 1, size: 50 });
  const [markRead] = useMarkNotificationReadMutation();
  const [markAllRead, markAllState] = useMarkAllNotificationsReadMutation();
  const notifications = data?.items ?? [];
  const hasUnread = notifications.some(
    (notification) => notification.status === "UNREAD"
  );

  async function handleNotification(notification: Notification) {
    if (notification.status === "UNREAD") {
      try {
        await markRead(notification.id).unwrap();
      } catch {
        toast.error("Không thể đánh dấu thông báo đã đọc");
        return;
      }
    }

    const walletId = notification.metadata.wallet_id;
    if (walletId) router.push(`/wallets/${walletId}`);
  }

  async function handleMarkAllRead() {
    try {
      await markAllRead().unwrap();
      toast.success("Đã đánh dấu tất cả thông báo là đã đọc");
    } catch {
      toast.error("Không thể cập nhật thông báo");
    }
  }

  return (
    <AppShell
      action={
        hasUnread ? (
          <Button
            disabled={markAllState.isLoading}
            onClick={() => void handleMarkAllRead()}
            type="button"
            variant="outline"
          >
            <CheckCheck size={16} />
            Đọc tất cả
          </Button>
        ) : null
      }
      subtitle="Tài khoản"
      title="Thông báo"
    >
      <Card>
        <CardHeader
          description="Các thay đổi chi tiêu trong những ví bạn tham gia."
          title="Danh sách thông báo"
        />
        {isLoading ? (
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {Array.from({ length: 5 }).map((_, index) => (
              <div className="flex gap-3 p-4" key={index}>
                <Skeleton className="size-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-28" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <EmptyState
            description="Thông báo mới về chi tiêu sẽ xuất hiện tại đây."
            icon={<Bell size={20} />}
            title="Chưa có thông báo"
          />
        ) : (
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {notifications.map((notification) => (
              <button
                className="flex w-full gap-3 p-4 text-left hover:bg-zinc-50 dark:hover:bg-zinc-900"
                key={notification.id}
                onClick={() => void handleNotification(notification)}
                type="button"
              >
                <span
                  className={`mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full ${
                    notification.status === "UNREAD"
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                      : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                  }`}
                >
                  <ReceiptText size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate font-semibold">
                      {notification.title}
                    </span>
                    {notification.status === "UNREAD" ? (
                      <span className="size-2 shrink-0 rounded-full bg-blue-600" />
                    ) : null}
                  </span>
                  <span className="mt-1 block text-sm text-zinc-600 dark:text-zinc-300">
                    <strong className="font-medium text-zinc-950 dark:text-zinc-50">
                      {notification.creator?.display_name || "Hệ thống"}
                    </strong>{" "}
                    {notification.type === "EXPENSE_CREATED"
                      ? "đã tạo khoản chi"
                      : notification.type === "EXPENSE_UPDATED"
                        ? "đã cập nhật khoản chi"
                        : ""}
                  </span>
                  <span className="mt-1 block text-sm text-zinc-600 dark:text-zinc-300">
                    {notification.message}
                  </span>
                  <span className="mt-2 block text-xs text-zinc-500 dark:text-zinc-400">
                    {formatNotificationDate(notification.created_at)}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </Card>
    </AppShell>
  );
}
