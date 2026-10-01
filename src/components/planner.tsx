"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState, type ReactNode } from "react";
import { addDays, fmt, holidayName, isoWeek, isWeekend, monthLabel, startOfWeek, today, weekday, weekdayShort } from "@/lib/date";
import type { ISODate } from "@/lib/types";

/** Shared time axis for the site plan: zoom levels, header rows and the day grid. */

const ZOOMS = {
  tag: { label: "Tag", dw: 56, days: 28, step: 7 },
  woche: { label: "Woche", dw: 30, days: 56, step: 14 },
  monat: { label: "Monat", dw: 15, days: 112, step: 28 },
  quartal: { label: "Quartal", dw: 7, days: 196, step: 56 }
} as const;
type Zoom = keyof typeof ZOOMS;

/** Date range, zoom and the matching toolbar controls shared by all planner views. */
export function usePlannerRange(initialZoom: Zoom = "woche") {
  const [zoom, setZoom] = useState<Zoom>(initialZoom);
  const [from, setFrom] = useState(() => addDays(startOfWeek(today()), -14));
  const z = ZOOMS[zoom];

  const controls: ReactNode = (
    <>
      <div className="btn-group">
        <button className="btn btn-icon" type="button" onClick={() => setFrom(addDays(from, -z.step))} aria-label="Zurück">
          <ChevronLeft size={16} />
        </button>
        <button className="btn" type="button" onClick={() => setFrom(addDays(startOfWeek(today()), -14))}>
          Heute
        </button>
        <button className="btn btn-icon" type="button" onClick={() => setFrom(addDays(from, z.step))} aria-label="Weiter">
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="segmented">
        {(Object.keys(ZOOMS) as Zoom[]).map((k) => (
          <button key={k} type="button" className={zoom === k ? "active" : ""} onClick={() => setZoom(k)}>
            {ZOOMS[k].label}
          </button>
        ))}
      </div>
    </>
  );

  return { from, days: z.days, dayWidth: z.dw, zoom, controls };
}

/** Month / calendar week / day / weekday header rows. */
export function PlannerHeadTime({ dayList, dw }: { dayList: ISODate[]; dw: number }) {
  const t = today();
  const months: { label: string; span: number }[] = [];
  const weeks: { label: string; span: number }[] = [];
  for (const d of dayList) {
    const m = monthLabel(d, true);
    if (months.at(-1)?.label === m) months.at(-1)!.span++;
    else months.push({ label: m, span: 1 });
    const w = String(isoWeek(d));
    if (weeks.at(-1)?.label === w && weekday(d) !== 1) weeks.at(-1)!.span++;
    else weeks.push({ label: w, span: 1 });
  }
  const cls = (d: ISODate) => `${isWeekend(d) ? "we" : ""} ${holidayName(d) ? "hol" : ""} ${d === t ? "today" : ""}`;
  return (
    <div className="pl-head-time" style={{ width: dayList.length * dw }}>
      <div className="pl-hrow pl-months">
        {months.map((m, i) => (
          <span key={i} style={{ width: m.span * dw }}>
            {m.span * dw > 60 ? m.label : ""}
          </span>
        ))}
      </div>
      <div className="pl-hrow pl-weeks">
        {weeks.map((w, i) => (
          <span key={i} style={{ width: w.span * dw }} title={`Kalenderwoche ${w.label}`}>
            {w.span * dw >= 22 ? `KW ${w.label}` : ""}
          </span>
        ))}
      </div>
      <div className="pl-hrow pl-days">
        {dayList.map((d) => (
          <span key={d} className={cls(d)} title={`${weekdayShort(d)} ${fmt(d)}${holidayName(d) ? ` · ${holidayName(d)}` : ""}`}>
            {dw >= 15 ? d.slice(8) : ""}
          </span>
        ))}
      </div>
      <div className="pl-hrow pl-wd">
        {dayList.map((d) => (
          <span key={d} className={cls(d)}>
            {dw >= 15 ? weekdayShort(d) : dw >= 10 ? weekdayShort(d)[0] : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Full-height weekend, holiday and today columns behind the rows. */
export function PlannerCols({ dayList, dw, left }: { dayList: ISODate[]; dw: number; left: number }) {
  const t = today();
  return (
    <div className="pl-cols" style={{ left, width: dayList.length * dw }}>
      {dayList.map((d, i) => {
        const hol = holidayName(d);
        if (!hol && !isWeekend(d) && d !== t) return null;
        return <span key={d} className={hol ? "hol" : d === t ? "today" : "we"} style={{ left: i * dw, width: dw }} title={hol} />;
      })}
    </div>
  );
}
