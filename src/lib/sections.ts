import type { Role } from "./store";

export type SiteSection = "plan" | "struktur" | "fotos" | "maengel" | "berichte" | "team";

export const siteSections: { key: SiteSection; label: string; roles: Role[] }[] = [
  { key: "plan", label: "Plan", roles: ["pl", "bl"] },
  { key: "struktur", label: "Struktur", roles: ["pl", "bl", "monteur"] },
  { key: "fotos", label: "Fotos", roles: ["pl", "bl", "monteur"] },
  { key: "maengel", label: "Mängel", roles: ["pl", "bl", "monteur"] },
  { key: "berichte", label: "Tagesberichte", roles: ["pl", "bl"] },
  { key: "team", label: "Team", roles: ["pl", "bl", "monteur"] }
];

export function defaultSection(role: Role): SiteSection {
  return role === "monteur" ? "struktur" : "plan";
}
