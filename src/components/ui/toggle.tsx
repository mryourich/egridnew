import * as React from "react";

import { cn } from "@/lib/utils";

type ToggleVariant = "default" | "outline" | "subtle";

export type ToggleProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  pressed?: boolean;
  variant?: ToggleVariant;
};

export const Toggle = React.forwardRef<HTMLButtonElement, ToggleProps>(({ className, pressed, type = "button", variant = "default", ...props }, ref) => (
  <button ref={ref} aria-pressed={pressed} className={cn("ui-toggle", `ui-toggle-${variant}`, pressed && "active", className)} type={type} {...props} />
));
Toggle.displayName = "Toggle";
