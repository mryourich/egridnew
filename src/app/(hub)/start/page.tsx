import type { Metadata } from "next";
import { Launcher } from "@/teamgrid/launcher";

export const metadata: Metadata = { title: "Start" };

export default function Page() {
  return <Launcher />;
}
