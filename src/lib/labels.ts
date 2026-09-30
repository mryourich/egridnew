import type { AbsenceType, Fuel, ServiceKind, ServiceStatus, IssueKind, IssueStatus, MaterialStatus, ProjectStatus, ResourceType, Severity, TaskStatus, Weather } from "./types";

export type Tone = "blue" | "green" | "amber" | "red" | "gray" | "cyan" | "violet";

export const projectStatus: Record<ProjectStatus, { label: string; tone: Tone }> = {
  planung: { label: "In Planung", tone: "violet" },
  aktiv: { label: "Aktiv", tone: "green" },
  pausiert: { label: "Pausiert", tone: "amber" },
  abgeschlossen: { label: "Abgeschlossen", tone: "gray" }
};

export const taskStatus: Record<TaskStatus, { label: string; tone: Tone }> = {
  offen: { label: "Offen", tone: "gray" },
  in_arbeit: { label: "In Arbeit", tone: "blue" },
  erledigt: { label: "Erledigt", tone: "green" },
  blockiert: { label: "Blockiert", tone: "red" }
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

export const materialStatus: Record<MaterialStatus, { label: string; tone: Tone }> = {
  geplant: { label: "Geplant", tone: "gray" },
  bestellt: { label: "Bestellt", tone: "blue" },
  teilgeliefert: { label: "Teilgeliefert", tone: "amber" },
  geliefert: { label: "Geliefert", tone: "green" }
};

export const absenceType: Record<AbsenceType, { label: string; tone: Tone }> = {
  urlaub: { label: "Urlaub", tone: "cyan" },
  krank: { label: "Krank", tone: "red" },
  schulung: { label: "Schulung", tone: "violet" },
  sonstiges: { label: "Sonstiges", tone: "gray" }
};

export const weather: Record<Weather, { label: string }> = {
  sonnig: { label: "Sonnig" },
  bewoelkt: { label: "Bewölkt" },
  regen: { label: "Regen" },
  schnee: { label: "Schnee" },
  frost: { label: "Frost" }
};

export const resourceType: Record<ResourceType, { label: string; plural: string }> = {
  employee: { label: "Mitarbeiter", plural: "Mitarbeiter" },
  vehicle: { label: "Fahrzeug", plural: "Fahrzeuge" },
  equipment: { label: "Gerät", plural: "Geräte" }
};

export const vehicleStatus = {
  verfuegbar: { label: "Verfügbar", tone: "green" as Tone },
  werkstatt: { label: "Werkstatt", tone: "amber" as Tone },
  ausser_betrieb: { label: "Außer Betrieb", tone: "red" as Tone }
};

export const serviceKind: Record<ServiceKind, { label: string; icon: string }> = {
  service: { label: "Service", icon: "🔧" },
  pickerl: { label: "Pickerl §57a", icon: "📋" },
  reifen: { label: "Reifenwechsel", icon: "🛞" },
  reparatur: { label: "Reparatur", icon: "🛠️" },
  schaden: { label: "Schaden", icon: "⚠️" },
  sonstiges: { label: "Sonstiges", icon: "📌" }
};

export const serviceStatus: Record<ServiceStatus, { label: string; tone: Tone }> = {
  offen: { label: "Gemeldet", tone: "red" },
  geplant: { label: "Termin fix", tone: "amber" },
  erledigt: { label: "Erledigt", tone: "green" }
};

export const fuel: Record<Fuel, { label: string }> = {
  diesel: { label: "Diesel" },
  benzin: { label: "Benzin" },
  elektro: { label: "Elektro" },
  hybrid: { label: "Hybrid" }
};

export const equipmentStatus = {
  verfuegbar: { label: "Verfügbar", tone: "green" as Tone },
  defekt: { label: "Defekt", tone: "red" as Tone },
  ausser_betrieb: { label: "Außer Betrieb", tone: "gray" as Tone }
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
