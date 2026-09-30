import * as React from "react";

import { cn } from "@/lib/utils";

type IconButtonVariant = "default" | "subtle" | "ghost" | "danger";
type IconButtonSize = "sm" | "default" | "lg";

export type IconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  size?: IconButtonSize;
  variant?: IconButtonVariant;
};

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ children, className, label, size = "default", type = "button", variant = "default", ...props }, ref) => (
    <button
      ref={ref}
      aria-label={label}
      className={cn("ui-icon-button", `ui-icon-button-${variant}`, `ui-icon-button-size-${size}`, className)}
      data-tooltip={label}
      type={type}
      {...props}
    >
      {children}
    </button>
  )
);

IconButton.displayName = "IconButton";
