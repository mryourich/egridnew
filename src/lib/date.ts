import type { ISODate } from "./types";

const DAY = 86_400_000;

export function parse(date: ISODate) {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function toISO(ms: number): ISODate {
  return new Date(ms).toISOString().slice(0, 10);
}

export function today(): ISODate {
  const now = new Date();
  return toISO(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

export function addDays(date: ISODate, days: number): ISODate {
  return toISO(parse(date) + days * DAY);
}

/** Number of days from a to b (b - a). */
export function diffDays(a: ISODate, b: ISODate) {
  return Math.round((parse(b) - parse(a)) / DAY);
}

export function weekday(date: ISODate) {
  return new Date(parse(date)).getUTCDay();
}

export function isWeekend(date: ISODate) {
  const d = weekday(date);
  return d === 0 || d === 6;
}

export function startOfWeek(date: ISODate) {
  const d = weekday(date);
  return addDays(date, d === 0 ? -6 : 1 - d);
}

export function isoWeek(date: ISODate) {
  const t = new Date(parse(date));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = Date.UTC(t.getUTCFullYear(), 0, 1);
  return Math.ceil(((t.getTime() - yearStart) / DAY + 1) / 7);
}

export function overlaps(aStart: ISODate, aEnd: ISODate, bStart: ISODate, bEnd: ISODate) {
  return aStart <= bEnd && bStart <= aEnd;
}

export function inRange(date: ISODate, start: ISODate, end: ISODate) {
  return date >= start && date <= end;
}

const WEEKDAYS = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
const MONTHS = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
const MONTHS_LONG = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

export function weekdayShort(date: ISODate) {
  return WEEKDAYS[weekday(date)];
}

export function monthLabel(date: ISODate, long = false) {
  const d = new Date(parse(date));
  return `${(long ? MONTHS_LONG : MONTHS)[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function fmt(date: ISODate | undefined) {
  if (!date) return "–";
  const [y, m, d] = date.split("-");
  return `${d}.${m}.${y}`;
}

export function fmtShort(date: ISODate | undefined) {
  if (!date) return "–";
  const [, m, d] = date.split("-");
  return `${d}.${m}.`;
}

/** Counts working days (Mon–Fri) in an inclusive range. */
export function workdaysBetween(start: ISODate, end: ISODate) {
  let count = 0;
  for (let d = start; d <= end; d = addDays(d, 1)) {
    if (!isWeekend(d)) count++;
  }
  return count;
}

function easterSunday(year: number) {
  // Anonymous Gregorian algorithm.
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return toISO(Date.UTC(year, month - 1, day));
}

const holidayCache = new Map<number, Map<ISODate, string>>();

/** Austrian public holidays of a year. */
export function holidays(year: number) {
  let map = holidayCache.get(year);
  if (map) return map;
  const e = easterSunday(year);
  const y = String(year);
  map = new Map<ISODate, string>([
    [`${y}-01-01`, "Neujahr"],
    [`${y}-01-06`, "Heilige Drei Könige"],
    [addDays(e, 1), "Ostermontag"],
    [`${y}-05-01`, "Staatsfeiertag"],
    [addDays(e, 39), "Christi Himmelfahrt"],
    [addDays(e, 50), "Pfingstmontag"],
    [addDays(e, 60), "Fronleichnam"],
    [`${y}-08-15`, "Mariä Himmelfahrt"],
    [`${y}-10-26`, "Nationalfeiertag"],
    [`${y}-11-01`, "Allerheiligen"],
    [`${y}-12-08`, "Mariä Empfängnis"],
    [`${y}-12-25`, "Christtag"],
    [`${y}-12-26`, "Stefanitag"]
  ]);
  holidayCache.set(year, map);
  return map;
}

export function holidayName(date: ISODate) {
  return holidays(Number(date.slice(0, 4))).get(date);
}
