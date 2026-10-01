"use client";

import { MyWork } from "@/components/my-work";
import { Dashboard } from "@/components/dashboard";
import { currentUser, roleOf, useStore } from "@/lib/store";

/** Workers start with their day; everybody else with the dashboard of all their projects. */
export default function DashboardPage() {
  const { data } = useStore();
  return roleOf(currentUser(data)) === "monteur" ? <MyWork /> : <Dashboard />;
}
