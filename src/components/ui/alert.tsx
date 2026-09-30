import * as React from "react";

import { cn } from "@/lib/utils";

type AlertVariant = "default" | "info" | "success" | "warning" | "destructive";

export type AlertProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: AlertVariant;
};

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(({ className, variant = "default", ...props }, ref) => (
  <div ref={ref} className={cn("ui-alert", `ui-alert-${variant}`, className)} role="status" {...props} />
));
Alert.displayName = "Alert";

export const AlertTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(({ className, ...props }, ref) => (
  <h3 ref={ref} className={cn("ui-alert-title", className)} {...props} />
));
AlertTitle.displayName = "AlertTitle";

export const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("ui-alert-description", className)} {...props} />
));
AlertDescription.displayName = "AlertDescription";
