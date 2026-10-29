import { diffDays, fmt, today, type ISODate } from "./date";

/* Austrian German formats: dates TT.MM.JJJJ, amounts in €. */

export const fmtDate = fmt;

const DT = new Intl.DateTimeFormat("de-AT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
export function fmtDateTime(iso: string | undefined) {
  if (!iso) return "–";
  return DT.format(new Date(iso)).replace(",", "");
}

const EUR = new Intl.NumberFormat("de-AT", { style: "currency", currency: "EUR" });
export const fmtEuro = (n: number) => EUR.format(n);

const NUM = new Intl.NumberFormat("de-AT", { maximumFractionDigits: 2 });
export const fmtNum = (n: number) => NUM.format(n);

/** Parses "12,5" as well as "12.5". */
export function parseNum(s: string) {
  const n = Number(s.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

export function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${NUM.format(Math.round(bytes / 102.4) / 10)} KB`;
  return `${NUM.format(Math.round(bytes / 104857.6) / 10)} MB`;
}

/** Due date with a hint: "Heute", "überfällig". */
export function dueState(due: ISODate | "", done = false): "" | "over" | "today" {
  if (!due || done) return "";
  const d = diffDays(today(), due);
  return d < 0 ? "over" : d === 0 ? "today" : "";
}

export function dueText(due: ISODate | "") {
  if (!due) return "–";
  const d = diffDays(today(), due);
  if (d === 0) return "Heute";
  if (d === 1) return "Morgen";
  if (d === -1) return "Gestern";
  return fmt(due);
}

export const plural = (n: number, one: string, many: string) => `${fmtNum(n)} ${n === 1 ? one : many}`;
