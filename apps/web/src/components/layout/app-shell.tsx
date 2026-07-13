"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  CircleHelp,
  LayoutList,
  LogOut,
  MoreHorizontal,
  ReceiptText,
  Search,
  Settings,
  UserRound,
  Users,
  WalletCards,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo } from "react";
import { ThemeToggle } from "@/src/components/layout/theme-toggle";
import { Button } from "@/src/components/ui/button";
import { ConfirmDialog } from "@/src/components/ui/confirm-dialog";
import {
  clearAuthToken,
  getAuthToken,
  getRefreshToken,
  setStoredCurrentUser,
} from "@/src/lib/api-client";
import {
  clearCurrentUser,
  setCurrentUser,
} from "@/src/store/auth-slice";
import { useAppDispatch, useAppSelector } from "@/src/store/hooks";
import {
  tinoApiSlice,
  useGetCurrentUserQuery,
  useGetNotificationsQuery,
  useGetUnreadNotificationCountQuery,
  useLogoutMutation,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
} from "@/src/store/tino-api-slice";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

const iconModeButtonClass =
  "group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:[&>span]:hidden";

const mainNavItems = [
  { href: "/wallets", label: "Ví chi tiêu", icon: Users, activePath: "/wallets" },
  {
    href: "/features",
    label: "Chức năng thêm",
    icon: LayoutList,
    activePath: "/features",
  },
];
const supportNavItems = [
  { label: "Cài đặt", icon: Settings },
  { label: "Trợ giúp", icon: CircleHelp },
  { label: "Tìm kiếm", icon: Search },
];

export function AppShell({
  children,
  title,
  subtitle,
  action,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector((state) => state.auth.user);
  const authHydrated = useAppSelector((state) => state.auth.hydrated);
  const [logout] = useLogoutMutation();
  const hasStoredSession = Boolean(getAuthToken() || getRefreshToken());
  const shouldLoadCurrentUser =
    authHydrated && !currentUser && hasStoredSession;
  const { data: fetchedCurrentUser } = useGetCurrentUserQuery(undefined, {
    skip: !shouldLoadCurrentUser,
  });
  const { data: unreadNotifications } =
    useGetUnreadNotificationCountQuery(undefined, {
      skip: !authHydrated || !currentUser,
      pollingInterval: 60_000,
    });
  const { data: notificationsData, isLoading: notificationsLoading } =
    useGetNotificationsQuery(
      { page: 1, size: 10 },
      { skip: !authHydrated || !currentUser, pollingInterval: 60_000 }
    );
  const [markNotificationRead] = useMarkNotificationReadMutation();
  const [markAllNotificationsRead, markAllNotificationsState] =
    useMarkAllNotificationsReadMutation();

  useEffect(() => {
    if (!fetchedCurrentUser) {
      return;
    }

    dispatch(setCurrentUser(fetchedCurrentUser));
    setStoredCurrentUser(fetchedCurrentUser);
  }, [dispatch, fetchedCurrentUser]);

  useEffect(() => {
    if (!authHydrated || hasStoredSession) {
      return;
    }

    dispatch(clearCurrentUser());
    dispatch(tinoApiSlice.util.resetApiState());
    router.replace("/login");
  }, [authHydrated, dispatch, hasStoredSession, router]);

  const userInitials = useMemo(() => {
    const source = currentUser?.display_name || currentUser?.email || "TE";
    const words = source.trim().split(/\s+/).filter(Boolean);

    if (words.length >= 2) {
      return `${words[0][0]}${words[1][0]}`.toUpperCase();
    }

    return source.slice(0, 2).toUpperCase();
  }, [currentUser]);

  async function handleLogout() {
    try {
      await logout().unwrap();
    } catch {
      // Local session is cleared even if the backend token revoke fails.
    }

    clearAuthToken();
    dispatch(clearCurrentUser());
    dispatch(tinoApiSlice.util.resetApiState());
    router.push("/login");
  }

  async function handleNotification(
    notification: NonNullable<typeof notificationsData>["items"][number]
  ) {
    if (notification.status === "UNREAD") {
      await markNotificationRead(notification.id);
    }

    const walletId = notification.metadata.wallet_id;
    if (walletId) router.push(`/wallets/${walletId}`);
  }

  if (!authHydrated || !currentUser || !hasStoredSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f8f5] dark:bg-zinc-950">
        <div className="size-6 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100" />
      </main>
    );
  }

  return (
    <TooltipProvider>
      <SidebarProvider>
        <Sidebar
          className="border-sidebar-border"
          collapsible="icon"
          variant="sidebar"
        >
          <SidebarHeader className="gap-3 p-4 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-2">
            <div className="flex items-center gap-3 rounded-lg px-2 py-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
              <div className="flex size-9 items-center justify-center overflow-hidden rounded-lg">
                <img
                  alt="Tino Expense"
                  className="size-full object-contain"
                  src="/images/tino-icon.png"
                />
              </div>
              <div className="min-w-0 group-data-[collapsible=icon]:hidden">
                <p className="truncate text-sm font-semibold">Tino Expense</p>
                <p className="truncate text-xs text-sidebar-foreground/60">
                  Theo dõi chi tiêu
                </p>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {mainNavItems.map((item) => {
                    const Icon = item.icon;
                    const active = item.activePath
                      ? pathname.startsWith(item.activePath)
                      : pathname === item.href;

                    return (
                      <SidebarMenuItem key={item.label}>
                        <SidebarMenuButton
                          className={iconModeButtonClass}
                          isActive={active}
                          render={<Link href={item.href} />}
                          tooltip={item.label}
                        >
                          <Icon />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Quản lý</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      className={iconModeButtonClass}
                      tooltip="Danh mục"
                    >
                      <WalletCards />
                      <span>Danh mục</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      className={iconModeButtonClass}
                      tooltip="Báo cáo"
                    >
                      <ReceiptText />
                      <span>Báo cáo</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      className={iconModeButtonClass}
                      tooltip="Khác"
                    >
                      <MoreHorizontal />
                      <span>Khác</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="p-4 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-2">
            <SidebarMenu>
              {supportNavItems.map((item) => {
                const Icon = item.icon;

                return (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton
                      className={iconModeButtonClass}
                      isActive={"href" in item && pathname === item.href}
                      render={
                        "href" in item && item.href
                          ? <Link href={item.href} />
                          : undefined
                      }
                      tooltip={item.label}
                    >
                      <Icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>

            <SidebarSeparator />

            <Popover>
              <PopoverTrigger
                render={
                  <button
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
                    type="button"
                  />
                }
              >
                <div
                  className="flex size-8 items-center justify-center rounded-lg bg-sidebar-accent bg-cover bg-center text-xs font-semibold text-sidebar-accent-foreground"
                  style={
                    currentUser.avatar_url
                      ? { backgroundImage: `url("${currentUser.avatar_url}")` }
                      : undefined
                  }
                >
                  {!currentUser.avatar_url ? userInitials : null}
                </div>
                <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                  <p className="truncate text-sm font-medium">
                    {currentUser?.display_name || "Tino Expense"}
                  </p>
                  <p className="truncate text-xs text-sidebar-foreground/60">
                    {currentUser?.email || "Chưa có thông tin người dùng"}
                  </p>
                </div>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-fit p-3" side="top" sideOffset={10}>
                <div className="flex items-start gap-3 rounded-lg border border-border p-3">
                  <div
                    className="flex size-11 items-center justify-center rounded-lg bg-primary bg-cover bg-center text-sm font-semibold text-primary-foreground"
                    style={
                      currentUser.avatar_url
                        ? { backgroundImage: `url("${currentUser.avatar_url}")` }
                        : undefined
                    }
                  >
                    {!currentUser.avatar_url ? userInitials : null}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">
                      {currentUser?.display_name || "Chưa có tên hiển thị"}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {currentUser?.email || "Chưa có email"}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Trạng thái:{" "}
                      <span className="font-medium text-foreground">
                        {currentUser?.status === "active" ? "Hoạt động" : "Không hoạt động"}
                      </span>
                    </p>
                  </div>
                </div>
                <Button
                  className="w-full"
                  nativeButton={false}
                  render={<Link href="/profile" />}
                  type="button"
                  variant="outline"
                >
                  <UserRound size={16} />
                  Xem hồ sơ
                </Button>
                <ConfirmDialog
                  confirmText="Đăng xuất"
                  description="Bạn sẽ cần đăng nhập lại để tiếp tục sử dụng Tino Expense."
                  destructive
                  onConfirm={handleLogout}
                  title="Đăng xuất khỏi tài khoản?"
                  trigger={
                    <Button className="w-full" type="button" variant="destructive">
                      <LogOut size={16} />
                      Đăng xuất
                    </Button>
                  }
                />
              </PopoverContent>
            </Popover>
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>

        <SidebarInset className="min-h-svh bg-[#f7f8f5] text-zinc-950 transition-colors dark:bg-zinc-950 dark:text-zinc-50">
          <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/95 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
            <div className="flex min-h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
              <SidebarTrigger aria-label="Mở menu" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
                  {subtitle || "Không gian làm việc"}
                </p>
                <h1 className="truncate text-xl font-semibold">{title}</h1>
              </div>
              <ThemeToggle />
              <Popover>
                <PopoverTrigger
                  render={
                    <Button
                      aria-label="Thông báo"
                      className="relative"
                      size="icon"
                      type="button"
                      variant="outline"
                    />
                  }
                >
                  <Bell size={18} />
                  {unreadNotifications?.count ? (
                    <span className="absolute -right-1 -top-1 flex min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold leading-4 text-white">
                      {unreadNotifications.count > 99
                        ? "99+"
                        : unreadNotifications.count}
                    </span>
                  ) : null}
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  className="w-[min(380px,calc(100vw-2rem))] p-0"
                  sideOffset={8}
                >
                  <div className="flex items-center justify-between border-b p-3">
                    <p className="font-semibold">Thông báo</p>
                    {unreadNotifications?.count ? (
                      <Button
                        disabled={markAllNotificationsState.isLoading}
                        onClick={() => void markAllNotificationsRead()}
                        size="sm"
                        type="button"
                        variant="ghost"
                      >
                        <CheckCheck size={15} />
                        Đọc tất cả
                      </Button>
                    ) : null}
                  </div>
                  <div className="max-h-[420px] overflow-y-auto">
                    {notificationsLoading ? (
                      <p className="p-4 text-sm text-muted-foreground">
                        Đang tải thông báo...
                      </p>
                    ) : notificationsData?.items.length ? (
                      notificationsData.items.map((notification) => (
                        <button
                          className={`flex w-full gap-3 border-b p-3 text-left last:border-b-0 hover:bg-muted/60 ${
                            notification.status === "UNREAD"
                              ? "bg-blue-50/70 dark:bg-blue-950/30"
                              : ""
                          }`}
                          key={notification.id}
                          onClick={() => void handleNotification(notification)}
                          type="button"
                        >
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
                            <ReceiptText size={16} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span className="truncate text-sm font-semibold">
                                {notification.title}
                              </span>
                              {notification.status === "UNREAD" ? (
                                <span className="size-2 shrink-0 rounded-full bg-blue-600" />
                              ) : null}
                            </span>
                            <span className="mt-1 block text-sm text-muted-foreground">
                              <strong className="font-medium text-foreground">
                                {notification.creator?.display_name ||
                                  "Hệ thống"}
                              </strong>{" "}
                              {notification.type === "EXPENSE_CREATED"
                                ? "đã tạo khoản chi"
                                : notification.type === "EXPENSE_UPDATED"
                                  ? "đã cập nhật khoản chi"
                                  : ""}
                            </span>
                            <span className="mt-0.5 block text-sm">
                              {notification.message}
                            </span>
                            <span className="mt-1 block text-xs text-muted-foreground">
                              {new Intl.DateTimeFormat("vi-VN", {
                                dateStyle: "short",
                                timeStyle: "short",
                              }).format(new Date(notification.created_at))}
                            </span>
                          </span>
                        </button>
                      ))
                    ) : (
                      <p className="p-6 text-center text-sm text-muted-foreground">
                        Chưa có thông báo.
                      </p>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
              {action}
            </div>
          </header>

          <div className="px-4 py-5 sm:px-6 lg:px-8">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
