import type { Metadata } from "next";
import { Suspense } from "react";
import { CalendarPage } from "@/modules/kalender/calendar";

export const metadata: Metadata = { title: "Kalender" };

export default function Page() {
  return (
    <Suspense>
      <CalendarPage />
    </Suspense>
  );
}
