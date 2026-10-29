import * as React from "react";

import { cn } from "@/lib/utils";

export type SliderProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">;

export const Slider = React.forwardRef<HTMLInputElement, SliderProps>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn("ui-slider", className)} type="range" {...props} />
));
Slider.displayName = "Slider";
