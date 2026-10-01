import type { AbsenceType, IssueKind, IssueStatus, MaterialStatus, ProjectStatus, Severity } from "./types";

export type Tone = "blue" | "green" | "amber" | "red" | "gray" | "cyan" | "violet";

export const projectStatus: Record<ProjectStatus, { label: string; tone: Tone }> = {
  planung: { label: "In Planung", tone: "violet" },
  aktiv: { label: "Aktiv", tone: "green" },
  pausiert: { label: "Pausiert", tone: "amber" },
  abgeschlossen: { label: "Abgeschlossen", tone: "gray" }
};

export const issueKind: Record<IssueKind, { label: string; tone: Tone }> = {
  mangel: { label: "Mangel", tone: "red" },
  abweichung: { label: "Abweichung", tone: "amber" },
  behinderung: { label: "Behinderung", tone: "violet" }
};

export const issueStatus: Record<IssueStatus, { label: string; tone: Tone }> = {
  offen: { label: "Offen", tone: "red" },
  in_arbeit: { label: "In Arbeit", tone: "blue" },
  erledigt: { label: "Erledigt", tone: "green" }
};

export const severity: Record<Severity, { label: string; tone: Tone }> = {
  niedrig: { label: "Niedrig", tone: "gray" },
  mittel: { label: "Mittel", tone: "amber" },
  hoch: { label: "Hoch", tone: "red" },
  kritisch: { label: "Kritisch", tone: "red" }
};

export const absenceType: Record<AbsenceType, { label: string; tone: Tone }> = {
  urlaub: { label: "Urlaub", tone: "cyan" },
  krank: { label: "Krank", tone: "red" },
  za: { label: "Zeitausgleich", tone: "green" },
  schulung: { label: "Schulung", tone: "violet" },
  sonstiges: { label: "Sonstiges", tone: "gray" }
};

export const materialStatus: Record<MaterialStatus, { label: string; tone: Tone }> = {
  offen: { label: "Offen", tone: "blue" },
  bestellt: { label: "Bestellt", tone: "amber" },
  angekommen: { label: "Angekommen", tone: "green" }
};

export const projectColors = ["#1463ff", "#00b4d8", "#7c3aed", "#f59e0b", "#10b981", "#ef4444", "#ec4899", "#0ea5e9", "#84cc16", "#64748b"];

export function options<T extends string>(map: Record<T, { label: string }>) {
  return (Object.keys(map) as T[]).map((value) => ({ value, label: map[value].label }));
}

export function eur(value: number) {
  return new Intl.NumberFormat("de-AT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value || 0);
}

export function num(value: number, digits = 0) {
  return new Intl.NumberFormat("de-AT", { maximumFractionDigits: digits }).format(value || 0);
}

/** Short sign for tight cells (time grid, plan). */
export const absenceShort: Record<AbsenceType, string> = { urlaub: "U", krank: "K", za: "ZA", schulung: "S", sonstiges: "A" };
