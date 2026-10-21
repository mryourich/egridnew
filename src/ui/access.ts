import { holidayName, inRange, today } from "@/lib/date";
import { currentUser, roleOf } from "@/lib/store";
import type { AccessRole, Absence, Data, Employee, Job, Project } from "@/lib/types";

/** Four roles a small company understands. */
export type Simple = "chef" | "buero" | "bauleiter" | "monteur";

export function simpleRole(e: Employee | undefined): Simple {
  const r = roleOf(e);
  if (r === "admin") return "chef";
  if (r === "buero") return "buero";
  if (r === "monteur") return "monteur";
  return "bauleiter";
}

export const SIMPLE_LABEL: Record<Simple, string> = { chef: "Chef", buero: "Büro", bauleiter: "Bauleiter", monteur: "Monteur" };
export const SIMPLE_ACCESS: Record<Simple, AccessRole> = { chef: "admin", buero: "buero", bauleiter: "bl", monteur: "monteur" };

export function me(data: Data) {
  return currentUser(data);
}

/** Everybody but the workers plans, manages sites and the team. */
export function canPlan(data: Data) {
  return simpleRole(me(data)) !== "monteur";
}

/** Workers only remove nothing; the office keeps everything. */
export function canRemove(data: Data) {
  const r = simpleRole(me(data));
  return r === "chef" || r === "bauleiter";
}

/** Sites someone sees: the office and leaders all, workers those they belong to or are planned on. */
export function visibleSites(data: Data, withDone = false) {
  const user = me(data);
  const all = simpleRole(user) !== "monteur";
  return data.projects
    .filter((p) => withDone || p.status !== "abgeschlossen")
    .filter((p) => all || p.createdBy === user?.id || p.members.includes(user?.id ?? "") || data.jobs.some((j) => j.projectId === p.id && j.employeeId === user?.id))
    .sort((a, b) => a.name.localeCompare(b.name, "de"));
}

export function activePeople(data: Data) {
  return data.employees.filter((e) => e.active).sort((a, b) => a.name.localeCompare(b.name, "de"));
}

export type Slot = { kind: "job"; job: Job; project?: Project } | { kind: "absence"; absence: Absence } | { kind: "holiday"; name: string } | { kind: "free" };

/** What fills one half day of one person. */
export function slotOf(data: Data, employeeId: string, day: string, pm: boolean): Slot {
  const holiday = holidayName(day);
  if (holiday) return { kind: "holiday", name: holiday };
  const absence = data.absences.find((a) => a.employeeId === employeeId && inRange(day, a.start, a.end));
  if (absence) return { kind: "absence", absence };
  const job = data.jobs.find(
    (j) => j.employeeId === employeeId && !j.symbol && inRange(day, j.start, j.end) && !(pm && day === j.end && j.endAm) && !(!pm && day === j.start && j.startPm)
  );
  return job ? { kind: "job", job, project: data.projects.find((p) => p.id === job.projectId) } : { kind: "free" };
}

export function sameSlot(a: Slot, b: Slot) {
  if (a.kind !== b.kind) return false;
  if (a.kind === "job" && b.kind === "job") return a.job.id === b.job.id;
  if (a.kind === "absence" && b.kind === "absence") return a.absence.id === b.absence.id;
  return true;
}

export const ABSENCE: Record<string, { label: string; color: string }> = {
  urlaub: { label: "Urlaub", color: "#0891b2" },
  krank: { label: "Krankenstand", color: "#dc2626" },
  za: { label: "Zeitausgleich", color: "#16a34a" },
  schulung: { label: "Schulung", color: "#7c3aed" },
  sonstiges: { label: "Abwesend", color: "#64748b" }
};

/** Text for one person's day: "Tunnel Nord · Kabelzug", "VM Feld 2 · NM Wandler", "Krank", "frei". */
export function dayText(data: Data, employeeId: string, day = today()) {
  const am = slotOf(data, employeeId, day, false);
  const pm = slotOf(data, employeeId, day, true);
  const one = (s: Slot) => (s.kind === "job" ? [s.project?.name, s.job.title].filter(Boolean).join(" · ") : s.kind === "absence" ? ABSENCE[s.absence.type].label : s.kind === "holiday" ? s.name : "frei");
  if (sameSlot(am, pm)) return { am, pm, text: one(am), split: false };
  if (am.kind === "job" && pm.kind === "job" && am.job.projectId === pm.job.projectId)
    return { am, pm, text: `${am.project?.name ?? ""} · VM ${am.job.title || "–"}, NM ${pm.job.title || "–"}`, split: true };
  return { am, pm, text: `VM ${one(am)} · NM ${one(pm)}`, split: true };
}

export const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
