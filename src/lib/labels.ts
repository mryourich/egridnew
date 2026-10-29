import type { DefectStatus, PointType, Priority, SiteStatus, WorkStatus } from "./store/types";

type Tone = "blue" | "green" | "amber" | "red" | "neutral";

export const WORK_STATUS: Record<WorkStatus, { label: string; tone: Tone }> = {
  offen: { label: "Offen", tone: "neutral" },
  in_arbeit: { label: "In Arbeit", tone: "blue" },
  erledigt: { label: "Erledigt", tone: "green" }
};
export const WORK_STATUSES = Object.keys(WORK_STATUS) as WorkStatus[];

export const DEFECT_STATUS: Record<DefectStatus, { label: string; tone: Tone }> = {
  offen: { label: "Offen", tone: "amber" },
  in_arbeit: { label: "In Behebung", tone: "blue" },
  behoben: { label: "Behoben", tone: "green" },
  abgenommen: { label: "Abgenommen", tone: "neutral" }
};
export const DEFECT_STATUSES = Object.keys(DEFECT_STATUS) as DefectStatus[];
export const defectOpen = (s: DefectStatus) => s === "offen" || s === "in_arbeit";

export const PRIORITY: Record<Priority, string> = { hoch: "Hoch", mittel: "Mittel", niedrig: "Niedrig" };
export const PRIORITIES: Priority[] = ["hoch", "mittel", "niedrig"];
export const PRIO_RANK: Record<Priority, number> = { hoch: 0, mittel: 1, niedrig: 2 };

export const SITE_STATUS: Record<SiteStatus, { label: string; tone: Tone }> = {
  geplant: { label: "Geplant", tone: "neutral" },
  aktiv: { label: "In Ausführung", tone: "blue" },
  abnahme: { label: "Abnahme", tone: "amber" },
  pausiert: { label: "Pausiert", tone: "neutral" },
  archiviert: { label: "Archiviert", tone: "neutral" }
};
export const SITE_STATUSES = Object.keys(SITE_STATUS) as SiteStatus[];

export const POINT_TYPE: Record<PointType, string> = { bereich: "Bereich", abschnitt: "Abschnitt", unterabschnitt: "Unterabschnitt", punkt: "Punkt" };
/** What can be created below a node. */
export const CHILD_TYPES: Record<PointType | "root", PointType[]> = {
  root: ["bereich", "punkt"],
  bereich: ["abschnitt", "punkt"],
  abschnitt: ["unterabschnitt", "punkt"],
  unterabschnitt: ["punkt"],
  punkt: []
};

export const NOTE_COLORS: Record<string, { label: string; bg: string; edge: string }> = {
  yellow: { label: "Gelb", bg: "#fbf3cf", edge: "#d8c46a" },
  blue: { label: "Blau", bg: "#e1ebf3", edge: "#8fb0c9" },
  green: { label: "Grün", bg: "#e3efe4", edge: "#93b99a" },
  red: { label: "Rot", bg: "#f6e1e1", edge: "#cf9a9a" },
  grey: { label: "Grau", bg: "#eceef1", edge: "#b9bfc8" }
};

export const EMPLOYMENT: Record<import("./store/types").Employment, string> = {
  vollzeit: "Vollzeit",
  teilzeit: "Teilzeit",
  lehrling: "Lehrling",
  geringfuegig: "Geringfügig",
  leiharbeiter: "Leiharbeiter",
  subunternehmer: "Subunternehmer"
};
export const EMPLOYMENTS = Object.keys(EMPLOYMENT) as import("./store/types").Employment[];

/** Functions in the company – chosen from a list, not typed. The first four may release reports by default. */
export const POSITIONS = ["Geschäftsführung", "Bauleitung", "Projektleitung", "Teamleitung", "Polier", "Vorarbeiter", "Techniker", "Servicetechniker", "Monteur", "Installateur", "Elektriker", "Helfer", "Lehrling", "Büro", "Leiharbeiter", "Subunternehmer"];
export const LEAD_POSITIONS = ["Geschäftsführung", "Bauleitung", "Projektleitung", "Teamleitung"];
