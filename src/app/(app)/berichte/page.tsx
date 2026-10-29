import type { Metadata } from "next";
import { Suspense } from "react";
import { Reports } from "@/modules/berichte/reports";

export const metadata: Metadata = { title: "Berichte" };

export default function Page() {
  return (
    <Suspense>
      <Reports />
    </Suspense>
  );
}
