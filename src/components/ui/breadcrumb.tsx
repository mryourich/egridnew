import * as React from "react";

import { cn } from "@/lib/utils";

export const Breadcrumb = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(({ className, ...props }, ref) => (
  <nav ref={ref} className={cn("ui-breadcrumb", className)} aria-label="Breadcrumb" {...props} />
));
Breadcrumb.displayName = "Breadcrumb";

export const BreadcrumbList = React.forwardRef<HTMLOListElement, React.OlHTMLAttributes<HTMLOListElement>>(({ className, ...props }, ref) => (
  <ol ref={ref} className={cn("ui-breadcrumb-list", className)} {...props} />
));
BreadcrumbList.displayName = "BreadcrumbList";

export const BreadcrumbItem = React.forwardRef<HTMLLIElement, React.LiHTMLAttributes<HTMLLIElement>>(({ className, ...props }, ref) => (
  <li ref={ref} className={cn("ui-breadcrumb-item", className)} {...props} />
));
BreadcrumbItem.displayName = "BreadcrumbItem";

export const BreadcrumbLink = React.forwardRef<HTMLAnchorElement, React.AnchorHTMLAttributes<HTMLAnchorElement>>(({ className, ...props }, ref) => (
  <a ref={ref} className={cn("ui-breadcrumb-link", className)} {...props} />
));
BreadcrumbLink.displayName = "BreadcrumbLink";

export function BreadcrumbPage({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("ui-breadcrumb-page", className)} aria-current="page" {...props} />;
}

export function BreadcrumbSeparator({ className, children = "/", ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={cn("ui-breadcrumb-separator", className)} aria-hidden="true" {...props}>
      {children}
    </span>
  );
}
