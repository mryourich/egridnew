import { addDays, fmt, holidayName, inRange, isoWeek, isWeekend, monthLabel, startOfWeek, weekdayShort } from "./date";
import type { Data, DesignItem, Employee, ISODate, Project, TemplateColumnField, TimeEntry, TimesheetFact, TimesheetSettings } from "./types";

export const DEFAULT_TIMESHEET: TimesheetSettings = {
  dayStart: "07:00",
  dayEnd: "16:00",
  pause: 30,
  title: "Zeitschein",
  showPause: true,
  showActivity: true,
  signatures: ["Mitarbeiter", "Bauleitung", "Auftraggeber"],
  note: ""
};

export const DEFAULT_FACTS: DesignItem<TimesheetFact>[] = [
  { key: "mitarbeiter", label: "Mitarbeiter", on: true },
  { key: "personalnummer", label: "Pers.-Nr.", on: true },
  { key: "firma", label: "Firma / Verleiher", on: true },
  { key: "projekt", label: "Projekt", on: true },
  { key: "kunde", label: "Kunde", on: true },
  { key: "ort", label: "Ort", on: false },
  { key: "bauleitung", label: "Bauleitung", on: false },
  { key: "zeitraum", label: "Zeitraum", on: false }
];

export const DEFAULT_COLUMNS: DesignItem<TemplateColumnField>[] = [
  { key: "wochentag", label: "Tag", on: true },
  { key: "datum", label: "Datum", on: true },
  { key: "beginn", label: "Beginn", on: true },
  { key: "ende", label: "Ende", on: true },
  { key: "pause", label: "Pause", on: true },
  { key: "stunden", label: "Stunden", on: true },
  { key: "taetigkeit", label: "Tätigkeit", on: true }
];

/** Merges saved items with the defaults, so new fields show up and old saves keep working. */
function withDefaults<K extends string>(saved: DesignItem<K>[] | undefined, defaults: DesignItem<K>[]) {
  if (!saved?.length) return defaults;
  return [...saved.filter((x) => defaults.some((d) => d.key === x.key)), ...defaults.filter((d) => !saved.some((x) => x.key === d.key)).map((d) => ({ ...d, on: false }))];
}

export function timesheetSettings(data: Data): TimesheetSettings & Required<Pick<TimesheetSettings, "accent" | "headStyle" | "fontSize" | "orientation" | "facts" | "columns" | "pdfSource" | "showSummary">> {
  const s = { ...DEFAULT_TIMESHEET, ...(data.company.timesheet ?? {}) };
  // old switches for the pause / activity column still apply when nothing was designed yet
  const cols = withDefaults(s.columns, DEFAULT_COLUMNS).map((c) => (!s.columns && ((c.key === "pause" && !s.showPause) || (c.key === "taetigkeit" && !s.showActivity)) ? { ...c, on: false } : c));
  return {
    ...s,
    accent: s.accent ?? "#1b57b8",
    headStyle: s.headStyle ?? "balken",
    fontSize: s.fontSize ?? "normal",
    orientation: s.orientation ?? "hoch",
    facts: withDefaults(s.facts, DEFAULT_FACTS),
    columns: cols,
    pdfSource: s.pdfSource === "excel" && s.template?.mapping ? "excel" : "design",
    showSummary: s.showSummary ?? true
  };
}

function minutes(hm: string) {
  const [h, m] = hm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** Worked hours of an entry (end before start = over midnight). */
export function entryHours(e: Pick<TimeEntry, "start" | "end" | "pause">) {
  if (!e.start || !e.end) return 0;
  let span = minutes(e.end) - minutes(e.start);
  if (span < 0) span += 24 * 60;
  return Math.max(0, Math.round(((span - (e.pause || 0)) / 60) * 100) / 100);
}

/** "8,5" */
export function fmtHours(h: number) {
  return h.toLocaleString("de-AT", { maximumFractionDigits: 2 });
}

export type Period = { kind: "woche" | "monat"; from: ISODate; to: ISODate; label: string };

export function weekPeriod(date: ISODate): Period {
  const from = startOfWeek(date);
  return { kind: "woche", from, to: addDays(from, 6), label: `KW ${isoWeek(from)} · ${fmt(from)} – ${fmt(addDays(from, 6))}` };
}

export function monthPeriod(date: ISODate): Period {
  const from = `${date.slice(0, 7)}-01`;
  const next = new Date(`${from}T12:00:00Z`);
  next.setUTCMonth(next.getUTCMonth() + 1);
  const to = addDays(next.toISOString().slice(0, 10), -1);
  return { kind: "monat", from, to, label: monthLabel(from, true) };
}

export function daysOf(p: Period) {
  const out: ISODate[] = [];
  for (let d = p.from; d <= p.to; d = addDays(d, 1)) out.push(d);
  return out;
}

export function isLeasing(e: Employee | undefined) {
  return e?.employment === "leasing";
}

/** Entries of one person on one project in a period, by date. */
export function entriesOf(data: Data, projectId: string, employeeId: string, p: Pick<Period, "from" | "to">) {
  return data.times
    .filter((t) => t.projectId === projectId && t.employeeId === employeeId && inRange(t.date, p.from, p.to))
    .sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
}

/**
 * Proposes entries from the plan: every working day a person has a bar on the project
 * gets the default day, the activity is the bar title. Existing entries are kept.
 */
export function proposeFromPlan(data: Data, project: Project, period: Pick<Period, "from" | "to">, people: string[], make: (e: Omit<TimeEntry, "id">) => TimeEntry) {
  const s = timesheetSettings(data);
  const out: TimeEntry[] = [];
  for (let d = period.from; d <= period.to; d = addDays(d, 1)) {
    if (isWeekend(d) || holidayName(d)) continue;
    for (const id of people) {
      if (data.times.some((t) => t.projectId === project.id && t.employeeId === id && t.date === d)) continue;
      if (data.absences.some((a) => a.employeeId === id && inRange(d, a.start, a.end))) continue;
      const jobs = data.jobs.filter((j) => j.projectId === project.id && j.employeeId === id && !j.symbol && inRange(d, j.start, j.end));
      if (!jobs.length) continue;
      const half = jobs.every((j) => (j.start === d && j.startPm) || (j.end === d && j.endAm));
      out.push(
        make({
          projectId: project.id,
          employeeId: id,
          date: d,
          start: s.dayStart,
          end: half ? addHours(s.dayStart, 4) : s.dayEnd,
          pause: half ? 0 : s.pause,
          activity: [...new Set(jobs.map((j) => j.title).filter(Boolean))].join(", ")
        })
      );
    }
  }
  return out;
}

function addHours(hm: string, h: number) {
  const m = minutes(hm) + h * 60;
  return `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** Everything a time sheet needs – used by the PDF and the Excel export. */
export function sheetData(data: Data, project: Project, employeeId: string, period: Pick<Period, "from" | "to">) {
  const e = data.employees.find((x) => x.id === employeeId);
  const rows = entriesOf(data, project.id, employeeId, period).map((t) => ({ ...t, hours: entryHours(t), weekday: weekdayShort(t.date) }));
  const total = rows.reduce((s, r) => s + r.hours, 0);
  const bl = data.employees.find((x) => x.id === project.siteManagerId);
  return {
    employee: e,
    leasing: isLeasing(e),
    firma: data.company.name,
    verleiher: isLeasing(e) ? e?.leasingCompany ?? "" : "",
    project,
    rows,
    total,
    kw: isoWeek(period.from) === isoWeek(period.to) ? `KW ${isoWeek(period.from)}` : `KW ${isoWeek(period.from)}–${isoWeek(period.to)}`,
    from: period.from,
    to: period.to,
    bauleitung: bl?.name ?? ""
  };
}

export type SheetData = ReturnType<typeof sheetData>;
