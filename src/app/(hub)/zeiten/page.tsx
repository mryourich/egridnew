import type { Metadata } from "next";
import { MyTimes } from "@/teamgrid/time";

export const metadata: Metadata = { title: "Zeiterfassung" };

export default function Page() {
  return <MyTimes />;
}
