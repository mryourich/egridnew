import type { Metadata } from "next";
import { Suspense } from "react";
import { Notes } from "@/modules/notizen/notes";

export const metadata: Metadata = { title: "Notizen" };

export default function Page() {
  return (
    <Suspense>
      <Notes />
    </Suspense>
  );
}
