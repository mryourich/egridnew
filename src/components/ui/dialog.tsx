import * as React from "react";

import { cn } from "@/lib/utils";

export function DialogOverlay({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("ui-dialog-overlay", className)} {...props} />;
}

export function DialogContent({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return <section className={cn("ui-dialog-content", className)} role="dialog" aria-modal="true" {...props} />;
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("ui-dialog-header", className)} {...props} />;
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("ui-dialog-footer", className)} {...props} />;
}

export function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("ui-dialog-title", className)} {...props} />;
}

export function DialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("ui-dialog-description", className)} {...props} />;
}
