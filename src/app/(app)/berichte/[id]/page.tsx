import type { Metadata } from "next";
import { ReportPage } from "@/modules/berichte/report-page";

export const metadata: Metadata = { title: "Bericht" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ReportPage id={id} />;
}
