import * as React from "react";

import { cn } from "@/lib/utils";

export const Pagination = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(({ className, ...props }, ref) => (
  <nav ref={ref} className={cn("ui-pagination", className)} aria-label="Pagination" {...props} />
));
Pagination.displayName = "Pagination";

export const PaginationContent = React.forwardRef<HTMLUListElement, React.HTMLAttributes<HTMLUListElement>>(({ className, ...props }, ref) => (
  <ul ref={ref} className={cn("ui-pagination-content", className)} {...props} />
));
PaginationContent.displayName = "PaginationContent";

export const PaginationItem = React.forwardRef<HTMLLIElement, React.LiHTMLAttributes<HTMLLIElement>>(({ className, ...props }, ref) => (
  <li ref={ref} className={cn("ui-pagination-item", className)} {...props} />
));
PaginationItem.displayName = "PaginationItem";

export const PaginationLink = React.forwardRef<HTMLAnchorElement, React.AnchorHTMLAttributes<HTMLAnchorElement> & { active?: boolean }>(
  ({ active, className, ...props }, ref) => <a ref={ref} className={cn("ui-pagination-link", active && "active", className)} {...props} />
);
PaginationLink.displayName = "PaginationLink";
