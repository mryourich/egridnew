import type { Metadata } from "next";
import { Suspense } from "react";
import { MyDay } from "@/modules/meintag/my-day";

export const metadata: Metadata = { title: "Mein Tag" };

export default function Page() {
  return (
    <Suspense>
      <MyDay />
    </Suspense>
  );
}
