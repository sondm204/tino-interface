import { TextInput, type TextInputProps } from "react-native";
import { useColorScheme } from "nativewind";
import { cn } from "@/lib/utils";

export function Input({ className, placeholderTextColor, ...props }: TextInputProps) {
  const { colorScheme } = useColorScheme();

  return (
    <TextInput
      className={cn(
        "min-h-12 rounded-xl border border-slate-200 bg-white px-3 text-base text-slate-950 dark:border-slate-700 dark:bg-slate-900 dark:text-white",
        props.multiline && "min-h-24 py-3",
        className
      )}
      placeholderTextColor={
        placeholderTextColor ??
        (colorScheme === "dark" ? "#64748b" : "#94a3b8")
      }
      {...props}
    />
  );
}
