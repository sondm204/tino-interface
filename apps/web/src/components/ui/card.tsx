import type { ReactNode } from "react";
import {
  Card as ShadcnCard,
  CardContent,
  CardDescription,
  CardHeader as ShadcnCardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/src/lib/cn";

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <ShadcnCard className={className}>{children}</ShadcnCard>;
}

export function CardHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <ShadcnCardHeader className="border-b pb-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <CardTitle>{title}</CardTitle>
          {description ? (
            <CardDescription className="mt-1">{description}</CardDescription>
          ) : null}
        </div>
        {action}
      </div>
    </ShadcnCardHeader>
  );
}

export function CardBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <CardContent className={cn("pt-0", className)}>{children}</CardContent>;
}
