import * as React from "react";

import { cn } from "@/lib/utils";

type ButtonVariant = "default" | "secondary" | "outline" | "ghost" | "destructive";
type ButtonSize = "sm" | "default" | "lg" | "icon";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, className, leftIcon, rightIcon, variant = "default", size = "default", ...props }, ref) => (
    <button ref={ref} className={cn("ui-button", `ui-button-${variant}`, `ui-button-size-${size}`, className)} {...props}>
      {leftIcon ? <span className="ui-button-icon">{leftIcon}</span> : null}
      {children}
      {rightIcon ? <span className="ui-button-icon">{rightIcon}</span> : null}
    </button>
  )
);

Button.displayName = "Button";
