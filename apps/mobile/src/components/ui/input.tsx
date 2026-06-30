import { TextInput, type TextInputProps } from "react-native";
import { cn } from "@/lib/utils";

export function Input({ className, placeholderTextColor = "#94a3b8", ...props }: TextInputProps) {
  return (
    <TextInput
      className={cn(
        "min-h-12 rounded-xl border border-slate-200 bg-white px-3 text-base text-slate-950",
        props.multiline && "min-h-24 py-3",
        className
      )}
      placeholderTextColor={placeholderTextColor}
      {...props}
    />
  );
}
