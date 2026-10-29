import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AppShell } from "@/components/shell/shell";
import "@/design/tokens.css";
import "@/design/base.css";
import "@/design/components.css";
import "@/design/shell.css";
import "@/design/modules.css";

export const metadata: Metadata = { robots: { index: false } };

export default function AppLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
