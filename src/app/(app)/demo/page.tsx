import type { Metadata } from "next";
import { Suspense } from "react";
import { DemoStart } from "@/modules/uebersicht/demo-start";

export const metadata: Metadata = { title: "Demo" };

export default function Page() {
  return (
    <Suspense>
      <DemoStart />
    </Suspense>
  );
}
