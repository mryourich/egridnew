import type { Metadata } from "next";
import { Dashboard } from "@/teamgrid/dashboard";

export const metadata: Metadata = { title: "Dashboard" };

export default function Page() {
  return <Dashboard />;
}
