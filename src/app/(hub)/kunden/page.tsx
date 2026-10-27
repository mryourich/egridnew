import type { Metadata } from "next";
import { Contacts } from "@/teamgrid/crm";

export const metadata: Metadata = { title: "Kunden" };

export default function Page() {
  return <Contacts />;
}
