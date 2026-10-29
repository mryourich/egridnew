import type { Metadata } from "next";
import { Suspense } from "react";
import { Service } from "@/modules/service/service";

export const metadata: Metadata = { title: "Service" };

export default function Page() {
  return (
    <Suspense>
      <Service />
    </Suspense>
  );
}
