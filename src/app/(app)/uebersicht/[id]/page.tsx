import type { Metadata } from "next";
import { SiteDetail } from "@/modules/uebersicht/site-detail";

export const metadata: Metadata = { title: "Baustelle" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SiteDetail id={id} />;
}
