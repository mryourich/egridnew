import type { Role } from "./store";

export type SiteSection = "plan" | "struktur" | "fotos" | "maengel" | "berichte" | "team";

const ALL: Role[] = ["pl", "bl", "mk", "monteur"];
const MANAGERS: Role[] = ["pl", "bl", "mk"];

export const siteSections: { key: SiteSection; label: string; roles: Role[] }[] = [
  { key: "plan", label: "Plan", roles: MANAGERS },
  { key: "struktur", label: "Struktur", roles: ALL },
  { key: "fotos", label: "Fotos", roles: ALL },
  { key: "maengel", label: "Mängel", roles: ALL },
  { key: "berichte", label: "Berichte", roles: MANAGERS },
  { key: "team", label: "Team", roles: ALL }
];

export function defaultSection(role: Role): SiteSection {
  return role === "monteur" ? "struktur" : "plan";
}
