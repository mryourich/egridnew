import * as React from "react";

import { cn } from "@/lib/utils";

export const Avatar = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("ui-avatar", className)} {...props} />
));
Avatar.displayName = "Avatar";

export const AvatarFallback = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(({ className, ...props }, ref) => (
  <span ref={ref} className={cn("ui-avatar-fallback", className)} {...props} />
));
AvatarFallback.displayName = "AvatarFallback";

export const AvatarImage = React.forwardRef<HTMLImageElement, React.ImgHTMLAttributes<HTMLImageElement>>(({ className, alt = "", ...props }, ref) => (
  <img ref={ref} className={cn("ui-avatar-image", className)} alt={alt} {...props} />
));
AvatarImage.displayName = "AvatarImage";
