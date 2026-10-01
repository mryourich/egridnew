import type { Role } from "./store";

export type SiteSection = "uebersicht" | "zeiten" | "plan" | "struktur" | "fotos" | "maengel" | "material" | "berichte" | "dokumente";

const ALL: Role[] = ["pl", "bl", "mk", "monteur"];
const MANAGERS: Role[] = ["pl", "bl", "mk"];

export const siteSections: { key: SiteSection; label: string; roles: Role[] }[] = [
  { key: "uebersicht", label: "Übersicht", roles: ALL },
  { key: "plan", label: "Plan", roles: MANAGERS },
  { key: "struktur", label: "Struktur", roles: ALL },
  { key: "fotos", label: "Fotos", roles: ALL },
  { key: "maengel", label: "Mängel", roles: ALL },
  { key: "material", label: "Material", roles: ALL },
  { key: "zeiten", label: "Zeiten", roles: MANAGERS },
  { key: "berichte", label: "Berichte", roles: MANAGERS },
  { key: "dokumente", label: "Dokumente", roles: ALL }
];

export function defaultSection(role: Role): SiteSection {
  return role === "monteur" ? "struktur" : "uebersicht";
}
