import * as React from "react";

import { cn } from "@/lib/utils";

export type ProgressProps = React.HTMLAttributes<HTMLDivElement> & {
  value?: number;
};

export const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(({ className, value = 0, ...props }, ref) => {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div ref={ref} className={cn("ui-progress", className)} role="progressbar" aria-valuemax={100} aria-valuemin={0} aria-valuenow={clamped} {...props}>
      <span style={{ width: `${clamped}%` }} />
    </div>
  );
});
Progress.displayName = "Progress";
