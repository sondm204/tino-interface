"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";

export function ThemeToggle() {
  const [isMounted, setIsMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    window.requestAnimationFrame(() => {
      const storedTheme = window.localStorage.getItem("tino-theme");
      const nextIsDark = storedTheme
        ? storedTheme === "dark"
        : document.documentElement.classList.contains("dark");

      setIsDark(nextIsDark);
      setIsMounted(true);
    });
  }, []);

  useEffect(() => {
    if (!isMounted) {
      return;
    }

    document.documentElement.classList.toggle("dark", isDark);
    window.localStorage.setItem("tino-theme", isDark ? "dark" : "light");
  }, [isDark, isMounted]);

  return (
    <div className="flex h-10 items-center gap-2 rounded-md border border-border bg-background px-2 text-foreground">
      {isMounted && isDark ? <Moon size={14} /> : <Sun size={14} />}
      <Switch
        aria-label={isDark ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
        checked={isDark}
        onCheckedChange={setIsDark}
        size="sm"
      />
    </div>
  );
}
