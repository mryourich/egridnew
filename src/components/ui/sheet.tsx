import * as React from "react";

import { cn } from "@/lib/utils";

type SheetSide = "left" | "right" | "top" | "bottom";

export function SheetOverlay({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("ui-sheet-overlay", className)} {...props} />;
}

export function SheetContent({ className, side = "right", ...props }: React.HTMLAttributes<HTMLElement> & { side?: SheetSide }) {
  return <section className={cn("ui-sheet-content", `ui-sheet-${side}`, className)} role="dialog" aria-modal="true" {...props} />;
}

export function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("ui-sheet-header", className)} {...props} />;
}

export function SheetFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("ui-sheet-footer", className)} {...props} />;
}

export function SheetTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={cn("ui-sheet-title", className)} {...props} />;
}

export function SheetDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("ui-sheet-description", className)} {...props} />;
}
