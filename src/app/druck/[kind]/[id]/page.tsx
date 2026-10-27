"use client";

import { useParams } from "next/navigation";
import { PrintPage } from "@/teamgrid/print";

export default function Page() {
  const { kind, id } = useParams<{ kind: string; id: string }>();
  return <PrintPage kind={kind} id={id} />;
}
