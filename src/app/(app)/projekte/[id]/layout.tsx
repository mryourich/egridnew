"use client";

import { useParams } from "next/navigation";
import type { ReactNode } from "react";
import { SiteFrame } from "@/ui/sites";

export default function Layout({ children }: { children: ReactNode }) {
  const { id } = useParams<{ id: string }>();
  return <SiteFrame id={id}>{children}</SiteFrame>;
}
