"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Home, LogOut, Menu, ReceiptText, Settings, Users, WalletCards } from "lucide-react";
import type { ReactNode } from "react";
import { ThemeToggle } from "@/src/components/layout/theme-toggle";
import { clearAuthToken } from "@/src/lib/api-client";
import { cn } from "@/src/lib/cn";

const navItems = [
  { href: "/groups", label: "Nhóm", icon: Users, activePath: "/groups" },
  { href: "/groups", label: "Tổng quan", icon: Home },
  { href: "/groups", label: "Chi tiêu", icon: ReceiptText },
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
    <main className="min-h-screen bg-[#f7f8f5] text-zinc-950 transition-colors dark:bg-zinc-950 dark:text-zinc-50">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 lg:block">
          <div className="flex h-full flex-col">
            <div className="border-b border-zinc-200 px-5 py-5 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-zinc-950 text-white dark:bg-zinc-50 dark:text-zinc-950">
                  <WalletCards size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold">Tino Expense</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Không gian theo dõi chi tiêu
                  </p>
                </div>
              </div>
            </div>

            <nav className="space-y-1 px-3 py-4 text-sm">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = item.activePath
                  ? pathname.startsWith(item.activePath)
                  : false;

                return (
                  <Link
                    className={cn(
                      "flex h-10 items-center gap-3 rounded-md px-3 font-medium",
                      active
                        ? "bg-zinc-950 text-white dark:bg-zinc-50 dark:text-zinc-950"
                        : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
                    )}
                    href={item.href}
                    key={item.label}
                  >
                    <Icon size={17} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto border-t border-zinc-200 p-4 dark:border-zinc-800">
              <button className="flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900">
                <Settings size={17} />
                Cài đặt
              </button>
              <button
                className="mt-1 flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900"
                onClick={handleLogout}
                type="button"
              >
                <LogOut size={17} />
                Đăng xuất
              </button>
            </div>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/95 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
            <div className="flex min-h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
              <button
                aria-label="Mở menu"
                className="flex size-10 items-center justify-center rounded-md border border-zinc-200 text-zinc-700 dark:border-zinc-800 dark:text-zinc-200 lg:hidden"
                type="button"
              >
                <Menu size={19} />
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
                  {subtitle || "Không gian làm việc"}
                </p>
                <h1 className="truncate text-xl font-semibold">{title}</h1>
              </div>
              <ThemeToggle />
              <button
                aria-label="Thông báo"
                className="flex size-10 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                type="button"
              >
                <Bell size={18} />
              </button>
              {action}
            </div>
          </header>

          <div className="px-4 py-5 sm:px-6 lg:px-8">{children}</div>
        </section>
      </div>
    </main>
  );
}
