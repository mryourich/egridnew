import type { Metadata } from "next";
import { Suspense } from "react";
import { OpenPoints } from "@/modules/openpoints/open-points";

export const metadata: Metadata = { title: "OpenPoints" };

export default function Page() {
  return (
    <Suspense>
      <OpenPoints />
    </Suspense>
  );
}
