import type { Metadata } from "next";
import { Suspense } from "react";
import { Material } from "@/modules/material/material";

export const metadata: Metadata = { title: "Material" };

export default function Page() {
  return (
    <Suspense>
      <Material />
    </Suspense>
  );
}
