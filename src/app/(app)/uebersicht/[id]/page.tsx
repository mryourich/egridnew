import type { Metadata } from "next";
import { OpenSite } from "@/modules/uebersicht/open-site";

export const metadata: Metadata = { title: "Baustelle" };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OpenSite id={id} />;
}
