import * as React from "react";

import { cn } from "@/lib/utils";

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({ className, ...props }, ref) => (
  <select ref={ref} className={cn("ui-select", className)} {...props} />
));
Select.displayName = "Select";

export const SelectOption = React.forwardRef<HTMLOptionElement, React.OptionHTMLAttributes<HTMLOptionElement>>(({ className, ...props }, ref) => (
  <option ref={ref} className={cn("ui-select-option", className)} {...props} />
));
SelectOption.displayName = "SelectOption";
