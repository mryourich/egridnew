import * as React from "react";

import { cn } from "@/lib/utils";

export const Command = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("ui-command", className)} {...props} />
));
Command.displayName = "Command";

export const CommandInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn("ui-command-input", className)} {...props} />
));
CommandInput.displayName = "CommandInput";

export const CommandList = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("ui-command-list", className)} role="listbox" {...props} />
));
CommandList.displayName = "CommandList";

export const CommandGroup = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("ui-command-group", className)} {...props} />
));
CommandGroup.displayName = "CommandGroup";

export const CommandItem = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(({ className, type = "button", ...props }, ref) => (
  <button ref={ref} className={cn("ui-command-item", className)} role="option" type={type} {...props} />
));
CommandItem.displayName = "CommandItem";

export function CommandEmpty({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("ui-command-empty", className)} {...props} />;
}
