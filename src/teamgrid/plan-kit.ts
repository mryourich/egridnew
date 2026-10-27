import { holidayName, inRange, today } from "@/core/date";
import type { Absence, AbsenceType, Data, Job, Project } from "@/core/types";

export const ABSENCE: Record<AbsenceType, { label: string; short: string; color: string }> = {
  urlaub: { label: "Urlaub", short: "U", color: "#0891b2" },
  krank: { label: "Krankenstand", short: "K", color: "#dc2626" },
  za: { label: "Zeitausgleich", short: "ZA", color: "#16a34a" },
  schulung: { label: "Schulung", short: "S", color: "#7c3aed" }
};
export const ABS_TYPES: AbsenceType[] = ["urlaub", "za", "krank", "schulung"];

export type Slot = { kind: "job"; job: Job; project?: Project } | { kind: "absence"; absence: Absence } | { kind: "holiday"; name: string } | { kind: "free" };

/** What fills one half day of one person. */
export function slotOf(data: Data, employeeId: string, day: string, pm: boolean): Slot {
  const holiday = holidayName(day);
  if (holiday) return { kind: "holiday", name: holiday };
  const absence = data.absences.find((a) => a.employeeId === employeeId && inRange(day, a.start, a.end));
  if (absence) return { kind: "absence", absence };
  const job = data.jobs.find((j) => j.employeeId === employeeId && !j.symbol && inRange(day, j.start, j.end) && !(pm && day === j.end && j.endAm) && !(!pm && day === j.start && j.startPm));
  return job ? { kind: "job", job, project: data.projects.find((p) => p.id === job.projectId) } : { kind: "free" };
}

export function sameSlot(a: Slot, b: Slot) {
  if (a.kind !== b.kind) return false;
  if (a.kind === "job" && b.kind === "job") return a.job.id === b.job.id;
  if (a.kind === "absence" && b.kind === "absence") return a.absence.id === b.absence.id;
  return true;
}

/** Text for one person's day: "Tunnel Nord · Kabelzug", "VM Feld 2 · NM Wandler", "Krankenstand", "frei". */
export function dayText(data: Data, employeeId: string, day = today()) {
  const am = slotOf(data, employeeId, day, false);
  const pm = slotOf(data, employeeId, day, true);
  const one = (s: Slot) => (s.kind === "job" ? [s.project?.name, s.job.title].filter(Boolean).join(" · ") : s.kind === "absence" ? ABSENCE[s.absence.type].label : s.kind === "holiday" ? s.name : "frei");
  if (sameSlot(am, pm)) return { am, pm, text: one(am), split: false };
  if (am.kind === "job" && pm.kind === "job" && am.job.projectId === pm.job.projectId) return { am, pm, text: `${am.project?.name ?? ""} · VM ${am.job.title || "–"}, NM ${pm.job.title || "–"}`, split: true };
  return { am, pm, text: `VM ${one(am)} · NM ${one(pm)}`, split: true };
}

export const plannedOn = (data: Data, id: string, day = today()) => {
  const d = dayText(data, id, day);
  return d.am.kind === "job" || d.pm.kind === "job";
};

/** Whoever is planned on a project may see it: returns the project with the person invited, or null. */
export function withMember(data: Data, projectId: string, employeeId: string) {
  const p = data.projects.find((x) => x.id === projectId);
  if (!p || !data.people.some((e) => e.id === employeeId) || p.createdBy === employeeId || p.managerId === employeeId || p.memberIds.includes(employeeId)) return null;
  return { ...p, memberIds: [...p.memberIds, employeeId] };
}

/** Readable text colour on a given background. */
export function textOn(hex: string) {
  const n = parseInt(hex.replace("#", "").padEnd(6, "0").slice(0, 6), 16);
  return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 160 ? "#1f2937" : "#ffffff";
}

/** Palette in the layout of classic planning boards: 6 rows × 5 columns. */
export const PALETTE = [
  ["#808033", "#7a9a8a", "#2e75b6", "#7f6252", "#707070"],
  ["#bfcb2c", "#8fbfa6", "#5fb3d9", "#b07d5e", "#a0a0a0"],
  ["#e8f55a", "#c6e0a3", "#a9c8f7", "#dfb398", "#d4d4d4"],
  ["#735a97", "#b03a50", "#d91414", "#de7a25", "#fbd02e"],
  ["#b673b8", "#c07070", "#ff3b30", "#ff8a1e", "#fff31a"],
  ["#f5a0cf", "#e6a8ac", "#f47070", "#ffa726", "#faf59a"]
];

/** Symbols like on classic planning boards. */
export const SYMBOLS = ["❌", "✅", "➕", "❓", "❗", "⛔", "♦️", "⚠️", "🕒", "💬", "ℹ️", "🧮", "👷", "👨‍🔧", "👥", "📖", "🔔", "⬇️", "💶", "🔻", "💎", "🔷", "🔶", "🔒", "📞", "💡", "🔧", "🚚", "🔑", "✉️", "⏰", "⭐", "⚙️", "📦", "🔍", "📅", "⏳", "📊", "✏️", "☀️", "☁️", "🚩", "🏁", "🚧", "➡️", "✔️", "🔴", "🟠", "🟡", "🟢", "🔵", "🟣", "🏗️", "🔌", "⚡", "🧯", "🪜", "📐", "📸", "🙂"];
