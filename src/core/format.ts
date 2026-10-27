import { today, type ISODate } from "./date";
import type { DocumentKind, DocumentStatus, Priority, ProjectStatus, WorkStatus } from "./types";

const MONTHS = ["Jan.", "Feb.", "März", "Apr.", "Mai", "Juni", "Juli", "Aug.", "Sep.", "Okt.", "Nov.", "Dez."];

/** 21.10.2026 */
export function fmtDate(d: ISODate | "" | undefined) {
  if (!d) return "";
  const [y, m, day] = d.slice(0, 10).split("-");
  return `${day}.${m}.${y}`;
}

/** 21. Okt. */
export function fmtShort(d: ISODate | "" | undefined) {
  if (!d) return "";
  const [, m, day] = d.slice(0, 10).split("-");
  return `${Number(day)}. ${MONTHS[Number(m) - 1]}`;
}

/** 21.10.2026, 09:15 */
export function fmtStamp(ts: string | undefined) {
  if (!ts) return "";
  const t = new Date(ts);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(t.getDate())}.${p(t.getMonth() + 1)}.${t.getFullYear()}, ${p(t.getHours())}:${p(t.getMinutes())}`;
}

/** "heute 09:15", "gestern 16:30", "21.10. 09:15" */
export function fmtWhen(ts: string | undefined) {
  if (!ts) return "";
  const t = new Date(ts);
  const p = (n: number) => String(n).padStart(2, "0");
  const time = `${p(t.getHours())}:${p(t.getMinutes())}`;
  const d = `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}`;
  const td = today();
  if (d === td) return `heute ${time}`;
  const y = new Date(Date.now() - 86_400_000);
  if (d === `${y.getFullYear()}-${p(y.getMonth() + 1)}-${p(y.getDate())}`) return `gestern ${time}`;
  return `${p(t.getDate())}.${p(t.getMonth() + 1)}. ${time}`;
}

export const fmtSize = (n: number) => (n > 1_048_576 ? `${(n / 1_048_576).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
export const fmtMoney = (n: number | null) => (n == null ? "" : `${n.toLocaleString("de-AT", { maximumFractionDigits: 0 })} €`);

export const PROJECT_STATUS: Record<ProjectStatus, { label: string; tone: Tone }> = {
  planning: { label: "Planung", tone: "gray" },
  active: { label: "Aktiv", tone: "blue" },
  handover: { label: "Abnahme", tone: "amber" },
  paused: { label: "Pausiert", tone: "gray" },
  archived: { label: "Archiviert", tone: "gray" }
};

export const WORK_STATUS: Record<WorkStatus, { label: string; tone: Tone }> = {
  open: { label: "Offen", tone: "gray" },
  in_progress: { label: "In Arbeit", tone: "blue" },
  done: { label: "Erledigt", tone: "green" }
};

export const PRIORITY: Record<Priority, { label: string; tone: Tone }> = {
  high: { label: "Hoch", tone: "red" },
  medium: { label: "Mittel", tone: "amber" },
  low: { label: "Niedrig", tone: "gray" }
};

export const DOC_KIND: Record<DocumentKind, string> = { photo: "Foto", protocol: "Protokoll", plan: "Plan", report: "Bericht", file: "Datei" };
export const DOC_STATUS: Record<DocumentStatus, { label: string; tone: Tone }> = {
  draft: { label: "Entwurf", tone: "gray" },
  review: { label: "In Prüfung", tone: "amber" },
  approved: { label: "Freigegeben", tone: "green" }
};

export type Tone = "gray" | "blue" | "green" | "amber" | "red";

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

export const defectNo = (n: number) => `M-${String(n).padStart(3, "0")}`;
