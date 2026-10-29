"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type TabsContextValue = {
  value: string;
  setValue: (value: string) => void;
};

const TabsContext = React.createContext<TabsContextValue | null>(null);

export type TabsProps = React.HTMLAttributes<HTMLDivElement> & {
  defaultValue: string;
  value?: string;
  onValueChange?: (value: string) => void;
};

export function Tabs({ className, defaultValue, onValueChange, value, ...props }: TabsProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const currentValue = value ?? internalValue;

  function setValue(nextValue: string) {
    setInternalValue(nextValue);
    onValueChange?.(nextValue);
  }

  return (
    <TabsContext.Provider value={{ value: currentValue, setValue }}>
      <div className={cn("ui-tabs", className)} {...props} />
    </TabsContext.Provider>
  );
}

export const TabsList = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("ui-tabs-list", className)} role="tablist" {...props} />
));
TabsList.displayName = "TabsList";

export function TabsTrigger({ className, value, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }) {
  const context = React.useContext(TabsContext);
  const active = context?.value === value;

  return (
    <button
      className={cn("ui-tabs-trigger", active && "active", className)}
      role="tab"
      type="button"
      aria-selected={active}
      onClick={() => context?.setValue(value)}
      {...props}
    />
  );
}

export function TabsContent({ className, value, ...props }: React.HTMLAttributes<HTMLDivElement> & { value: string }) {
  const context = React.useContext(TabsContext);
  const active = context?.value === value;

  if (!active) {
    return null;
  }

  return <div className={cn("ui-tabs-content", className)} role="tabpanel" {...props} />;
}
