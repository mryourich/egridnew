import * as React from "react";

import { cn } from "@/lib/utils";

export const Popover = React.forwardRef<HTMLDetailsElement, React.DetailsHTMLAttributes<HTMLDetailsElement>>(({ className, ...props }, ref) => (
  <details ref={ref} className={cn("ui-popover", className)} {...props} />
));
Popover.displayName = "Popover";

export const PopoverTrigger = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(({ className, ...props }, ref) => (
  <summary ref={ref} className={cn("ui-popover-trigger", className)} {...props} />
));
PopoverTrigger.displayName = "PopoverTrigger";

export const PopoverContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("ui-popover-content", className)} {...props} />
));
PopoverContent.displayName = "PopoverContent";
