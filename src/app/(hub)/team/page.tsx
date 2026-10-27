import type { Metadata } from "next";
import { Team } from "@/teamgrid/team";

export const metadata: Metadata = { title: "Team" };

export default function Page() {
  return <Team />;
}
