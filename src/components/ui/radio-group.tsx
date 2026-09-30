import * as React from "react";

import { cn } from "@/lib/utils";

export const RadioGroup = React.forwardRef<HTMLFieldSetElement, React.FieldsetHTMLAttributes<HTMLFieldSetElement>>(({ className, ...props }, ref) => (
  <fieldset ref={ref} className={cn("ui-radio-group", className)} {...props} />
));
RadioGroup.displayName = "RadioGroup";

export type RadioGroupItemProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">;

export const RadioGroupItem = React.forwardRef<HTMLInputElement, RadioGroupItemProps>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn("ui-radio-item", className)} type="radio" {...props} />
));
RadioGroupItem.displayName = "RadioGroupItem";
