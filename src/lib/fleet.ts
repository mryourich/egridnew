import { addDays, fmtShort, today, weekdayShort } from "./date";
import { currentUser } from "./store";
import type { Booking, Data, ServiceEntry, Vehicle } from "./types";

/** Local date-time "YYYY-MM-DDTHH:mm" of now. */
export function nowLocal() {
  const d = new Date();
  return `${today()}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export const dayStart = (date: string) => `${date}T00:00`;
export const dayEnd = (date: string) => `${date}T23:59`;

const overlap = (aStart: string, aEnd: string, bStart: string, bEnd: string) => aStart < bEnd && bStart < aEnd;

export function vehicleLabel(v: Vehicle | undefined) {
  return v ? `${v.name} · ${v.plate}` : "–";
}

/** "Mo 30.09. 07:30–17:00" or "30.09. 07:30 – 02.10. 18:00" */
export function fmtSpan(start: string, end: string) {
  const [sd, st] = start.split("T");
  const [ed, et] = end.split("T");
  if (sd === ed) return `${weekdayShort(sd)} ${fmtShort(sd)} ${st}–${et}`;
  return `${weekdayShort(sd)} ${fmtShort(sd)} ${st} – ${weekdayShort(ed)} ${fmtShort(ed)} ${et}`;
}

export type Busy = { kind: "booking" | "service" | "project" | "out"; label: string; id: string };

/** Everything that blocks a vehicle between two local date-times. */
export function vehicleBusy(data: Data, vehicleId: string, from: string, to: string, ignoreId = ""): Busy[] {
  const v = data.vehicles.find((x) => x.id === vehicleId);
  const out: Busy[] = [];
  if (!v) return out;
  if (v.status === "ausser_betrieb") out.push({ kind: "out", label: "Außer Betrieb", id: v.id });
  const name = (id: string) => data.employees.find((e) => e.id === id)?.name ?? "jemand";
  for (const b of data.bookings)
    if (b.vehicleId === vehicleId && b.id !== ignoreId && !b.returned && overlap(b.start, b.end, from, to))
      out.push({ kind: "booking", label: `gebucht von ${name(b.employeeId)} (${fmtSpan(b.start, b.end)})`, id: b.id });
  for (const s of data.services)
    if (s.vehicleId === vehicleId && s.id !== ignoreId && s.status === "geplant" && s.date && overlap(dayStart(s.date), dayEnd(s.until || s.date), from, to))
      out.push({ kind: "service", label: `in der Werkstatt (${fmtShort(s.date)}${s.until && s.until !== s.date ? `–${fmtShort(s.until)}` : ""})`, id: s.id });
  for (const a of data.assignments)
    if (a.resourceType === "vehicle" && a.resourceId === vehicleId && overlap(dayStart(a.start), dayEnd(a.end), from, to)) {
      const p = data.projects.find((x) => x.id === a.projectId);
      out.push({ kind: "project", label: `auf Baustelle ${p ? p.code : a.label ?? ""} (${fmtShort(a.start)}–${fmtShort(a.end)})`, id: a.id });
    }
  return out;
}

export type VehicleState = { key: "frei" | "unterwegs" | "werkstatt" | "baustelle" | "fix" | "ausser_betrieb"; label: string; tone: "green" | "blue" | "amber" | "violet" | "gray" | "red"; detail?: string };

/** What the vehicle is doing right now. */
export function vehicleState(data: Data, v: Vehicle): VehicleState {
  const t = today();
  const now = nowLocal();
  if (v.status === "ausser_betrieb") return { key: "ausser_betrieb", label: "Außer Betrieb", tone: "red" };
  const shop = data.services.find((s) => s.vehicleId === v.id && s.status === "geplant" && s.date && s.date <= t && t <= (s.until || s.date));
  if (shop || v.status === "werkstatt") return { key: "werkstatt", label: "Werkstatt", tone: "amber", detail: shop?.workshop };
  const trip = data.bookings.find((b) => b.vehicleId === v.id && !b.returned && b.start <= now && now <= b.end);
  if (trip) return { key: "unterwegs", label: "Unterwegs", tone: "blue", detail: data.employees.find((e) => e.id === trip.employeeId)?.name };
  const site = data.assignments.find((a) => a.resourceType === "vehicle" && a.resourceId === v.id && a.start <= t && t <= a.end);
  if (site) return { key: "baustelle", label: "Baustelle", tone: "violet", detail: data.projects.find((p) => p.id === site.projectId)?.code };
  if (v.driverId) return { key: "fix", label: "Dienstwagen", tone: "gray", detail: data.employees.find((e) => e.id === v.driverId)?.name };
  return { key: "frei", label: "Frei", tone: "green" };
}

export type Due = { vehicle: Vehicle; kind: "service" | "pickerl"; date: string; open?: ServiceEntry };

/** Service and §57a dates due within the horizon – with the appointment if one is already arranged. */
export function dueList(data: Data, days = 30): Due[] {
  const horizon = addDays(today(), days);
  const list: Due[] = [];
  for (const v of data.vehicles) {
    if (v.status === "ausser_betrieb") continue;
    const open = (kind: Due["kind"]) => data.services.find((s) => s.vehicleId === v.id && s.kind === kind && s.status !== "erledigt");
    if (v.nextService && v.nextService <= horizon) list.push({ vehicle: v, kind: "service", date: v.nextService, open: open("service") });
    if (v.nextInspection && v.nextInspection <= horizon) list.push({ vehicle: v, kind: "pickerl", date: v.nextInspection, open: open("pickerl") });
  }
  return list.sort((a, b) => a.date.localeCompare(b.date));
}

/** Vehicles the signed-in user may book. */
export function bookableVehicles(data: Data, manager: boolean) {
  const me = currentUser(data)?.id;
  return data.vehicles.filter((v) => v.status !== "ausser_betrieb" && (manager || v.pool || v.driverId === me));
}

export function myBookings(data: Data): Booking[] {
  const me = data.currentUserId;
  const now = nowLocal();
  return data.bookings.filter((b) => b.employeeId === me && !b.returned && b.end >= addDays(now.slice(0, 10), -3)).sort((a, b) => a.start.localeCompare(b.start));
}

/** Workshops used before – offered as suggestions. */
export function knownWorkshops(data: Data) {
  return [...new Set(data.services.map((s) => s.workshop).filter(Boolean))].sort();
}
