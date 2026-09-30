import * as React from "react";

import { cn } from "@/lib/utils";

export type SwitchProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">;

export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn("ui-switch", className)} role="switch" type="checkbox" {...props} />
));
Switch.displayName = "Switch";
