import type { Metadata } from "next";
import { Suspense } from "react";
import { Overview } from "@/modules/uebersicht/overview";

export const metadata: Metadata = { title: "Übersicht" };

export default function Page() {
  return (
    <Suspense>
      <Overview />
    </Suspense>
  );
}
