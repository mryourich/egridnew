import type { Metadata } from "next";
import { Planning } from "@/teamgrid/planning";

export const metadata: Metadata = { title: "Planung" };

export default function Page() {
  return <Planning />;
}
