import type { Metadata } from "next";
import { Suspense } from "react";
import { Documents } from "@/modules/dokumente/docs";

export const metadata: Metadata = { title: "Dokumente" };

export default function Page() {
  return (
    <Suspense>
      <Documents />
    </Suspense>
  );
}
