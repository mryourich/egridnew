import * as React from "react";
import { AlertTriangle, CheckCircle2, Clock3, Info, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type StatusTone = "blue" | "green" | "amber" | "red" | "neutral";

const toneIcons: Record<StatusTone, LucideIcon> = {
  amber: Clock3,
  blue: Info,
  green: CheckCircle2,
  neutral: Info,
  red: AlertTriangle
};

export type StatusBadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  icon?: LucideIcon;
  tone?: StatusTone;
};

export function StatusBadge({ children, className, icon, tone = "blue", ...props }: StatusBadgeProps) {
  const Icon = icon ?? toneIcons[tone];

  return (
    <span className={cn("ui-status-badge", `ui-status-badge-${tone}`, className)} {...props}>
      <Icon size={13} />
      {children}
    </span>
  );
}
