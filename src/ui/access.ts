import { holidayName, inRange, today } from "@/lib/date";
import { isField, peopleScope, rightsOf } from "@/lib/roles";
import { currentUser } from "@/lib/store";
import type { Absence, Data, Job, Project } from "@/lib/types";

export { ROLLE_INFO, ROLLE_LABEL, ROLLEN, rolleOf, type Rolle } from "@/lib/roles";

export function me(data: Data) {
  return currentUser(data);
}

/** Changes the planning boards. */
export const canPlan = (data: Data) => rightsOf(data).plan;
/** Creates new sites. */
export const canCreateSites = (data: Data) => rightsOf(data).createSites;
/** Changes everything inside the sites they see. */
export const canEditSites = (data: Data) => rightsOf(data).editSites;
/** Sees the team menu. */
export const seesTeam = (data: Data) => rightsOf(data).teamView;
/** Changes people, roles and absences. */
export const canEditTeam = (data: Data) => rightsOf(data).team;
/** Company settings and licence. */
export const canSettings = (data: Data) => rightsOf(data).settings;
/** Workers on site (Monteur, Lehrling, Extern). */
export { isField };

/** Deleting belongs to those who manage something; workers and the management only add or look. */
export function canRemove(data: Data) {
  const r = rightsOf(data);
  return r.editSites || r.plan || r.team;
}

/** Sites someone sees: management all, everybody else those they belong to or are planned on. */
export function visibleSites(data: Data, withDone = false) {
  const user = me(data);
  const all = rightsOf(data).allSites;
  return data.projects
    .filter((p) => withDone || p.status !== "abgeschlossen")
    .filter((p) => all || p.createdBy === user?.id || p.managerId === user?.id || p.siteManagerId === user?.id || p.members.includes(user?.id ?? "") || data.jobs.some((j) => j.projectId === p.id && j.employeeId === user?.id))
    .sort((a, b) => a.name.localeCompare(b.name, "de"));
}

export function activePeople(data: Data) {
  return data.employees.filter((e) => e.active).sort((a, b) => a.name.localeCompare(b.name, "de"));
}

/** The people someone sees in planning and team – their part of the organisation chart. */
export function scopedPeople(data: Data) {
  const scope = peopleScope(data);
  return activePeople(data).filter((e) => !scope || scope.has(e.id));
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
