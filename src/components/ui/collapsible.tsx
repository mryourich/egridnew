import * as React from "react";

import { cn } from "@/lib/utils";

export const Collapsible = React.forwardRef<HTMLDetailsElement, React.DetailsHTMLAttributes<HTMLDetailsElement>>(({ className, ...props }, ref) => (
  <details ref={ref} className={cn("ui-collapsible", className)} {...props} />
));
Collapsible.displayName = "Collapsible";

export const CollapsibleTrigger = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(({ className, ...props }, ref) => (
  <summary ref={ref} className={cn("ui-collapsible-trigger", className)} {...props} />
));
CollapsibleTrigger.displayName = "CollapsibleTrigger";

export const CollapsibleContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("ui-collapsible-content", className)} {...props} />
));
CollapsibleContent.displayName = "CollapsibleContent";
