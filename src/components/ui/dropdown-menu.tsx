import * as React from "react";

import { cn } from "@/lib/utils";

export const DropdownMenu = React.forwardRef<HTMLDetailsElement, React.DetailsHTMLAttributes<HTMLDetailsElement>>(({ className, ...props }, ref) => (
  <details ref={ref} className={cn("ui-dropdown", className)} {...props} />
));
DropdownMenu.displayName = "DropdownMenu";

export const DropdownMenuTrigger = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(({ className, ...props }, ref) => (
  <summary ref={ref} className={cn("ui-dropdown-trigger", className)} {...props} />
));
DropdownMenuTrigger.displayName = "DropdownMenuTrigger";

export const DropdownMenuContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("ui-dropdown-content", className)} {...props} />
));
DropdownMenuContent.displayName = "DropdownMenuContent";

export const DropdownMenuLabel = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("ui-dropdown-label", className)} {...props} />
));
DropdownMenuLabel.displayName = "DropdownMenuLabel";

export const DropdownMenuItem = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(({ className, type = "button", ...props }, ref) => (
  <button ref={ref} className={cn("ui-dropdown-item", className)} type={type} {...props} />
));
DropdownMenuItem.displayName = "DropdownMenuItem";

export const DropdownMenuSeparator = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("ui-dropdown-separator", className)} role="separator" {...props} />
));
DropdownMenuSeparator.displayName = "DropdownMenuSeparator";
