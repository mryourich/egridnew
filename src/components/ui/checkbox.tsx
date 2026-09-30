import * as React from "react";

import { cn } from "@/lib/utils";

export type CheckboxProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">;

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn("ui-checkbox", className)} type="checkbox" {...props} />
));
Checkbox.displayName = "Checkbox";
