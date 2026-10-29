import type { Metadata } from "next";
import { Suspense } from "react";
import { Tasks } from "@/modules/aufgaben/tasks";

export const metadata: Metadata = { title: "Meine Aufgaben" };

export default function Page() {
  return (
    <Suspense>
      <Tasks />
    </Suspense>
  );
}
