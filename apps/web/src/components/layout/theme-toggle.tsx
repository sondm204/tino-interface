"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

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
    <button
      aria-label={isDark ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối"}
      aria-pressed={isDark}
      className="flex h-10 items-center gap-2 rounded-md border border-zinc-200 bg-white px-2 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
      onClick={() => setIsDark((current) => !current)}
      type="button"
    >
      <span className="relative flex h-5 w-9 items-center rounded-full bg-zinc-200 p-0.5 transition-colors dark:bg-zinc-700">
        <span className="flex size-4 items-center justify-center rounded-full bg-white shadow-sm transition-transform dark:translate-x-4 dark:bg-zinc-950">
          {isMounted && isDark ? <Moon size={11} /> : <Sun size={11} />}
        </span>
      </span>
    </button>
  );
}
