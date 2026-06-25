"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  CircleHelp,
  Home,
  LogOut,
  MoreHorizontal,
  PlusCircle,
  ReceiptText,
  Search,
  Settings,
  Users,
  WalletCards,
} from "lucide-react";
import type { ReactNode } from "react";
import { ThemeToggle } from "@/src/components/layout/theme-toggle";
import { Button } from "@/src/components/ui/button";
import { clearAuthToken } from "@/src/lib/api-client";
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

  function handleLogout() {
    clearAuthToken();
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
          <SidebarHeader className="gap-3 p-4">
            <div className="flex items-center gap-3 rounded-lg px-2 py-1">
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

            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  className="h-10 bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 hover:text-sidebar-primary-foreground"
                  tooltip="Tạo nhanh"
                >
                  <PlusCircle />
                  <span>Tạo nhanh</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
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
                    <SidebarMenuButton tooltip="Danh mục">
                      <WalletCards />
                      <span>Danh mục</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton tooltip="Báo cáo">
                      <ReceiptText />
                      <span>Báo cáo</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton tooltip="Khác">
                      <MoreHorizontal />
                      <span>Khác</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="p-4">
            <SidebarMenu>
              {supportNavItems.map((item) => {
                const Icon = item.icon;

                return (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton tooltip={item.label}>
                      <Icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
              <SidebarMenuItem>
                <SidebarMenuButton onClick={handleLogout} tooltip="Đăng xuất">
                  <LogOut />
                  <span>Đăng xuất</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>

            <SidebarSeparator />

            <div className="flex items-center gap-3 px-2 py-1.5 group-data-[collapsible=icon]:justify-center">
              <div className="flex size-8 items-center justify-center rounded-lg bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground">
                TE
              </div>
              <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                <p className="truncate text-sm font-medium">Tino Expense</p>
                <p className="truncate text-xs text-sidebar-foreground/60">
                  workspace local
                </p>
              </div>
            </div>
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
