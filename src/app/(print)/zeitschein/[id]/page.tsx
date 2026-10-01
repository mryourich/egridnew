"use client";

import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { DocScreen } from "@/components/doc";
import { AgencySummary, DesignedSheet, ExcelSheet } from "@/components/timesheet-doc";
import { today } from "@/lib/date";
import { sheetData, timesheetSettings } from "@/lib/timesheet";
import type { SheetView } from "@/lib/timesheet-excel";
import { useStore } from "@/lib/store";

/** Time sheets of one project: one page per person – in the own design or as the filled Excel form. */
function TimesheetDoc() {
  const { id } = useParams<{ id: string }>();
  const q = useSearchParams();
  const { data } = useStore();
  const project = data.projects.find((p) => p.id === id);
  const s = timesheetSettings(data);
  const period = { from: q.get("von") ?? today(), to: q.get("bis") ?? today() };
  const people = (q.get("ma") ?? "").split(",").filter(Boolean);
  const sheets = project ? people.map((emp) => sheetData(data, project, emp, period)).filter((sd) => sd.employee) : [];
  const useExcel = s.pdfSource === "excel" && !!s.template?.mapping;
  const [views, setViews] = useState<SheetView[] | null>(null);
  const key = `${id}|${period.from}|${period.to}|${people.join()}|${useExcel}`;

  useEffect(() => {
    if (!useExcel || !s.template?.mapping) return;
    let alive = true;
    (async () => {
      const { filledSheetView } = await import("@/lib/timesheet-excel");
      const out: SheetView[] = [];
      for (const sd of sheets) out.push(await filledSheetView(s.template!.dataUrl, s.template!.mapping!, sd));
      if (alive) setViews(out);
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!project) return <p style={{ padding: 40 }}>Projekt nicht gefunden.</p>;
  const agencies = [...new Set(sheets.filter((sd) => sd.leasing).map((sd) => sd.verleiher || "Leasing"))];

  return (
    <DocScreen>
      <style>{`@page { size: A4 ${s.orientation === "quer" ? "landscape" : "portrait"}; }`}</style>
      {sheets.length === 0 && <p style={{ padding: 40 }}>Keine Personen gewählt.</p>}
      {useExcel ? (
        views ? (
          views.map((v, i) => <ExcelSheet key={i} view={v} landscape={s.orientation === "quer"} />)
        ) : (
          <p style={{ padding: 40 }}>Formular wird ausgefüllt …</p>
        )
      ) : (
        <>
          {sheets.length > 1 &&
            agencies.map((a) => {
              const list = sheets.filter((sd) => sd.leasing && (sd.verleiher || "Leasing") === a);
              return list.length > 1 ? <AgencySummary key={a} sheets={list} s={s} agency={a} /> : null;
            })}
          {sheets.map((sd) => (
            <DesignedSheet key={sd.employee!.id} sd={sd} s={s} />
          ))}
        </>
      )}
    </DocScreen>
  );
}

export default function Page() {
  return (
    <Suspense>
      <TimesheetDoc />
    </Suspense>
  );
}
