import { cn } from "@/src/lib/cn";

export function Badge({
  children,
  tone = "zinc",
}: {
  children: string;
  tone?: "zinc" | "green" | "amber" | "rose" | "blue";
}) {
  const tones = {
    zinc: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
    green:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
    amber:
      "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
    rose: "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300",
    blue: "bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300",
  };

  return (
    <span className={cn("rounded-md px-2 py-1 text-xs font-semibold", tones[tone])}>
      {children}
    </span>
  );
}
