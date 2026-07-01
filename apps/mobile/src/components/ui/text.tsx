import { Text as RNText, type TextProps as RNTextProps } from "react-native";
import { cn } from "@/lib/utils";

type TextProps = RNTextProps & {
  variant?: "body" | "muted" | "title" | "headline" | "label" | "small";
};

const variants = {
  body: "text-base text-slate-900 dark:text-slate-100",
  muted: "text-sm text-slate-500 dark:text-slate-400",
  title: "text-lg font-semibold text-slate-950 dark:text-white",
  headline: "text-2xl font-bold text-slate-950 dark:text-white",
  label: "text-sm font-medium text-slate-700 dark:text-slate-300",
  small: "text-xs text-slate-500 dark:text-slate-400",
};

export function Text({ className, variant = "body", ...props }: TextProps) {
  return <RNText className={cn(variants[variant], className)} {...props} />;
}
