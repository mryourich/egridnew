import * as React from "react";

import { cn } from "@/lib/utils";

export const Accordion = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("ui-accordion", className)} {...props} />
));
Accordion.displayName = "Accordion";

export const AccordionItem = React.forwardRef<HTMLDetailsElement, React.DetailsHTMLAttributes<HTMLDetailsElement>>(({ className, ...props }, ref) => (
  <details ref={ref} className={cn("ui-accordion-item", className)} {...props} />
));
AccordionItem.displayName = "AccordionItem";

export const AccordionTrigger = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(({ className, ...props }, ref) => (
  <summary ref={ref} className={cn("ui-accordion-trigger", className)} {...props} />
));
AccordionTrigger.displayName = "AccordionTrigger";

export const AccordionContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("ui-accordion-content", className)} {...props} />
));
AccordionContent.displayName = "AccordionContent";
