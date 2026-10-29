import type { Metadata } from "next";
import { Suspense } from "react";
import { Planner } from "@/modules/planner/planner";

export const metadata: Metadata = { title: "Planner" };

export default function Page() {
  return (
    <Suspense>
      <Planner />
    </Suspense>
  );
}
