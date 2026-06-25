import { Badge as ShadcnBadge } from "@/components/ui/badge";

export function Badge({
  children,
  tone = "zinc",
}: {
  children: string;
  tone?: "zinc" | "green" | "amber" | "rose" | "blue";
}) {
  const variant =
    tone === "rose" ? "destructive" : tone === "zinc" ? "secondary" : "outline";

  return <ShadcnBadge variant={variant}>{children}</ShadcnBadge>;
}
