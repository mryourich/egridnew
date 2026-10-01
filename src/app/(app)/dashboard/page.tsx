"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { MyWork } from "@/components/my-work";
import { SitesOverview } from "@/components/sites-overview";
import { currentUser, roleOf, useStore } from "@/lib/store";

/** Workers start with "today"; site management starts with its sites. */
export default function DashboardPage() {
  const { data } = useStore();
  const router = useRouter();
  const role = roleOf(currentUser(data));
  useEffect(() => {
    if (role !== "monteur") router.replace("/baustellen");
  }, [role, router]);
  return role === "monteur" ? <MyWork /> : <SitesOverview />;
}
