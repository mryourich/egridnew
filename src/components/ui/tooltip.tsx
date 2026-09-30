import * as React from "react";

import { cn } from "@/lib/utils";

export type TooltipProps = React.HTMLAttributes<HTMLSpanElement> & {
  label: string;
};

export function Tooltip({ children, className, label, ...props }: TooltipProps) {
  return (
    <span className={cn("ui-tooltip", className)} data-tooltip={label} {...props}>
      {children}
    </span>
  );
}
