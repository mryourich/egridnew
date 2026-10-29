import type { Metadata } from "next";
import { Suspense } from "react";
import { People } from "@/modules/stammdaten/people";

export const metadata: Metadata = { title: "Stammdaten" };

export default function Page() {
  return (
    <Suspense>
      <People />
    </Suspense>
  );
}
