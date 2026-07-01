import { Children } from "react";
import { ActivityIndicator, Pressable, type PressableProps } from "react-native";
import { cva, type VariantProps } from "class-variance-authority";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "min-h-11 shrink-0 flex-row items-center justify-center gap-2 rounded-xl px-4 active:opacity-80",
  {
    variants: {
      variant: {
        default: "bg-blue-600",
        outline: "border border-slate-200 bg-white",
        ghost: "bg-transparent",
        destructive: "bg-red-600",
      },
      size: {
        default: "h-11",
        sm: "h-9 px-3",
        lg: "h-12 px-5",
      },
    },
    defaultVariants: {
      size: "default",
      variant: "default",
    },
  }
);

type ButtonProps = PressableProps &
  VariantProps<typeof buttonVariants> & {
    children: React.ReactNode;
    loading?: boolean;
  };

export function Button({
  children,
  className,
  disabled,
  loading,
  size,
  variant,
  ...props
}: ButtonProps) {
  const textTone =
    variant === "outline" || variant === "ghost" ? "text-slate-900" : "text-white";

  return (
    <Pressable
      className={cn(
        buttonVariants({ size, variant }),
        disabled && "opacity-50",
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <ActivityIndicator color={textTone === "text-white" ? "#fff" : "#0f172a"} /> : null}
      {Children.map(children, (child) =>
        typeof child === "string" || typeof child === "number" ? (
          <Text
            className={cn("shrink-0 font-semibold", textTone)}
            numberOfLines={1}
          >
            {child}
          </Text>
        ) : (
          child
        )
      )}
    </Pressable>
  );
}
