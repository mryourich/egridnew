import type { Metadata } from "next";
import { BillingOverview } from "@/teamgrid/billing";

export const metadata: Metadata = { title: "Abrechnung" };

export default function Page() {
  return <BillingOverview />;
}
