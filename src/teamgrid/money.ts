import { addDays, diffDays, isWeekend, holidayName } from "@/core/date";
import { DEFAULT_BILLING } from "@/core/seed";
import type { BillingDoc, BillingKind, ClockDay, Data, TimeEntry } from "@/core/types";

export const billingOf = (data: Data) => ({ ...DEFAULT_BILLING, ...data.workspace.billing });

export const eur = (n: number) => `${n.toLocaleString("de-AT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
export const eur0 = (n: number) => `${n.toLocaleString("de-AT", { maximumFractionDigits: 0 })} €`;

export function totals(doc: Pick<BillingDoc, "lines" | "vat" | "fee" | "kind">) {
  const sign = doc.kind === "gutschrift" ? -1 : 1;
  const net = sign * (doc.lines.reduce((s, l) => s + l.qty * l.price, 0) + (doc.fee ?? 0));
  const tax = Math.round(net * doc.vat) / 100;
  return { net, tax, gross: net + tax };
}

export const KIND: Record<BillingKind, { label: string; prefix: string; plural: string }> = {
  angebot: { label: "Angebot", prefix: "AN", plural: "Angebote" },
  rechnung: { label: "Rechnung", prefix: "RE", plural: "Rechnungen" },
  gutschrift: { label: "Gutschrift", prefix: "GS", plural: "Gutschriften" },
  mahnung: { label: "Mahnung", prefix: "MA", plural: "Mahnungen" }
};

/** Next running number of the year: RE-2026-0033. */
export function nextNo(data: Data, kind: BillingKind, date: string) {
  const y = date.slice(0, 4);
  const pre = `${KIND[kind].prefix}-${y}-`;
  const max = Math.max(0, ...data.billing.filter((b) => b.no.startsWith(pre)).map((b) => Number(b.no.slice(pre.length)) || 0));
  return `${pre}${String(max + 1).padStart(4, "0")}`;
}

/** Overdue: sent invoice past its due date. */
export const overdue = (b: BillingDoc, today: string) => b.kind === "rechnung" && b.status === "versendet" && !!b.due && b.due < today;

/* ------------------------------------------------------------ time */

const min = (hm: string) => {
  const [h, m] = hm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};
/** Net minutes of a time entry. */
export const minutesOf = (t: Pick<TimeEntry, "start" | "end" | "pause">) => Math.max(0, min(t.end) - min(t.start) - (t.pause || 0));
export const hoursOf = (t: Pick<TimeEntry, "start" | "end" | "pause">) => minutesOf(t) / 60;
export const fmtH = (minutes: number) => `${minutes < 0 ? "−" : ""}${Math.floor(Math.abs(minutes) / 60)}:${String(Math.round(Math.abs(minutes) % 60)).padStart(2, "0")} h`;

/** Daily target in minutes (Mon–Fri, no public holiday). */
export function targetOn(data: Data, day: string) {
  if (isWeekend(day) || holidayName(day)) return 0;
  return Math.round((billingOf(data).weekHours / 5) * 60);
}

/** Minutes worked by the clock on one day: clocked in to out (or now), minus breaks. */
export function clockMinutes(c: ClockDay, now = new Date()) {
  const end = c.out ? new Date(c.out) : now;
  const gross = (end.getTime() - new Date(c.in).getTime()) / 60000;
  const pause = c.breaks.reduce((s, b) => s + ((b.end ? new Date(b.end) : now).getTime() - new Date(b.start).getTime()) / 60000, 0);
  return Math.max(0, gross - pause);
}

/** Worked minutes of a day: the clock if used, otherwise the booked times. */
export function workedOn(data: Data, id: string, day: string) {
  const c = data.clock.find((x) => x.employeeId === id && x.date === day);
  if (c) return clockMinutes(c);
  return data.times.filter((t) => t.employeeId === id && t.date === day).reduce((s, t) => s + minutesOf(t), 0);
}

/** Overtime balance over a period: worked minus target, absences count as target. */
export function balance(data: Data, id: string, from: string, to: string) {
  let sum = 0;
  for (let d = from; diffDays(d, to) >= 0; d = addDays(d, 1)) {
    const target = targetOn(data, d);
    const away = data.absences.some((a) => a.employeeId === id && a.start <= d && a.end >= d && a.type !== "za");
    sum += workedOn(data, id, d) - (away ? 0 : target);
  }
  return sum;
}
