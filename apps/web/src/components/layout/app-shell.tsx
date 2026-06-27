"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  CircleHelp,
  Home,
  LogOut,
  MoreHorizontal,
  ReceiptText,
  Search,
  Settings,
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
  useLogoutMutation,
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
  { href: "/groups", label: "Tổng quan", icon: Home, activePath: "/groups" },
  { href: "/groups", label: "Nhóm chi tiêu", icon: Users, activePath: "/groups" },
  { href: "/groups", label: "Chi tiêu", icon: ReceiptText },
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
  const shouldLoadCurrentUser =
    authHydrated && !currentUser && Boolean(getAuthToken());
  const { data: fetchedCurrentUser } = useGetCurrentUserQuery(undefined, {
    skip: !shouldLoadCurrentUser,
  });

  useEffect(() => {
    if (!fetchedCurrentUser) {
      return;
    }

    dispatch(setCurrentUser(fetchedCurrentUser));
    setStoredCurrentUser(fetchedCurrentUser);
  }, [dispatch, fetchedCurrentUser]);

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
              <div className="flex size-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <WalletCards size={18} />
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
                <div className="flex size-8 items-center justify-center rounded-lg bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground">
                  {userInitials}
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
                  <div className="flex size-11 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground">
                    {userInitials}
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
              <Button
                aria-label="Thông báo"
                size="icon"
                type="button"
                variant="outline"
              >
                <Bell size={18} />
              </Button>
              {action}
            </div>
          </header>

          <div className="px-4 py-5 sm:px-6 lg:px-8">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
