"use client";

import { MyWork } from "@/components/my-work";
import { StartBoard } from "@/components/start-board";
import { currentUser, roleOf, useStore } from "@/lib/store";

/** Workers start with their day; everybody else with the project/team overview. */
export default function DashboardPage() {
  const { data } = useStore();
  return roleOf(currentUser(data)) === "monteur" ? <MyWork /> : <StartBoard />;
}
