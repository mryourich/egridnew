import type { Metadata } from "next";
import { CompanySettings } from "@/core/company";

export const metadata: Metadata = { title: "Firma & Benutzer" };

export default function Page() {
  return <CompanySettings />;
}
