"use client";

import Link from "next/link";
import { ArrowRight, Calculator, RotateCcw } from "lucide-react";
import { AppShell } from "@/src/components/layout/app-shell";
import { Card } from "@/src/components/ui/card";

const featureCards = [
  {
    description:
      "Tính chia đều và gợi ý chuyển tiền cho các cuộc chơi ngắn, không cần tạo ví.",
    href: "/features/quick-settle",
    icon: Calculator,
    title: "Chia chi tiêu nhanh",
  },
  {
    description:
      "Nhập các lựa chọn rồi quay vòng để chọn ngẫu nhiên một phương án.",
    href: "/features/wheel",
    icon: RotateCcw,
    title: "Vòng quay lựa chọn",
  },
];

export function FeaturesScreen() {
  return (
    <AppShell subtitle="Chức năng thêm" title="Chức năng">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {featureCards.map((feature) => {
          const Icon = feature.icon;

          return (
            <Link
              className="group rounded-xl text-left outline-none transition hover:-translate-y-0.5 focus-visible:ring-3 focus-visible:ring-ring/50"
              href={feature.href}
              key={feature.href}
            >
              <Card className="h-full cursor-pointer p-5 transition group-hover:ring-primary/40">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                    <Icon size={20} />
                  </div>
                  <ArrowRight
                    className="mt-1 shrink-0 text-zinc-400 transition group-hover:translate-x-1"
                    size={18}
                  />
                </div>
                <div className="mt-5 space-y-2">
                  <h2 className="text-base font-semibold">{feature.title}</h2>
                  <p className="text-sm leading-6 text-zinc-500 dark:text-zinc-400">
                    {feature.description}
                  </p>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </AppShell>
  );
}
