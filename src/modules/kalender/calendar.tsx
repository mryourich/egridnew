"use client";

import { PageHead } from "@/components/app/kit";
import { siteName, useStore } from "@/lib/store/store";
import { Gantt } from "./gantt";

/** Calendar: the VYSNER planning board – company-wide or for the site chosen in the top bar. */
export function CalendarPage() {
  const { data, siteId } = useStore();
  return (
    <div className="page full">
      <PageHead title="Kalender" sub={siteId ? `Bauzeitplan ${siteName(data, siteId)}` : "Alle Baustellen – für den Bauzeitplan einer Baustelle oben die Baustelle wählen"} />
      <Gantt />
    </div>
  );
}
