"use client";

import Image from "next/image";
import { Fragment, useState, type CSSProperties, type Dispatch, type MouseEvent as ReactMouseEvent, type ReactNode, type SetStateAction } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  Bell,
  Building2,
  CalendarDays,
  Camera,
  Car,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Copy,
  Download,
  Euro,
  FileCheck2,
  FileText,
  Filter,
  Flag,
  FolderKanban,
  HardHat,
  HelpCircle,
  Image as ImageIcon,
  LayoutDashboard,
  LockKeyhole,
  Mail,
  MapPinned,
  Menu,
  MessageSquareText,
  Plus,
  Pencil,
  Save,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  Upload,
  UsersRound,
  Wrench,
  X
} from "lucide-react";
import { people as demoPeople, workspace, type PageKey } from "@/lib/demo-data";

type Tone = "blue" | "green" | "amber" | "red";
type NavIcon = typeof LayoutDashboard;
type SiteTab =
  | "dashboard"
  | "progress"
  | "defects"
  | "tasks"
  | "notes"
  | "documentation"
  | "reports"
  | "settings";

type StatItem = {
  detail: string;
  icon: NavIcon;
  label: string;
  tone: Tone;
  trend: string;
  value: string;
};

type SubNavItem = {
  description: string;
  icon: NavIcon;
  key: string;
  label: string;
};

type ModuleNavItem = {
  icon: NavIcon;
  key: PageKey;
  kicker: string;
  label: string;
  primaryAction: string;
  summary: string;
  subItems: SubNavItem[];
};

type SiteProject = {
  budget: string;
  client: string;
  due: string;
  id: string;
  imageUrl?: string;
  location: string;
  manager: string;
  name: string;
  progress: number;
  status: "Aktiv" | "Planung" | "Abnahme" | "Pausiert";
  team: number;
};

type SiteDefect = {
  attachments?: ProgressAttachment[];
  createdAt: string;
  description: string;
  id: string;
  owner: string;
  priority: "Hoch" | "Mittel" | "Niedrig";
  progressItemId?: string;
  progressPath?: string[];
  projectId: string;
  status: "Offen" | "In Arbeit" | "Erledigt";
  title: string;
};

type SiteTask = {
  done: boolean;
  due: string;
  id: string;
  owner: string;
  projectId: string;
  title: string;
};

type SiteNote = {
  id: string;
  pinned: boolean;
  projectId: string;
  text: string;
  time: string;
};

type SiteDocument = {
  id: string;
  kind: "Foto" | "Protokoll" | "Plan" | "Bericht";
  name: string;
  projectId: string;
  status: "Freigegeben" | "Prüfung" | "Entwurf";
  updated: string;
};

type SiteReport = {
  id: string;
  name: string;
  status: "Bereit" | "Entwurf" | "Gesendet";
  target: string;
  time: string;
};

type ProgressNodeType = "area" | "section" | "subsection" | "task";

type ProgressAttachment = {
  id: string;
  kind: "Foto" | "Datei";
  mimeType?: string;
  name: string;
  time: string;
  url?: string;
};

type ProgressNode = {
  assignees: string[];
  attachments: ProgressAttachment[];
  description: string;
  done?: boolean;
  id: string;
  parentId: string | null;
  projectId: string;
  status: "Offen" | "In Arbeit" | "Erledigt";
  title: string;
  type: ProgressNodeType;
};

type DefectDraft = {
  attachments: ProgressAttachment[];
  description: string;
  id?: string;
  owner: string;
  priority: SiteDefect["priority"];
  progressItemId: string;
  status: SiteDefect["status"];
  title: string;
};

const moduleNavigation: ModuleNavItem[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    kicker: "Zentrale Firmenübersicht für alle VYSNpro Module.",
    icon: LayoutDashboard,
    primaryAction: "Vorschau",
    summary: "Zentrale Übersicht",
    subItems: [
      { key: "overview", label: "Dashboard", description: "Zentrale Übersicht", icon: LayoutDashboard },
      { key: "activities", label: "Aktivitäten", description: "Feed und Änderungen", icon: Activity },
      { key: "tasks", label: "Aufgaben", description: "Offene To-dos", icon: CheckCircle2 },
      { key: "reports", label: "Berichte", description: "Management-Auswertung", icon: BarChart3 }
    ]
  },
  {
    key: "site",
    label: "SiteManager",
    kicker: "Projekte, Open Points, Mängel, Aufgaben und Dokumentation.",
    icon: HardHat,
    primaryAction: "Projekt anlegen",
    summary: "Bau & Projekte",
    subItems: [
      { key: "dashboard", label: "Site Dashboard", description: "Projekt-Cockpit", icon: LayoutDashboard },
      { key: "progress", label: "Open Points", description: "Bereiche und Status", icon: BarChart3 },
      { key: "defects", label: "Mängel", description: "Offene Punkte", icon: AlertTriangle },
      { key: "tasks", label: "Aufgaben", description: "Zuweisungen vor Ort", icon: ClipboardList },
      { key: "notes", label: "Notizen", description: "Baustellen-Journal", icon: MessageSquareText },
      { key: "documentation", label: "Dokumentation", description: "Fotos und Protokolle", icon: FileCheck2 },
      { key: "reports", label: "Berichte", description: "PDF und Mail", icon: FileText },
      { key: "settings", label: "Einstellungen", description: "Projekt-Setup", icon: Settings }
    ]
  },
  {
    key: "people",
    label: "People",
    kicker: "Mitarbeiter, Rollen, Qualifikationen und Verfügbarkeit.",
    icon: UsersRound,
    primaryAction: "Vormerken",
    summary: "HR & Mitarbeiter",
    subItems: [
      { key: "dashboard", label: "Dashboard", description: "People Übersicht", icon: LayoutDashboard },
      { key: "employees", label: "Mitarbeiter", description: "Profile und Teams", icon: UsersRound },
      { key: "files", label: "Personalakten", description: "HR Dokumente", icon: FileCheck2 },
      { key: "absence", label: "Abwesenheiten", description: "Urlaub und Krankenstand", icon: CalendarDays },
      { key: "qualifications", label: "Qualifikationen", description: "Nachweise und Schulungen", icon: CheckCircle2 },
      { key: "vpa", label: "VPA Test", description: "Prüfungen und Tests", icon: Activity },
      { key: "onboarding", label: "Onboarding", description: "Neue Mitarbeiter", icon: Plus }
    ]
  },
  {
    key: "fleet",
    label: "Fleet",
    kicker: "Fahrzeuge, Reservierungen, Wartung, Schäden und Kosten.",
    icon: Car,
    primaryAction: "Vormerken",
    summary: "Fuhrpark & Buchungen",
    subItems: [
      { key: "dashboard", label: "Fleet Dashboard", description: "Fuhrpark-Übersicht", icon: LayoutDashboard },
      { key: "vehicles", label: "Fahrzeuge", description: "Stamm- und Statusdaten", icon: Car },
      { key: "reservations", label: "Reservierungen", description: "Buchungen und Kalender", icon: CalendarDays },
      { key: "maintenance", label: "Wartung", description: "Service und Fristen", icon: Wrench },
      { key: "damages", label: "Schäden", description: "Meldungen und Verlauf", icon: AlertTriangle },
      { key: "documents", label: "Dokumente", description: "Pickerl und Versicherung", icon: FileCheck2 },
      { key: "costs", label: "Kosten", description: "Budget und Auswertung", icon: Euro },
      { key: "settings", label: "Einstellungen", description: "Fleet Modul", icon: Settings }
    ]
  },
  {
    key: "documents",
    label: "Datei-Zentrale",
    kicker: "Unternehmensdateien, Freigaben, Fristen und Vorlagen.",
    icon: FileCheck2,
    primaryAction: "Vormerken",
    summary: "Dokumente & Freigaben",
    subItems: [
      { key: "dashboard", label: "Datei Dashboard", description: "Dokumenten-Übersicht", icon: LayoutDashboard },
      { key: "files", label: "Alle Dateien", description: "Zentrale Ablage", icon: FileCheck2 },
      { key: "approvals", label: "Freigaben", description: "Prüfungen und Signaturen", icon: CheckCircle2 },
      { key: "deadlines", label: "Fristen", description: "Ablauf und Erinnerung", icon: CalendarDays },
      { key: "templates", label: "Vorlagen", description: "Standards und Formulare", icon: FolderKanban },
      { key: "archive", label: "Archiv", description: "Abgelegte Dateien", icon: LockKeyhole },
      { key: "settings", label: "Einstellungen", description: "Datei-Zentrale", icon: Settings }
    ]
  },
  {
    key: "settings",
    label: "Einstellungen",
    kicker: "Workspace, Sicherheit, Module, Rollen und Integrationen.",
    icon: Settings,
    primaryAction: "Vormerken",
    summary: "Workspace & Admin",
    subItems: [
      { key: "workspace", label: "Workspace", description: "Mandant und Region", icon: Building2 },
      { key: "company", label: "Firmendaten", description: "Stammdaten und Branding", icon: Building2 },
      { key: "users", label: "Benutzer & Rollen", description: "Einladungen und Rechte", icon: ShieldCheck },
      { key: "modules", label: "Module", description: "Aktive VYSNpro Bereiche", icon: LayoutDashboard },
      { key: "security", label: "Sicherheit", description: "Login und Zugriff", icon: LockKeyhole },
      { key: "integrations", label: "Integrationen", description: "APIs und Import", icon: Activity },
      { key: "billing", label: "Abrechnung", description: "Plan und Rechnungen", icon: Euro }
    ]
  }
];

const moduleByKey = moduleNavigation.reduce(
  (items, item) => ({ ...items, [item.key]: item }),
  {} as Record<PageKey, ModuleNavItem>
);

const initialSubItems = moduleNavigation.reduce(
  (items, item) => ({ ...items, [item.key]: item.subItems[0]?.key ?? "dashboard" }),
  {} as Record<PageKey, string>
);

const initialProjects: SiteProject[] = [
  {
    id: "p1",
    name: "Semmering Basistunnel",
    client: "ÖBB Infrastruktur",
    location: "Mürzzuschlag",
    status: "Aktiv",
    progress: 68,
    due: "18. Aug 2026",
    manager: "Mario Juric",
    team: 9,
    budget: "218.400 EUR"
  },
  {
    id: "p2",
    name: "Ladeinfrastruktur Zentrale",
    client: "eww Gruppe",
    location: "Wels",
    status: "Planung",
    progress: 42,
    due: "30. Sep 2026",
    manager: "Manfred Hammer",
    team: 5,
    budget: "74.900 EUR"
  },
  {
    id: "p3",
    name: "Smart Meter Rollout",
    client: "Gemeinde Attnang",
    location: "Attnang",
    status: "Abnahme",
    progress: 91,
    due: "15. Jul 2026",
    manager: "Anna Hofer",
    team: 12,
    budget: "211.000 EUR"
  }
];

const initialDefects: SiteDefect[] = [
  {
    id: "M-1042",
    projectId: "p1",
    progressItemId: "pr-4",
    progressPath: ["Elektroinstallation Tunnelabschnitt Nord", "Kabeltrassen Ebene 2", "Abschnitt B - Querverbindung", "Befestigungspunkte prüfen"],
    title: "Kabeltrasse Abschnitt B dokumentieren",
    description: "Befestigungspunkte und Fotobelege fehlen für die Abnahme.",
    owner: "Ivan Kovac",
    priority: "Hoch",
    status: "Offen",
    createdAt: "Heute"
  },
  {
    id: "M-1038",
    projectId: "p3",
    progressItemId: "pr-17",
    progressPath: ["Abnahme Smart Meter", "Fotobelege", "Zählerschrank Reihe 4", "Foto der finalen Montage aufnehmen"],
    title: "Foto der finalen Montage fehlt",
    description: "Finales Foto muss vor der Übergabe nachgereicht werden.",
    owner: "Marko Petrovic",
    priority: "Mittel",
    status: "In Arbeit",
    createdAt: "Gestern"
  },
  {
    id: "M-1027",
    projectId: "p2",
    title: "Abnahmeprotokoll unterschreiben",
    description: "Unterschrift der Projektleitung fehlt im Protokoll.",
    owner: "Anna Hofer",
    priority: "Mittel",
    status: "Offen",
    createdAt: "Montag"
  }
];

const initialTasks: SiteTask[] = [
  { id: "T-501", projectId: "p1", title: "Wochenbericht an Projektleitung senden", owner: "Mario Juric", due: "Heute", done: false },
  { id: "T-502", projectId: "p2", title: "Materialfreigabe mit Einkauf klären", owner: "Manfred Hammer", due: "Morgen", done: false },
  { id: "T-503", projectId: "p3", title: "Abnahmefotos prüfen", owner: "Anna Hofer", due: "Fr, 03.07.", done: true }
];

const initialNotes: SiteNote[] = [
  { id: "N-1", projectId: "p1", text: "Kabelweg in Ebene 2 mit Bauleitung abgestimmt.", time: "Heute, 09:15", pinned: true },
  { id: "N-2", projectId: "p2", text: "Liefertermin Wallboxen muss bestätigt werden.", time: "Gestern, 16:30", pinned: false }
];

const initialDocuments: SiteDocument[] = [
  { id: "D-1", projectId: "p1", name: "Fotodokumentation KW27", kind: "Foto", status: "Freigegeben", updated: "Heute" },
  { id: "D-2", projectId: "p2", name: "Montageplan Ladepunkte", kind: "Plan", status: "Prüfung", updated: "Gestern" },
  { id: "D-3", projectId: "p3", name: "Abnahmeprotokoll", kind: "Protokoll", status: "Entwurf", updated: "Montag" }
];

const initialReports: SiteReport[] = [
  { id: "R-1", name: "Site Wochenbericht", target: "Projektleitung", status: "Bereit", time: "Heute" },
  { id: "R-2", name: "Mängelbericht", target: "Bauherr", status: "Entwurf", time: "Gestern" }
];

const progressTypeCopy: Record<ProgressNodeType, { child?: ProgressNodeType; createLabel: string; label: string }> = {
  area: { child: "section", createLabel: "Unterpunkt", label: "Bereich" },
  section: { child: "subsection", createLabel: "Unter-Unterpunkt", label: "Unterpunkt" },
  subsection: { child: "task", createLabel: "Aufgabe", label: "Unter-Unterpunkt" },
  task: { createLabel: "Aufgabe", label: "Punkt / Aufgabe" }
};

const initialProgressItems: ProgressNode[] = [
  {
    id: "pr-1",
    projectId: "p1",
    parentId: null,
    type: "area",
    title: "Elektroinstallation Tunnelabschnitt Nord",
    description: "Gesamtbereich für Kabelwege, Verteiler und Erstprüfung.",
    status: "In Arbeit",
    assignees: ["Ivan Kovac"],
    attachments: []
  },
  {
    id: "pr-2",
    projectId: "p1",
    parentId: "pr-1",
    type: "section",
    title: "Kabeltrassen Ebene 2",
    description: "Montage und Dokumentation der Trassen im Technikbereich.",
    status: "In Arbeit",
    assignees: ["Ivan Kovac", "Marko Petrovic"],
    attachments: []
  },
  {
    id: "pr-3",
    projectId: "p1",
    parentId: "pr-2",
    type: "subsection",
    title: "Abschnitt B - Querverbindung",
    description: "Abstimmung mit Bauleitung und Fotodokumentation erforderlich.",
    status: "Offen",
    assignees: ["Marko Petrovic"],
    attachments: []
  },
  {
    id: "pr-4",
    projectId: "p1",
    parentId: "pr-3",
    type: "task",
    title: "Befestigungspunkte prüfen",
    description: "Alle Konsolen auf festen Sitz prüfen und Abweichungen dokumentieren.",
    status: "Offen",
    done: false,
    assignees: ["Marko Petrovic"],
    attachments: [{ id: "pa-1", kind: "Foto", name: "Referenzfoto Abschnitt B.jpg", time: "Heute" }]
  },
  {
    id: "pr-5",
    projectId: "p1",
    parentId: "pr-3",
    type: "task",
    title: "Fotodokumentation hochladen",
    description: "Aktuelle Fotos aus der Begehung einfügen.",
    status: "Erledigt",
    done: true,
    assignees: ["Ivan Kovac"],
    attachments: []
  },
  {
    id: "pr-18",
    projectId: "p1",
    parentId: "pr-3",
    type: "task",
    title: "Kabelbefestigung montieren",
    description: "Montagepunkte laut Ausführungsplan befestigen und prüfen.",
    status: "In Arbeit",
    done: false,
    assignees: ["Ivan Kovac"],
    attachments: [{ id: "pa-2", kind: "Datei", name: "Montageplan Ebene 2.pdf", time: "Gestern" }]
  },
  {
    id: "pr-19",
    projectId: "p1",
    parentId: "pr-3",
    type: "task",
    title: "Kabelverlegung prüfen",
    description: "Kabelwege auf Knickstellen und Mindestabstände kontrollieren.",
    status: "Offen",
    done: false,
    assignees: ["Marko Petrovic"],
    attachments: []
  },
  {
    id: "pr-20",
    projectId: "p1",
    parentId: "pr-3",
    type: "task",
    title: "Kennzeichnung anbringen",
    description: "Trassenkennzeichnung an den definierten Punkten anbringen.",
    status: "Offen",
    done: false,
    assignees: ["Ivan Kovac"],
    attachments: []
  },
  {
    id: "pr-21",
    projectId: "p1",
    parentId: "pr-3",
    type: "task",
    title: "Durchgangsöffnung abdichten",
    description: "Brandschutzmanschette setzen und Foto für Dokumentation speichern.",
    status: "Offen",
    done: false,
    assignees: ["Luka Grbic"],
    attachments: [{ id: "pa-3", kind: "Foto", name: "Durchgang vor Abdichtung.jpg", time: "Heute" }]
  },
  {
    id: "pr-22",
    projectId: "p1",
    parentId: "pr-3",
    type: "task",
    title: "Erdungskabel anschließen",
    description: "Erdungsanschluss herstellen und Durchgangsmessung dokumentieren.",
    status: "In Arbeit",
    done: false,
    assignees: ["Mario Juric"],
    attachments: [{ id: "pa-4", kind: "Datei", name: "Messprotokoll Vorlage.pdf", time: "Heute" }]
  },
  {
    id: "pr-6",
    projectId: "p1",
    parentId: null,
    type: "area",
    title: "Dokumentation und Abnahme",
    description: "Prüfprotokolle, Nachweise und Übergabeunterlagen.",
    status: "Offen",
    assignees: ["Mario Juric"],
    attachments: []
  },
  {
    id: "pr-7",
    projectId: "p1",
    parentId: "pr-6",
    type: "section",
    title: "Wochenbericht KW27",
    description: "Bericht mit Status, Fotos und offenen Punkten vorbereiten.",
    status: "Offen",
    assignees: ["Mario Juric"],
    attachments: []
  },
  {
    id: "pr-8",
    projectId: "p1",
    parentId: "pr-7",
    type: "subsection",
    title: "Offene Nachweise",
    description: "Noch fehlende Nachweise aus Montage und Prüfung.",
    status: "Offen",
    assignees: [],
    attachments: []
  },
  {
    id: "pr-9",
    projectId: "p1",
    parentId: "pr-8",
    type: "task",
    title: "Prüfprotokoll Verteiler E2 anhängen",
    description: "PDF aus der Erstprüfung als Datei anhängen.",
    status: "Offen",
    done: false,
    assignees: ["Ivan Kovac"],
    attachments: []
  },
  {
    id: "pr-10",
    projectId: "p2",
    parentId: null,
    type: "area",
    title: "Ladepunkte Bestand",
    description: "Aufnahme, Planung und Freigabe der Ladepunkte.",
    status: "In Arbeit",
    assignees: ["Manfred Hammer"],
    attachments: []
  },
  {
    id: "pr-11",
    projectId: "p2",
    parentId: "pr-10",
    type: "section",
    title: "Parkdeck Ebene 1",
    description: "Positionierung und Leitungsführung prüfen.",
    status: "Offen",
    assignees: ["Anna Hofer"],
    attachments: []
  },
  {
    id: "pr-12",
    projectId: "p2",
    parentId: "pr-11",
    type: "subsection",
    title: "Wandmontage",
    description: "Bohrbild und Untergrund abstimmen.",
    status: "Offen",
    assignees: [],
    attachments: []
  },
  {
    id: "pr-13",
    projectId: "p2",
    parentId: "pr-12",
    type: "task",
    title: "Materialliste bestätigen",
    description: "Liste mit Einkauf und Montage abgleichen.",
    status: "Offen",
    done: false,
    assignees: ["Manfred Hammer"],
    attachments: []
  },
  {
    id: "pr-14",
    projectId: "p3",
    parentId: null,
    type: "area",
    title: "Abnahme Smart Meter",
    description: "Finale Kontrolle und Übergabe an Gemeinde.",
    status: "In Arbeit",
    assignees: ["Anna Hofer"],
    attachments: []
  },
  {
    id: "pr-15",
    projectId: "p3",
    parentId: "pr-14",
    type: "section",
    title: "Fotobelege",
    description: "Fotos vor Ort sammeln und prüfen.",
    status: "In Arbeit",
    assignees: ["Marko Petrovic"],
    attachments: []
  },
  {
    id: "pr-16",
    projectId: "p3",
    parentId: "pr-15",
    type: "subsection",
    title: "Zählerschrank Reihe 4",
    description: "Fehlende Fotobelege nachreichen.",
    status: "Offen",
    assignees: ["Marko Petrovic"],
    attachments: []
  },
  {
    id: "pr-17",
    projectId: "p3",
    parentId: "pr-16",
    type: "task",
    title: "Foto der finalen Montage aufnehmen",
    description: "Foto direkt mit der mobilen Kamera aufnehmen und ablegen.",
    status: "Offen",
    done: false,
    assignees: ["Marko Petrovic"],
    attachments: []
  }
];

const initialExpandedProgressIds = initialProgressItems.reduce(
  (items, item) => ({ ...items, [item.id]: item.type !== "task" }),
  {} as Record<string, boolean>
);

function getProgressPathNodes(itemId: string | undefined, items: ProgressNode[]) {
  if (!itemId) {
    return [];
  }

  const nodes: ProgressNode[] = [];
  let cursor = items.find((item) => item.id === itemId);

  while (cursor) {
    nodes.unshift(cursor);
    cursor = cursor.parentId ? items.find((item) => item.id === cursor?.parentId) : undefined;
  }

  return nodes;
}

function getProgressPathLabel(itemId: string | undefined, items: ProgressNode[], fallback?: string[]) {
  const livePath = getProgressPathNodes(itemId, items).map((item) => item.title);
  const path = livePath.length ? livePath : fallback ?? [];
  return path.length ? path.join(" > ") : "Kein Open Point verknüpft";
}

function collectProgressBranchIds(itemId: string, items: ProgressNode[]) {
  const ids = new Set<string>([itemId]);
  let changed = true;

  while (changed) {
    changed = false;
    items.forEach((item) => {
      if (item.parentId && ids.has(item.parentId) && !ids.has(item.id)) {
        ids.add(item.id);
        changed = true;
      }
    });
  }

  return ids;
}

type AppShellProps = {
  autoOpenFirstProject?: boolean;
  initialClientId?: string;
  initialPage?: PageKey;
  initialSiteTab?: SiteTab;
};

export function AppShell({
  autoOpenFirstProject = false,
  initialClientId,
  initialPage = "site",
  initialSiteTab = "dashboard"
}: AppShellProps = {}) {
  const [page, setPage] = useState<PageKey>(initialPage);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuMode, setMenuMode] = useState<"platform" | "module">("module");
  const [siteSidebarMode, setSiteSidebarMode] = useState<"menu" | "progress">(initialSiteTab === "progress" ? "progress" : "menu");
  const [query, setQuery] = useState("");
  const [activeSubItems, setActiveSubItems] = useState<Record<PageKey, string>>({
    ...initialSubItems,
    site: initialSiteTab
  });
  const [projects, setProjects] = useState<SiteProject[]>(initialProjects);
  const [defects, setDefects] = useState<SiteDefect[]>(initialDefects);
  const [tasks, setTasks] = useState<SiteTask[]>(initialTasks);
  const [notes, setNotes] = useState<SiteNote[]>(initialNotes);
  const [documents, setDocuments] = useState<SiteDocument[]>(initialDocuments);
  const [reports, setReports] = useState<SiteReport[]>(initialReports);
  const [progressItems, setProgressItems] = useState<ProgressNode[]>(initialProgressItems);
  const [expandedProgressIds, setExpandedProgressIds] = useState<Record<string, boolean>>(initialExpandedProgressIds);
  const [progressQuery, setProgressQuery] = useState("");
  const [progressEditorId, setProgressEditorId] = useState<string | null>(null);
  const [copiedProgressItemId, setCopiedProgressItemId] = useState<string | null>(null);
  const [selectedProgressAreaId, setSelectedProgressAreaId] = useState("");
  const [selectedProgressSectionId, setSelectedProgressSectionId] = useState("");
  const [selectedProgressSubsectionId, setSelectedProgressSubsectionId] = useState("");
  const [attachmentPreview, setAttachmentPreview] = useState<ProgressAttachment | null>(null);
  const [defectDraft, setDefectDraft] = useState<DefectDraft | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    initialPage === "site" && autoOpenFirstProject ? initialProjects[0]?.id ?? null : null
  );
  const [projectDeleteCandidateId, setProjectDeleteCandidateId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [modal, setModal] = useState<"project" | "defect" | "task" | "report" | null>(null);
  const [toast, setToast] = useState(initialClientId ? `Client ${initialClientId} geladen.` : "SiteManager bereit.");
  const [siteSettings, setSiteSettings] = useState({
    photoRequired: true,
    autoReports: true,
    customerPortal: false,
    defectApproval: true
  });

  const activeModule = moduleByKey[page];
  const activeMenuItems = activeModule.subItems;
  const activeSubKey = activeSubItems[page] ?? activeMenuItems[0]?.key;
  const activeSubItem = activeMenuItems.find((item) => item.key === activeSubKey) ?? activeMenuItems[0];
  const selectedProject = selectedProjectId ? projects.find((project) => project.id === selectedProjectId) ?? projects[0] : projects[0];
  const projectDeleteCandidate = projectDeleteCandidateId ? projects.find((project) => project.id === projectDeleteCandidateId) : undefined;
  const headerSubItem =
    page === "site" && !selectedProjectId
      ? { key: "project-selection", label: "Projektauswahl", description: "Projektkontext wählen", icon: FolderKanban }
      : activeSubItem;
  const selectedProgressItem = progressEditorId ? progressItems.find((item) => item.id === progressEditorId) : undefined;
  const siteUsers = demoPeople.map((person) => person.name);

  function selectModule(nextPage: PageKey) {
    setPage(nextPage);
    setMenuMode("module");
    if (nextPage === "site") {
      setSelectedProjectId(null);
      setActiveSubItems((current) => ({ ...current, site: "dashboard" }));
      setSiteSidebarMode("menu");
    }
    setMobileOpen(false);
  }

  function selectSubItem(key: string) {
    if (page === "site" && !selectedProjectId) {
      setToast("Bitte zuerst ein Projekt auswählen.");
      return;
    }
    setActiveSubItems((current) => ({ ...current, [page]: key }));
    if (page === "site") {
      setSiteSidebarMode(key === "progress" ? "progress" : "menu");
    }
    setMenuMode("module");
    setMobileOpen(false);
  }

  function openSiteProject(projectId: string, tab: SiteTab = "dashboard") {
    const project = projects.find((item) => item.id === projectId);
    setSelectedProjectId(projectId);
    setPage("site");
    setActiveSubItems((current) => ({ ...current, site: tab }));
    setSiteSidebarMode(tab === "progress" ? "progress" : "menu");
    setMenuMode("module");
    setMobileOpen(false);
    setToast(`${project?.name ?? "Projekt"} geöffnet.`);
  }

  function showSiteProjectSelection() {
    setSelectedProjectId(null);
    setPage("site");
    setActiveSubItems((current) => ({ ...current, site: "dashboard" }));
    setSiteSidebarMode("menu");
    setMenuMode("module");
    setMobileOpen(false);
  }

  function goToSite(tab: SiteTab) {
    if (!selectedProjectId && projects[0]) {
      setSelectedProjectId(projects[0].id);
    }
    setPage("site");
    setActiveSubItems((current) => ({ ...current, site: tab }));
    setSiteSidebarMode(tab === "progress" ? "progress" : "menu");
    setMenuMode("module");
  }

  function handlePrimaryAction() {
    if (page === "site") {
      setModal("project");
    } else {
      setToast(`${activeModule.label} ist vorgemerkt.`);
    }
  }

  function addProject() {
    const nextProject: SiteProject = {
      id: `p-${Date.now()}`,
      name: `Neues Projekt ${projects.length + 1}`,
      client: workspace.name,
      location: "Wels",
      status: "Planung",
      progress: 5,
      due: "31. Okt 2026",
      manager: "Mario Juric",
      team: 3,
      budget: "0 EUR"
    };
    setProjects((current) => [nextProject, ...current]);
    setSelectedProjectId(nextProject.id);
    setActiveSubItems((current) => ({ ...current, site: "dashboard" }));
    setPage("site");
    setSiteSidebarMode("menu");
    setMenuMode("module");
    setModal(null);
    setToast("Projekt wurde angelegt.");
  }

  function deleteSiteProject(projectId: string) {
    const project = projects.find((item) => item.id === projectId);
    if (!project) {
      return;
    }

    if (projects.length <= 1) {
      setToast("Mindestens ein Projekt muss bestehen bleiben.");
      return;
    }

    setProjectDeleteCandidateId(projectId);
  }

  function confirmDeleteSiteProject() {
    if (!projectDeleteCandidateId) {
      return;
    }

    const project = projects.find((item) => item.id === projectDeleteCandidateId);
    if (!project) {
      setProjectDeleteCandidateId(null);
      return;
    }

    const removedProgressIds = new Set(progressItems.filter((item) => item.projectId === projectDeleteCandidateId).map((item) => item.id));

    setProjects((current) => current.filter((item) => item.id !== projectDeleteCandidateId));
    setDefects((current) => current.filter((item) => item.projectId !== projectDeleteCandidateId));
    setTasks((current) => current.filter((item) => item.projectId !== projectDeleteCandidateId));
    setNotes((current) => current.filter((item) => item.projectId !== projectDeleteCandidateId));
    setDocuments((current) => current.filter((item) => item.projectId !== projectDeleteCandidateId));
    setProgressItems((current) => current.filter((item) => item.projectId !== projectDeleteCandidateId));
    setExpandedProgressIds((current) =>
      Object.fromEntries(Object.entries(current).filter(([itemId]) => !removedProgressIds.has(itemId)))
    );

    if (selectedProjectId === projectDeleteCandidateId) {
      setSelectedProjectId(null);
      setActiveSubItems((current) => ({ ...current, site: "dashboard" }));
      setSiteSidebarMode("menu");
    }

    setProjectDeleteCandidateId(null);
    setToast(`Projekt "${project.name}" wurde gelöscht.`);
  }

  function addDefect() {
    if (!selectedProject) {
      setToast("Bitte zuerst ein Projekt auswählen.");
      return;
    }
    const nextDefect: SiteDefect = {
      id: `M-${1043 + defects.length}`,
      projectId: selectedProject.id,
      title: "Neuer Mangel aus Begehung",
      description: "Neuer Mangel wurde manuell aufgenommen.",
      owner: "Mario Juric",
      priority: "Mittel",
      status: "Offen",
      createdAt: "Jetzt"
    };
    setDefects((current) => [nextDefect, ...current]);
    setModal(null);
    goToSite("defects");
    setToast("Mangel wurde aufgenommen.");
  }

  function addTask() {
    if (!selectedProject) {
      setToast("Bitte zuerst ein Projekt auswählen.");
      return;
    }
    const nextTask: SiteTask = {
      id: `T-${504 + tasks.length}`,
      projectId: selectedProject.id,
      title: "Neue Baustellenaufgabe",
      owner: "Mario Juric",
      due: "Heute",
      done: false
    };
    setTasks((current) => [nextTask, ...current]);
    setModal(null);
    goToSite("tasks");
    setToast("Aufgabe wurde erstellt.");
  }

  function generateReport() {
    if (!selectedProject) {
      setToast("Bitte zuerst ein Projekt auswählen.");
      return;
    }
    const nextReport: SiteReport = {
      id: `R-${reports.length + 1}`,
      name: `${selectedProject.name} Statusbericht`,
      target: "Projektleitung",
      status: "Bereit",
      time: "Jetzt"
    };
    setReports((current) => [nextReport, ...current]);
    setModal(null);
    goToSite("reports");
    setToast("Bericht wurde generiert.");
  }

  function updateProgress(projectId: string, delta: number) {
    setProjects((current) =>
      current.map((project) =>
        project.id === projectId ? { ...project, progress: Math.max(0, Math.min(100, project.progress + delta)) } : project
      )
    );
    setToast("Open Points aktualisiert.");
  }

  function addProgressItem(parentId: string | null) {
    if (!selectedProject) {
      setToast("Bitte zuerst ein Projekt auswählen.");
      return;
    }

    const parent = parentId ? progressItems.find((item) => item.id === parentId) : undefined;
    const type = parent ? progressTypeCopy[parent.type].child : "area";

    if (!type) {
      setToast("Unter Aufgaben können keine weiteren Ebenen angelegt werden.");
      return;
    }

    const nextItem: ProgressNode = {
      id: `pr-${Date.now()}-${progressItems.length + 1}`,
      projectId: selectedProject.id,
      parentId,
      type,
      title: `Neuer ${progressTypeCopy[type].label}`,
      description: "",
      status: type === "task" ? "Offen" : "In Arbeit",
      done: type === "task" ? false : undefined,
      assignees: [],
      attachments: []
    };

    setProgressItems((current) => [...current, nextItem]);
    if (parentId) {
      setExpandedProgressIds((current) => ({ ...current, [parentId]: true }));
    }
    if (type === "area") {
      setSelectedProgressAreaId(nextItem.id);
      setSelectedProgressSectionId("");
      setSelectedProgressSubsectionId("");
    }
    if (type === "section") {
      setSelectedProgressSectionId(nextItem.id);
      setSelectedProgressSubsectionId("");
    }
    if (type === "subsection") {
      setSelectedProgressSubsectionId(nextItem.id);
    }
    setProgressEditorId(nextItem.id);
    setToast(`${progressTypeCopy[type].label} wurde angelegt.`);
  }

  function addProgressSidebarItem(parentId: string | null, title: string) {
    if (!selectedProject) {
      setToast("Bitte zuerst ein Projekt auswählen.");
      return;
    }

    const parent = parentId ? progressItems.find((item) => item.id === parentId) : undefined;
    const type = parent ? progressTypeCopy[parent.type].child : "area";

    if (!type || type === "task") {
      setToast("Diese Ebene wird direkt in der Punkteliste erstellt.");
      return;
    }

    const nextItem: ProgressNode = {
      id: `pr-${Date.now()}-${progressItems.length + 1}`,
      projectId: selectedProject.id,
      parentId,
      type,
      title,
      description: "",
      status: "In Arbeit",
      assignees: [],
      attachments: []
    };

    setProgressItems((current) => [...current, nextItem]);
    if (parentId) {
      setExpandedProgressIds((current) => ({ ...current, [parentId]: true }));
    }
    if (type === "area") {
      setSelectedProgressAreaId(nextItem.id);
      setSelectedProgressSectionId("");
      setSelectedProgressSubsectionId("");
    }
    if (type === "section") {
      setSelectedProgressSectionId(nextItem.id);
      setSelectedProgressSubsectionId("");
    }
    if (type === "subsection") {
      setSelectedProgressSubsectionId(nextItem.id);
    }
    setToast(`${progressTypeCopy[type].label} wurde angelegt.`);
  }

  function updateProgressItem(itemId: string, updates: Partial<ProgressNode>) {
    setProgressItems((current) => current.map((item) => (item.id === itemId ? { ...item, ...updates } : item)));
  }

  function toggleProgressExpanded(itemId: string) {
    setExpandedProgressIds((current) => ({ ...current, [itemId]: !current[itemId] }));
  }

  function toggleProgressDone(itemId: string) {
    setProgressItems((current) =>
      current.map((item) =>
        item.id === itemId
          ? { ...item, done: !item.done, status: item.done ? "Offen" : "Erledigt" }
          : item
      )
    );
    setToast("Aufgabenstatus aktualisiert.");
  }

  function toggleProgressAssignee(itemId: string, userName: string) {
    setProgressItems((current) =>
      current.map((item) => {
        if (item.id !== itemId) {
          return item;
        }
        const assigned = item.assignees.includes(userName);
        return {
          ...item,
          assignees: assigned ? item.assignees.filter((name) => name !== userName) : [...item.assignees, userName]
        };
      })
    );
    setToast("Zuweisung gespeichert.");
  }

  function addProgressAttachments(itemId: string, kind: ProgressAttachment["kind"], files: FileList | null) {
    if (!files?.length) {
      setToast("Keine Datei ausgewählt.");
      return;
    }

    const nextAttachments = Array.from(files).map((file, index) => ({
      id: `pa-${Date.now()}-${index}`,
      kind,
      mimeType: file.type,
      name: file.name,
      time: "Jetzt",
      url: URL.createObjectURL(file)
    }));

    setProgressItems((current) =>
      current.map((item) =>
        item.id === itemId ? { ...item, attachments: [...nextAttachments, ...item.attachments] } : item
      )
    );
    setToast(kind === "Foto" ? "Foto wurde hinzugefügt." : "Datei wurde hinzugefügt.");
  }

  function openDefectEditorFromProgressItem(itemId: string) {
    const progressItem = progressItems.find((item) => item.id === itemId);
    if (!progressItem || !selectedProject) {
      setToast("Der Eintrag konnte nicht gefunden werden.");
      return;
    }

    const existingDefect = defects.find((defect) => defect.progressItemId === itemId && defect.status !== "Erledigt");

    setDefectDraft({
      id: existingDefect?.id,
      progressItemId: itemId,
      title: existingDefect?.title ?? `Mangel: ${progressItem.title}`,
      description: existingDefect?.description ?? progressItem.description,
      owner: existingDefect?.owner ?? progressItem.assignees[0] ?? "Mario Juric",
      priority: existingDefect?.priority ?? "Mittel",
      status: existingDefect?.status ?? "Offen",
      attachments: existingDefect?.attachments ?? []
    });
  }

  function addDefectDraftAttachments(kind: ProgressAttachment["kind"], files: FileList | null) {
    if (!files?.length) {
      setToast("Keine Datei ausgewählt.");
      return;
    }

    const nextAttachments = Array.from(files).map((file, index) => ({
      id: `da-${Date.now()}-${index}`,
      kind,
      mimeType: file.type,
      name: file.name,
      time: "Jetzt",
      url: URL.createObjectURL(file)
    }));

    setDefectDraft((current) =>
      current ? { ...current, attachments: [...nextAttachments, ...current.attachments] } : current
    );
    setToast(kind === "Foto" ? "Mangelfoto wurde hinzugefügt." : "Mangeldatei wurde hinzugefügt.");
  }

  function saveDefectDraft() {
    if (!defectDraft || !selectedProject) {
      return;
    }

    const title = defectDraft.title.trim();
    if (!title) {
      setToast("Bitte einen Mangeltitel eingeben.");
      return;
    }

    const progressItem = progressItems.find((item) => item.id === defectDraft.progressItemId);

    if (defectDraft.id) {
      setDefects((current) =>
        current.map((defect) =>
          defect.id === defectDraft.id
            ? {
                ...defect,
                title,
                description: defectDraft.description.trim(),
                owner: defectDraft.owner,
                priority: defectDraft.priority,
                status: defectDraft.status,
                attachments: defectDraft.attachments
              }
            : defect
        )
      );
      setDefectDraft(null);
      setToast("Mangel wurde aktualisiert.");
      return;
    }

    const nextDefect: SiteDefect = {
      id: `M-${1043 + defects.length}`,
      projectId: selectedProject.id,
      progressItemId: defectDraft.progressItemId,
      progressPath: getProgressPathNodes(defectDraft.progressItemId, progressItems).map((item) => item.title),
      title,
      description: defectDraft.description.trim(),
      owner: defectDraft.owner,
      priority: defectDraft.priority,
      status: defectDraft.status,
      createdAt: "Jetzt",
      attachments: defectDraft.attachments
    };

    setDefects((current) => [nextDefect, ...current]);
    setDefectDraft(null);
    setToast(`Mangel wurde${progressItem ? ` mit "${progressItem.title}"` : ""} verknüpft.`);
  }

  function deleteProgressItem(itemId: string) {
    const item = progressItems.find((progressItem) => progressItem.id === itemId);
    if (!item) {
      setToast("Der Eintrag konnte nicht gefunden werden.");
      return;
    }

    const branchIds = collectProgressBranchIds(itemId, progressItems);
    const suffix = branchIds.size > 1 ? ` und ${branchIds.size - 1} Untereinträge` : "";
    const confirmed = window.confirm(`Soll "${item.title}"${suffix} wirklich gelöscht werden?`);

    if (!confirmed) {
      return;
    }

    setProgressItems((current) => current.filter((progressItem) => !branchIds.has(progressItem.id)));
    setExpandedProgressIds((current) =>
      Object.fromEntries(Object.entries(current).filter(([id]) => !branchIds.has(id)))
    );
    setProgressEditorId(null);
    setToast("Open Point wurde gelöscht.");
  }

  function copyProgressItem(itemId: string) {
    const item = progressItems.find((progressItem) => progressItem.id === itemId);
    if (!item) {
      setToast("Der Eintrag konnte nicht gefunden werden.");
      return;
    }

    setCopiedProgressItemId(itemId);
    const copyText = getProgressPathLabel(itemId, progressItems);
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      setToast(`Kopiert: ${item.title}`);
      return;
    }

    navigator.clipboard
      .writeText(copyText)
      .then(() => setToast("Open Point wurde kopiert."))
      .catch(() => setToast(`Kopiert: ${item.title}`));
  }

  function duplicateProgressItem(itemId: string) {
    const item = progressItems.find((progressItem) => progressItem.id === itemId);
    if (!item) {
      setToast("Der Eintrag konnte nicht gefunden werden.");
      return;
    }

    const branchIds = collectProgressBranchIds(itemId, progressItems);
    const branchItems = progressItems.filter((progressItem) => branchIds.has(progressItem.id));
    const stamp = Date.now();
    const idMap = new Map(branchItems.map((progressItem, index) => [progressItem.id, `pr-${stamp}-${index}`]));
    const duplicatedItems = branchItems.map((progressItem, index) => ({
      ...progressItem,
      id: idMap.get(progressItem.id) ?? `pr-${stamp}-${index}`,
      parentId: progressItem.parentId && idMap.has(progressItem.parentId) ? idMap.get(progressItem.parentId) ?? progressItem.parentId : progressItem.parentId,
      title: progressItem.id === itemId ? `${progressItem.title} Kopie` : progressItem.title,
      attachments: progressItem.attachments.map((attachment, attachmentIndex) => ({
        ...attachment,
        id: `pa-${stamp}-${index}-${attachmentIndex}`
      }))
    }));
    const duplicatedRoot = duplicatedItems.find((progressItem) => progressItem.id === idMap.get(itemId));

    setProgressItems((current) => [...current, ...duplicatedItems]);
    setExpandedProgressIds((current) => {
      const next = { ...current };
      if (item.parentId) {
        next[item.parentId] = true;
      }
      duplicatedItems.forEach((progressItem) => {
        if (progressItem.type !== "task") {
          next[progressItem.id] = true;
        }
      });
      return next;
    });

    const originalPath = getProgressPathNodes(itemId, progressItems);
    const area = originalPath.find((node) => node.type === "area");
    const section = originalPath.find((node) => node.type === "section");
    const subsection = originalPath.find((node) => node.type === "subsection");
    setSelectedProgressAreaId(area ? idMap.get(area.id) ?? area.id : "");
    setSelectedProgressSectionId(section ? idMap.get(section.id) ?? section.id : "");
    setSelectedProgressSubsectionId(subsection ? idMap.get(subsection.id) ?? subsection.id : "");
    setToast(`${duplicatedRoot?.title ?? item.title} wurde dupliziert.`);
  }

  function pasteProgressItem(targetId: string) {
    if (!copiedProgressItemId) {
      setToast("Bitte zuerst einen Open Point kopieren.");
      return;
    }

    const source = progressItems.find((progressItem) => progressItem.id === copiedProgressItemId);
    const target = progressItems.find((progressItem) => progressItem.id === targetId);
    if (!source || !target) {
      setToast("Der kopierte Open Point konnte nicht eingefügt werden.");
      return;
    }

    function canUseParent(parentId: string | null, type: ProgressNodeType) {
      if (parentId === null) {
        return type === "area";
      }
      const parent = progressItems.find((progressItem) => progressItem.id === parentId);
      return parent ? progressTypeCopy[parent.type].child === type : false;
    }

    const targetPath = getProgressPathNodes(targetId, progressItems);
    const parentCandidates = [
      target.id,
      target.parentId,
      ...targetPath.map((node) => node.parentId),
      null
    ];
    const pasteParentId = parentCandidates.find((parentId) => canUseParent(parentId, source.type));

    if (pasteParentId === undefined) {
      setToast("An dieser Stelle kann dieser Open Point nicht eingefügt werden.");
      return;
    }

    const branchIds = collectProgressBranchIds(source.id, progressItems);
    const branchItems = progressItems.filter((progressItem) => branchIds.has(progressItem.id));
    const stamp = Date.now();
    const idMap = new Map(branchItems.map((progressItem, index) => [progressItem.id, `pr-${stamp}-paste-${index}`]));
    const pastedItems = branchItems.map((progressItem, index) => ({
      ...progressItem,
      id: idMap.get(progressItem.id) ?? `pr-${stamp}-paste-${index}`,
      parentId:
        progressItem.id === source.id
          ? pasteParentId
          : progressItem.parentId && idMap.has(progressItem.parentId)
            ? idMap.get(progressItem.parentId) ?? progressItem.parentId
            : progressItem.parentId,
      title: progressItem.id === source.id ? `${progressItem.title} Kopie` : progressItem.title,
      attachments: progressItem.attachments.map((attachment, attachmentIndex) => ({
        ...attachment,
        id: `pa-${stamp}-paste-${index}-${attachmentIndex}`
      }))
    }));

    setProgressItems((current) => [...current, ...pastedItems]);
    setExpandedProgressIds((current) => {
      const next = { ...current };
      if (pasteParentId) {
        next[pasteParentId] = true;
      }
      pastedItems.forEach((progressItem) => {
        if (progressItem.type !== "task") {
          next[progressItem.id] = true;
        }
      });
      return next;
    });

    const pastedRootId = idMap.get(source.id);
    const pastedPath = getProgressPathNodes(pastedRootId, [...progressItems, ...pastedItems]);
    const area = pastedPath.find((node) => node.type === "area");
    const section = pastedPath.find((node) => node.type === "section");
    const subsection = pastedPath.find((node) => node.type === "subsection");
    setSelectedProgressAreaId(area?.id ?? "");
    setSelectedProgressSectionId(section?.id ?? "");
    setSelectedProgressSubsectionId(subsection?.id ?? "");
    setToast("Open Point wurde eingefügt.");
  }

  function toggleTask(taskId: string) {
    setTasks((current) => current.map((task) => (task.id === taskId ? { ...task, done: !task.done } : task)));
    setToast("Aufgabe aktualisiert.");
  }

  function toggleDefect(defectId: string) {
    setDefects((current) =>
      current.map((defect) =>
        defect.id === defectId ? { ...defect, status: defect.status === "Erledigt" ? "Offen" : "Erledigt" } : defect
      )
    );
    setToast("Mangelstatus aktualisiert.");
  }

  function addNote() {
    const text = noteDraft.trim();
    if (!text) {
      setToast("Bitte eine Notiz eingeben.");
      return;
    }
    if (!selectedProject) {
      setToast("Bitte zuerst ein Projekt auswählen.");
      return;
    }
    setNotes((current) => [
      { id: `N-${current.length + 1}`, projectId: selectedProject.id, text, time: "Jetzt", pinned: false },
      ...current
    ]);
    setNoteDraft("");
    setToast("Notiz gespeichert.");
  }

  function addDocument(kind: SiteDocument["kind"]) {
    if (!selectedProject) {
      setToast("Bitte zuerst ein Projekt auswählen.");
      return;
    }
    setDocuments((current) => [
      {
        id: `D-${current.length + 1}`,
        projectId: selectedProject.id,
        name: kind === "Foto" ? "Neues Baustellenfoto" : "Neues Dokument",
        kind,
        status: "Entwurf",
        updated: "Jetzt"
      },
      ...current
    ]);
    setToast(`${kind} wurde hinzugefügt.`);
  }

  const selectedProjectProgressItems = progressItems.filter((item) => item.projectId === selectedProject.id);
  const progressChildrenByParent = selectedProjectProgressItems.reduce((map, item) => {
    const key = item.parentId ?? "root";
    const children = map.get(key) ?? [];
    children.push(item);
    map.set(key, children);
    return map;
  }, new Map<string, ProgressNode[]>());

  function getProgressChildren(parentId: string | null) {
    return progressChildrenByParent.get(parentId ?? "root") ?? [];
  }

  function collectProgressTasks(parentId: string): ProgressNode[] {
    return getProgressChildren(parentId).flatMap((item) => (item.type === "task" ? [item] : collectProgressTasks(item.id)));
  }

  function selectProgressNode(item: ProgressNode) {
    const path = getProgressPathNodes(item.id, selectedProjectProgressItems);
    const area = path.find((node) => node.type === "area");
    const section = path.find((node) => node.type === "section");
    const subsection = path.find((node) => node.type === "subsection");

    setSelectedProgressAreaId(area?.id ?? "");
    setSelectedProgressSectionId(item.type === "area" ? "" : section?.id ?? "");
    setSelectedProgressSubsectionId(item.type === "area" || item.type === "section" ? "" : subsection?.id ?? "");
  }

  const progressAreas = getProgressChildren(null).filter((item) => item.type === "area");
  const selectedProgressArea = progressAreas.find((item) => item.id === selectedProgressAreaId) ?? progressAreas[0];
  const selectedProgressSections = selectedProgressArea ? getProgressChildren(selectedProgressArea.id).filter((item) => item.type === "section") : [];
  const selectedProgressSection = selectedProgressSections.find((item) => item.id === selectedProgressSectionId);
  const selectedProgressSubsections = selectedProgressSection ? getProgressChildren(selectedProgressSection.id).filter((item) => item.type === "subsection") : [];
  const selectedProgressSubsection = selectedProgressSubsections.find((item) => item.id === selectedProgressSubsectionId);
  const selectedProgressScope = selectedProgressSubsection ?? selectedProgressSection ?? selectedProgressArea;

  const commonProps = {
    addDefect,
    addDocument,
    addNote,
    addProgressAttachments,
    addProgressItem,
    addTask,
    deleteSiteProject,
    deleteProgressItem,
    defects,
    documents,
    expandedProgressIds,
    generateReport,
    getProgressChildren,
    getProgressTaskCount: (itemId: string) => collectProgressTasks(itemId).length,
    goToSite,
    noteDraft,
    notes,
    openDefectEditorFromProgressItem,
    openSiteProject,
    progressAreas,
    progressItems,
    progressQuery,
    progressSelectedAreaId: selectedProgressArea?.id ?? "",
    progressSelectedScopeId: selectedProgressScope?.id,
    progressSelectedSectionId: selectedProgressSection?.id ?? "",
    progressSelectedSubsectionId: selectedProgressSubsection?.id ?? "",
    projects,
    reports,
    selectProgressNode,
    selectedProject,
    selectedProjectId,
    setModal,
    setAttachmentPreview,
    setNoteDraft,
    setProjects,
    setReports,
    setSelectedProjectId,
    setSiteSettings,
    setToast,
    setProgressEditorId,
    setProgressQuery,
    showSiteProjectSelection,
    siteSettings,
    siteUsers,
    tasks,
    toast,
    toggleDefect,
    toggleProgressAssignee,
    toggleProgressDone,
    toggleProgressExpanded,
    toggleTask,
    updateProgressItem,
    updateProgress
  };
  const showGenericPageHeader = !(page === "site" && selectedProjectId && activeSubKey === "progress");
  const isSiteProgressDrilldown = page === "site" && Boolean(selectedProjectId) && activeSubKey === "progress" && siteSidebarMode === "progress";

  return (
    <div className="app-frame">
      <aside className={`sidebar ${mobileOpen ? "open" : ""}`}>
        <div className="brand-row">
          <Image src="/brand/vysnpro-icon.png" width={58} height={58} alt="VYSNpro" priority />
          <strong>VYSNpro</strong>
          <button className="icon-button sidebar-close" type="button" aria-label="Menü schließen" onClick={() => setMobileOpen(false)}>
            <X size={18} />
          </button>
        </div>

        {menuMode === "platform" ? (
          <PlatformMenu activeModule={activeModule} onSelect={selectModule} />
        ) : (
          <>
            <button
              className="sidebar-back"
              type="button"
              onClick={() => (isSiteProgressDrilldown ? setSiteSidebarMode("menu") : setMenuMode("platform"))}
            >
              <span>
                <ArrowLeft size={15} />
              </span>
              {isSiteProgressDrilldown ? "SiteManager-Menü" : "Plattform-Menü"}
            </button>

            {page === "site" ? null : <ActiveModuleCard module={activeModule} />}
            {page === "site" ? (
              selectedProjectId ? (
                <>
                  {isSiteProgressDrilldown ? (
                    <ProgressStructureMenu
                      activeId={selectedProgressScope?.id}
                      expandedIds={expandedProgressIds}
                      getChildren={getProgressChildren}
                      getTaskCount={(itemId) => collectProgressTasks(itemId).length}
                      canPaste={Boolean(copiedProgressItemId)}
                      onAddChild={addProgressItem}
                      onAddRoot={() => addProgressItem(null)}
                      onCopy={copyProgressItem}
                      onCreateInline={addProgressSidebarItem}
                      onDelete={deleteProgressItem}
                      onDuplicate={duplicateProgressItem}
                      onEdit={setProgressEditorId}
                      onPaste={pasteProgressItem}
                      onSelect={selectProgressNode}
                      onToggle={toggleProgressExpanded}
                      roots={progressAreas}
                      variant="sidebar"
                    />
                  ) : (
                    <ModuleSubnav activeKey={activeSubKey} module={activeModule} onChange={selectSubItem} />
                  )}
                </>
              ) : null
            ) : (
              <ModuleSubnav activeKey={activeSubKey} module={activeModule} onChange={selectSubItem} />
            )}
          </>
        )}
      </aside>

      <main className="main-shell">
        <header className="topbar">
          <button className="icon-button menu-button" type="button" aria-label="Menü öffnen" onClick={() => setMobileOpen(true)}>
            <Menu size={20} />
          </button>
          <div className="search-box">
            <Search size={18} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Suche..." />
            <kbd>Ctrl K</kbd>
          </div>
          <div className="topbar-actions">
            <button className="icon-button" type="button" aria-label="Benachrichtigungen" onClick={() => setToast("Keine neuen Benachrichtigungen.")}>
              <Bell size={19} />
              <span className="notification-dot">3</span>
            </button>
            <button className="icon-button" type="button" aria-label="Hilfe" onClick={() => setToast("Hilfe wird vorbereitet.")}>
              <HelpCircle size={19} />
            </button>
            <div className="user-menu">
              <span className="user-avatar">MJ</span>
              <span>
                <strong>Mario Juric</strong>
                <small>Administrator</small>
              </span>
              <ChevronDown size={15} />
            </div>
          </div>
        </header>

        <section className="page-content">
          {showGenericPageHeader ? (
            <PageHeader
              activeSubItem={headerSubItem}
              module={activeModule}
              onPrimaryAction={handlePrimaryAction}
              showPrimaryAction={page !== "site"}
            />
          ) : null}
          {page === "site" ? (
            <SiteManagerPage activeTab={activeSubKey as SiteTab} {...commonProps} />
          ) : (
            <ComingSoonPage activeSubItem={activeSubItem} module={activeModule} onOpenSite={showSiteProjectSelection} onToast={setToast} />
          )}
        </section>
      </main>

      {modal ? (
        <ActionModal
          modal={modal}
          project={selectedProject}
          onClose={() => setModal(null)}
          onConfirm={modal === "project" ? addProject : modal === "defect" ? addDefect : modal === "task" ? addTask : generateReport}
        />
      ) : null}

      {projectDeleteCandidate ? (
        <div className="modal-backdrop" onClick={() => setProjectDeleteCandidateId(null)}>
          <section className="modal-panel project-delete-modal" role="dialog" aria-modal="true" aria-labelledby="project-delete-title" onClick={(event) => event.stopPropagation()}>
            <span>Projekt löschen</span>
            <h2 id="project-delete-title">{projectDeleteCandidate.name} löschen?</h2>
            <p>Zugehörige Open Points, Mängel, Aufgaben, Notizen und Dokumente werden aus der aktuellen Ansicht entfernt.</p>
            <div className="modal-actions">
              <button className="secondary-action" type="button" onClick={() => setProjectDeleteCandidateId(null)}>Abbrechen</button>
              <button className="danger-action" type="button" onClick={confirmDeleteSiteProject}>Projekt löschen</button>
            </div>
          </section>
        </div>
      ) : null}

      {selectedProgressItem ? (
        <ProgressEditorModal
          item={selectedProgressItem}
          openDefectCount={defects.filter((defect) => defect.progressItemId === selectedProgressItem.id && defect.status !== "Erledigt").length}
          users={siteUsers}
          onAttach={addProgressAttachments}
          onClose={() => setProgressEditorId(null)}
          onDelete={deleteProgressItem}
          onOpenDefectEditor={openDefectEditorFromProgressItem}
          onPreviewAttachment={setAttachmentPreview}
          onToggleAssignee={toggleProgressAssignee}
          onToggleDone={toggleProgressDone}
          onUpdate={updateProgressItem}
        />
      ) : null}

      {defectDraft ? (
        <ProgressDefectModal
          draft={defectDraft}
          path={getProgressPathLabel(defectDraft.progressItemId, progressItems)}
          users={siteUsers}
          onAttach={addDefectDraftAttachments}
          onClose={() => setDefectDraft(null)}
          onPreviewAttachment={setAttachmentPreview}
          onSave={saveDefectDraft}
          onUpdate={(updates) => setDefectDraft((current) => (current ? { ...current, ...updates } : current))}
        />
      ) : null}

      {attachmentPreview ? (
        <AttachmentPreviewModal attachment={attachmentPreview} onClose={() => setAttachmentPreview(null)} />
      ) : null}
    </div>
  );
}

function ModuleSubnav({
  activeKey,
  afterItem,
  afterItemKey,
  module,
  onChange
}: {
  activeKey: string;
  afterItem?: ReactNode;
  afterItemKey?: string;
  module: ModuleNavItem;
  onChange: (key: string) => void;
}) {
  return (
    <section className="module-subnav-panel" aria-label={`${module.label} Untermenü`}>
      <div className="subnav-header">
        <span>Untermenü</span>
        <strong>{module.label}</strong>
      </div>
      <nav className="module-subnav">
        {module.subItems.map((item) => {
          const Icon = item.icon;
          return (
            <Fragment key={item.key}>
              <button
                aria-current={activeKey === item.key ? "page" : undefined}
                className={activeKey === item.key ? "active" : ""}
                type="button"
                onClick={() => onChange(item.key)}
              >
                <Icon size={16} />
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.description}</small>
                </span>
              </button>
              {afterItemKey === item.key ? afterItem : null}
            </Fragment>
          );
        })}
      </nav>
    </section>
  );
}

function ActiveModuleCard({ module }: { module: ModuleNavItem }) {
  const Icon = module.icon;

  return (
    <button className="active-module-card" type="button">
      <span className="menu-icon">
        <Icon size={15} />
      </span>
      <span>
        <strong>{module.label}</strong>
        <small>{module.summary}</small>
      </span>
    </button>
  );
}

function ActiveSubItemCard({ item }: { item: SubNavItem }) {
  const Icon = item.icon;

  return (
    <button className="active-module-card" type="button">
      <span className="menu-icon">
        <Icon size={15} />
      </span>
      <span>
        <strong>{item.label}</strong>
        <small>{item.description}</small>
      </span>
    </button>
  );
}

function ProjectContextCard({ onChange, project }: { onChange: () => void; project: SiteProject }) {
  return (
    <button className="active-module-card project-context-card" type="button" onClick={onChange}>
      <span className="menu-icon">
        <FolderKanban size={15} />
      </span>
      <span>
        <strong>{project.name}</strong>
        <small>Projekt wechseln</small>
      </span>
    </button>
  );
}

function ProjectSidebarList({
  onCreate,
  onSelect,
  projects
}: {
  onCreate: () => void;
  onSelect: (projectId: string) => void;
  projects: SiteProject[];
}) {
  return (
    <section className="module-subnav-panel project-picker-panel" aria-label="SiteManager Projekte">
      <div className="subnav-header">
        <span>Projekt</span>
        <strong>Projekte</strong>
      </div>
      <nav className="module-subnav project-picker-nav">
        {projects.map((project) => (
          <button key={project.id} type="button" onClick={() => onSelect(project.id)}>
            <FolderKanban size={16} />
            <span>
              <strong>{project.name}</strong>
              <small>{project.location}</small>
            </span>
          </button>
        ))}
        <button className="project-create-link" type="button" onClick={onCreate}>
          <Plus size={16} />
          <span>
            <strong>Projekt anlegen</strong>
            <small>Neues SiteManager-Projekt</small>
          </span>
        </button>
      </nav>
    </section>
  );
}

function PlatformMenu({
  activeModule,
  onSelect
}: {
  activeModule: ModuleNavItem;
  onSelect: (page: PageKey) => void;
}) {
  return (
    <section className="platform-menu">
      <div className="sidebar-section-label">Plattform-Menü</div>
      <nav className="platform-module-list" aria-label="Plattform-Menü">
        {moduleNavigation.map((module) => {
          const Icon = module.icon;
          return (
            <button
              key={module.key}
              className={module.key === activeModule.key ? "active" : ""}
              type="button"
              onClick={() => onSelect(module.key)}
            >
              <span className="menu-icon">
                <Icon size={15} />
              </span>
              <span>
                <strong>{module.label}</strong>
                <small>{module.summary}</small>
              </span>
            </button>
          );
        })}
      </nav>
    </section>
  );
}

function PageHeader({
  activeSubItem,
  module,
  onPrimaryAction,
  showPrimaryAction = true
}: {
  activeSubItem: SubNavItem;
  module: ModuleNavItem;
  onPrimaryAction: () => void;
  showPrimaryAction?: boolean;
}) {
  return (
    <div className="page-header">
      <div>
        <span className="eyebrow">{activeSubItem.label}</span>
        <h1>{module.label}</h1>
        <p>{module.kicker}</p>
      </div>
      <div className="page-actions">
        <button className="secondary-action" type="button">
          <CalendarDays size={16} />
          Juli 2026
          <ChevronDown size={15} />
        </button>
        {showPrimaryAction ? (
          <button className="primary-action" type="button" onClick={onPrimaryAction}>
            <Plus size={16} />
            {module.primaryAction}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function ComingSoonPage({
  activeSubItem,
  module,
  onOpenSite,
  onToast
}: {
  activeSubItem: SubNavItem;
  module: ModuleNavItem;
  onOpenSite: () => void;
  onToast: (message: string) => void;
}) {
  const Icon = module.icon;
  const roadmap = module.subItems.slice(0, 5);

  return (
    <div className="coming-soon">
      <section className="coming-panel">
        <div className="coming-icon">
          <Icon size={24} />
        </div>
        <span>Coming soon</span>
        <h2>{module.label} wird als nächstes Modul vorbereitet.</h2>
        <p>
          Der Bereich <strong>{activeSubItem.label}</strong> bekommt später dieselbe ruhige Bedienlogik wie der SiteManager:
          klare Listen, schnelle Aktionen, Rechte und saubere Auswertungen.
        </p>
        <div className="coming-actions">
          <button className="primary-action" type="button" onClick={() => onToast(`${module.label} wurde auf die Roadmap gesetzt.`)}>
            <CheckCircle2 size={16} />
            Vormerken
          </button>
          <button className="secondary-action" type="button" onClick={onOpenSite}>
            <HardHat size={16} />
            Zum SiteManager
          </button>
      </div>
      </section>
      <section className="dashboard-card coming-list">
        <WidgetHeader title="Geplante Funktionen" />
        {roadmap.map((item) => {
          const ItemIcon = item.icon;
          return (
            <div className="coming-row" key={item.key}>
              <span>
                <ItemIcon size={15} />
              </span>
              <div>
                <strong>{item.label}</strong>
                <small>{item.description}</small>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}

type SiteManagerProps = {
  activeTab: SiteTab;
  addDefect: () => void;
  addDocument: (kind: SiteDocument["kind"]) => void;
  addNote: () => void;
  addProgressAttachments: (itemId: string, kind: ProgressAttachment["kind"], files: FileList | null) => void;
  addProgressItem: (parentId: string | null) => void;
  addTask: () => void;
  deleteProgressItem: (itemId: string) => void;
  deleteSiteProject: (projectId: string) => void;
  defects: SiteDefect[];
  documents: SiteDocument[];
  expandedProgressIds: Record<string, boolean>;
  generateReport: () => void;
  getProgressChildren: (parentId: string | null) => ProgressNode[];
  getProgressTaskCount: (itemId: string) => number;
  goToSite: (tab: SiteTab) => void;
  noteDraft: string;
  notes: SiteNote[];
  openDefectEditorFromProgressItem: (itemId: string) => void;
  openSiteProject: (projectId: string, tab?: SiteTab) => void;
  progressAreas: ProgressNode[];
  progressItems: ProgressNode[];
  progressQuery: string;
  progressSelectedAreaId: string;
  progressSelectedScopeId?: string;
  progressSelectedSectionId: string;
  progressSelectedSubsectionId: string;
  projects: SiteProject[];
  reports: SiteReport[];
  selectProgressNode: (item: ProgressNode) => void;
  selectedProject: SiteProject;
  selectedProjectId: string | null;
  setModal: (modal: "project" | "defect" | "task" | "report" | null) => void;
  setAttachmentPreview: (attachment: ProgressAttachment | null) => void;
  setNoteDraft: (value: string) => void;
  setProjects: Dispatch<SetStateAction<SiteProject[]>>;
  setReports: Dispatch<SetStateAction<SiteReport[]>>;
  setSelectedProjectId: (id: string | null) => void;
  setSiteSettings: Dispatch<SetStateAction<{ photoRequired: boolean; autoReports: boolean; customerPortal: boolean; defectApproval: boolean }>>;
  setProgressEditorId: (id: string | null) => void;
  setProgressQuery: (value: string) => void;
  setToast: (message: string) => void;
  showSiteProjectSelection: () => void;
  siteSettings: { photoRequired: boolean; autoReports: boolean; customerPortal: boolean; defectApproval: boolean };
  siteUsers: string[];
  tasks: SiteTask[];
  toast: string;
  toggleDefect: (id: string) => void;
  toggleProgressAssignee: (itemId: string, userName: string) => void;
  toggleProgressDone: (itemId: string) => void;
  toggleProgressExpanded: (itemId: string) => void;
  toggleTask: (id: string) => void;
  updateProgressItem: (itemId: string, updates: Partial<ProgressNode>) => void;
  updateProgress: (projectId: string, delta: number) => void;
};

function SiteManagerPage(props: SiteManagerProps) {
  if (!props.selectedProjectId) {
    return (
      <div className="site-workspace">
        <SiteProjectSelection {...props} />
      </div>
    );
  }

  const view = {
    dashboard: <LegacySiteDashboard {...props} />,
    progress: <SiteProgress {...props} />,
    defects: <SiteDefectsModern {...props} />,
    tasks: <SiteTasks {...props} />,
    notes: <SiteNotes {...props} />,
    documentation: <SiteDocumentation {...props} />,
    reports: <SiteReports {...props} />,
    settings: <SiteSettings {...props} />
  }[props.activeTab] ?? <LegacySiteDashboard {...props} />;

  return (
    <div className="site-workspace">
      {props.activeTab === "progress" || props.activeTab === "dashboard" ? null : <SiteStatusBar {...props} />}
      {view}
    </div>
  );
}

function SiteStatusBar({ selectedProject, projects, defects, tasks, toast }: SiteManagerProps) {
  const openDefects = defects.filter((defect) => defect.status !== "Erledigt").length;
  const openTasks = tasks.filter((task) => !task.done).length;

  return (
    <section className="site-status-bar">
      <div>
        <span>Aktives Projekt</span>
        <strong>{selectedProject.name}</strong>
        <small>{selectedProject.client} · {selectedProject.location}</small>
      </div>
      <div>
        <span>Projekte</span>
        <strong>{projects.length}</strong>
        <small>im Workspace</small>
      </div>
      <div>
        <span>Offene Mängel</span>
        <strong>{openDefects}</strong>
        <small>zu prüfen</small>
      </div>
      <div>
        <span>Aufgaben</span>
        <strong>{openTasks}</strong>
        <small>offen</small>
      </div>
      <p>{toast}</p>
    </section>
  );
}

function LegacySiteDashboard(props: SiteManagerProps) {
  const { addDefect, defects, generateReport, openSiteProject, progressItems, projects, selectedProject, showSiteProjectSelection, tasks, updateProgress } = props;
  const projectDefects = defects.filter((defect) => defect.projectId === selectedProject.id);
  const openProjectDefects = projectDefects.filter((defect) => defect.status !== "Erledigt");
  const completedProjectDefects = projectDefects.filter((defect) => defect.status === "Erledigt");
  const projectTasks = tasks.filter((task) => task.projectId === selectedProject.id);
  const projectProgressItems = progressItems.filter((item) => item.projectId === selectedProject.id);
  const progressTasks = projectProgressItems.filter((item) => item.type === "task");
  const openPoints = progressTasks.filter((item) => !item.done);
  const completedPoints = progressTasks.filter((item) => item.done);
  const inWorkPoints = progressTasks.filter((item) => item.status === "In Arbeit" && !item.done);
  const completedTasks = projectTasks.filter((task) => task.done);
  const deadlineDays = getDaysUntilDeadline(selectedProject.due);
  const completedPointsLastWeek = Math.max(0, completedPoints.length - Math.max(1, Math.round(progressTasks.length * 0.12)));
  const completedDefectsLastWeek = Math.max(0, completedProjectDefects.length - 1);
  const openPointRate = progressTasks.length ? Math.round((openPoints.length / progressTasks.length) * 100) : 0;
  const defectRate = progressTasks.length ? Math.round((openProjectDefects.length / progressTasks.length) * 100) : 0;
  const taskRate = projectTasks.length ? Math.round((completedTasks.length / projectTasks.length) * 100) : 0;

  return (
    <div className="site-dashboard">
      <section className="site-dashboard-hero">
        <div>
          <span>Projekt Dashboard</span>
          <h2>{selectedProject.name}</h2>
          <p>{selectedProject.client} · {selectedProject.location} · Projektleitung {selectedProject.manager}</p>
        </div>
        <div className="site-dashboard-actions">
          <button type="button" onClick={showSiteProjectSelection}><FolderKanban size={15} /> Projekt wechseln</button>
          <button type="button" onClick={generateReport}><FileText size={15} /> Bericht erstellen</button>
        </div>
      </section>

      <div className="site-analytics-grid">
        <SiteAnalyticsCard detail={`${completedPoints.length} von ${progressTasks.length} erledigt`} icon={BarChart3} label="Open Points" progress={openPointRate} tone="blue" value={String(openPoints.length)} />
        <SiteAnalyticsCard detail={`${completedProjectDefects.length} abgeschlossen`} icon={AlertTriangle} label="Offene Mängel" progress={defectRate} tone="red" value={String(openProjectDefects.length)} />
        <SiteAnalyticsCard detail={deadlineDays >= 0 ? `fällig am ${selectedProject.due}` : `seit ${Math.abs(deadlineDays)} Tagen überfällig`} icon={CalendarDays} label="Deadline" progress={Math.max(0, Math.min(100, 100 - Math.max(0, deadlineDays)))} tone={deadlineDays < 14 ? "amber" : "green"} value={deadlineDays >= 0 ? String(deadlineDays) : "0"} valueSuffix=" Tage" />
        <SiteAnalyticsCard detail={`${completedTasks.length} von ${projectTasks.length} erledigt`} icon={ClipboardList} label="Aufgaben" progress={taskRate} tone="green" value={String(projectTasks.length - completedTasks.length)} />
      </div>

      <div className="site-grid">
        <section className="dashboard-card site-feature wide site-analytics-panel">
          <WidgetHeader title="Wochenvergleich" />
          <div className="analytics-bars">
            <AnalyticsComparisonBar current={completedPoints.length} label="Open Points erledigt" previous={completedPointsLastWeek} tone="blue" />
            <AnalyticsComparisonBar current={completedProjectDefects.length} label="Mängel erledigt" previous={completedDefectsLastWeek} tone="red" />
          </div>
        </section>

        <section className="dashboard-card site-feature site-dashboard-status">
          <WidgetHeader title="Status" />
          <div className="status-stack">
            <div><span>Offen</span><strong>{openPoints.length}</strong></div>
            <div><span>In Arbeit</span><strong>{inWorkPoints.length}</strong></div>
            <div><span>Mit Mangel</span><strong>{openProjectDefects.length}</strong></div>
            <div><span>Erledigt</span><strong>{completedPoints.length}</strong></div>
          </div>
        </section>

        <section className="dashboard-card site-feature">
          <WidgetHeader title="Aktionen" />
          <div className="quick-actions">
            <button type="button" onClick={addDefect}><AlertTriangle size={16} /> Mangel aufnehmen</button>
            <button type="button" onClick={() => updateProgress(selectedProject.id, 5)}><BarChart3 size={16} /> Open Points +5%</button>
            <button type="button" onClick={generateReport}><FileText size={16} /> Bericht erstellen</button>
            <button type="button" onClick={showSiteProjectSelection}><FolderKanban size={16} /> Projekt wechseln</button>
          </div>
        </section>

        <section className="dashboard-card site-feature wide">
          <WidgetHeader title="Aktueller Baufortschritt" />
          <ProgressBoard projects={[selectedProject]} onUpdate={updateProgress} />
        </section>

        <section className="dashboard-card site-feature">
          <WidgetHeader title="Projektportfolio" />
          <div className="site-list">
            {projects.map((project) => (
              <ProjectSummary key={project.id} project={project} onOpen={() => openSiteProject(project.id)} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function SiteAnalyticsCard({
  detail,
  icon: Icon,
  label,
  progress,
  tone,
  value,
  valueSuffix = ""
}: {
  detail: string;
  icon: NavIcon;
  label: string;
  progress: number;
  tone: Tone;
  value: string;
  valueSuffix?: string;
}) {
  return (
    <article className={`site-analytics-card ${tone}`}>
      <div className="site-analytics-icon">
        <Icon size={19} />
      </div>
      <div>
        <span>{label}</span>
        <strong>{value}<small>{valueSuffix}</small></strong>
        <p>{detail}</p>
      </div>
      <ProgressBar tone={tone} value={progress} />
    </article>
  );
}

function AnalyticsComparisonBar({ current, label, previous, tone }: { current: number; label: string; previous: number; tone: Tone }) {
  const maxValue = Math.max(current, previous, 1);
  const diff = current - previous;

  return (
    <div className="analytics-bar-row">
      <div className="analytics-bar-head">
        <span>{label}</span>
        <strong>{current}</strong>
      </div>
      <div className="analytics-bar-track">
        <span className={`current ${tone}`} style={{ width: `${Math.max(8, (current / maxValue) * 100)}%` }} />
      </div>
      <div className="analytics-bar-track muted">
        <span style={{ width: `${Math.max(8, (previous / maxValue) * 100)}%` }} />
      </div>
      <p>
        <span>Diese Woche</span>
        <span>Vorwoche {previous}</span>
        <em className={diff >= 0 ? "positive" : "negative"}>{diff >= 0 ? "+" : ""}{diff}</em>
      </p>
    </div>
  );
}

function getDaysUntilDeadline(due: string) {
  const monthMap: Record<string, number> = {
    Jan: 0,
    Feb: 1,
    Mar: 2,
    Apr: 3,
    Mai: 4,
    Jun: 5,
    Jul: 6,
    Aug: 7,
    Sep: 8,
    Okt: 9,
    Nov: 10,
    Dez: 11
  };
  const match = due.match(/(\d{1,2})\.\s*([A-Za-zÄÖÜäöü]{3})\s*(\d{4})/);

  if (!match) {
    return 0;
  }

  const day = Number(match[1]);
  const month = monthMap[match[2]];
  const year = Number(match[3]);

  if (Number.isNaN(day) || month === undefined || Number.isNaN(year)) {
    return 0;
  }

  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const deadline = new Date(year, month, day).getTime();

  return Math.ceil((deadline - startOfToday) / 86_400_000);
}

function SiteProjectSelection({ deleteSiteProject, openSiteProject, projects, selectedProjectId, setModal, setProjects, setToast }: SiteManagerProps) {
  const [contextMenu, setContextMenu] = useState<{ project: SiteProject; x: number; y: number } | null>(null);
  const [editDraft, setEditDraft] = useState<SiteProject | null>(null);

  function openProjectEditor(project: SiteProject) {
    setContextMenu(null);
    setEditDraft({ ...project });
  }

  function saveProjectEdit() {
    if (!editDraft) {
      return;
    }

    setProjects((current) => current.map((project) => (project.id === editDraft.id ? editDraft : project)));
    setEditDraft(null);
    setToast("Projekt wurde aktualisiert.");
  }

  function openProjectContextMenu(project: SiteProject, event: ReactMouseEvent<HTMLElement>) {
    event.preventDefault();
    setContextMenu({
      project,
      x: Math.max(8, Math.min(event.clientX, window.innerWidth - 242)),
      y: Math.max(8, Math.min(event.clientY, window.innerHeight - 214))
    });
  }

  function runProjectContextAction(action: (projectId: string) => void) {
    if (!contextMenu) {
      return;
    }

    const projectId = contextMenu.project.id;
    setContextMenu(null);
    action(projectId);
  }

  return (
    <div className="site-grid">
      <section className="dashboard-card site-feature full project-selection-panel">
        <div className="project-selection-head">
          <div>
            <span>SiteManager</span>
            <h2>Projekt auswählen</h2>
            <p>Wähle zuerst ein Projekt. Danach erscheinen Dashboard, Open Points, Mängel, Aufgaben, Notizen, Dokumentation, Berichte und Einstellungen für genau dieses Projekt.</p>
          </div>
        </div>
        <div className="site-toolbar">
          <button type="button" onClick={() => setToast("Projektfilter wurde angewendet.")}><Filter size={15} /> Filter</button>
        </div>
        <div className="project-board project-selection-board">
          {projects.map((project) => (
            <article
              className={`site-project-card ${selectedProjectId === project.id ? "active" : ""}`}
              key={project.id}
              role="button"
              tabIndex={0}
              onClick={() => openSiteProject(project.id)}
              onContextMenu={(event) => openProjectContextMenu(project, event)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openSiteProject(project.id);
                }
              }}
            >
              <div className="project-card-cover">
                {project.imageUrl ? (
                  <img src={project.imageUrl} alt={project.name} />
                ) : (
                  <span>
                    <HardHat size={22} />
                  </span>
                )}
              </div>
              <div>
                <strong>{project.name}</strong>
                <small>{project.client} · {project.location}</small>
              </div>
              <ProgressBar value={project.progress} tone={project.progress > 70 ? "green" : "blue"} />
              <div className="project-card-meta">
                <span>{project.status}</span>
                <span>{project.team} Personen</span>
                <span>{project.due}</span>
              </div>
            </article>
          ))}
          <button className="site-project-card project-create-card" type="button" onClick={() => setModal("project")}>
            <span className="project-create-icon">
              <Plus size={22} />
            </span>
            <strong>Projekt anlegen</strong>
            <small>Neues SiteManager-Projekt erstellen</small>
          </button>
        </div>
        {contextMenu ? (
          <>
            <div
              className="progress-context-backdrop"
              onClick={() => setContextMenu(null)}
              onContextMenu={(event) => {
                event.preventDefault();
                setContextMenu(null);
              }}
            />
            <div className="progress-context-menu project-context-menu" style={{ left: contextMenu.x, top: contextMenu.y }}>
              <button type="button" onClick={() => runProjectContextAction(openSiteProject)}>
                <FolderKanban size={14} />
                Öffnen
              </button>
              <button type="button" onClick={() => openProjectEditor(contextMenu.project)}>
                <Pencil size={14} />
                Bearbeiten
              </button>
              <button className="danger" type="button" onClick={() => runProjectContextAction(deleteSiteProject)}>
                <Trash2 size={14} />
                Löschen
              </button>
            </div>
          </>
        ) : null}
        {editDraft ? (
          <ProjectEditorModal
            draft={editDraft}
            onClose={() => setEditDraft(null)}
            onSave={saveProjectEdit}
            onUpdate={(updates) => setEditDraft((current) => (current ? { ...current, ...updates } : current))}
          />
        ) : null}
      </section>
    </div>
  );
}

function ProjectEditorModal({
  draft,
  onClose,
  onSave,
  onUpdate
}: {
  draft: SiteProject;
  onClose: () => void;
  onSave: () => void;
  onUpdate: (updates: Partial<SiteProject>) => void;
}) {
  function updateImage(files: FileList | null) {
    const file = files?.[0];
    if (!file) {
      return;
    }

    onUpdate({ imageUrl: URL.createObjectURL(file) });
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="modal-panel project-editor-modal" role="dialog" aria-modal="true" aria-labelledby="project-editor-title" onClick={(event) => event.stopPropagation()}>
        <button className="modal-close" type="button" onClick={onClose}><X size={16} /></button>
        <span>Projekt bearbeiten</span>
        <h2 id="project-editor-title">{draft.name}</h2>
        <div className="project-editor-layout">
          <div className="project-editor-image">
            {draft.imageUrl ? (
              <img src={draft.imageUrl} alt={draft.name} />
            ) : (
              <span>
                <HardHat size={28} />
              </span>
            )}
            <label className="upload-action">
              <ImageIcon size={14} />
              Bild auswählen
              <input
                accept="image/*"
                type="file"
                onChange={(event) => {
                  updateImage(event.currentTarget.files);
                  event.currentTarget.value = "";
                }}
              />
            </label>
          </div>
          <div className="editor-grid">
            <label className="editor-field">
              <span>Projektname</span>
              <input value={draft.name} onChange={(event) => onUpdate({ name: event.target.value })} />
            </label>
            <label className="editor-field">
              <span>Kunde</span>
              <input value={draft.client} onChange={(event) => onUpdate({ client: event.target.value })} />
            </label>
            <label className="editor-field">
              <span>Ort</span>
              <input value={draft.location} onChange={(event) => onUpdate({ location: event.target.value })} />
            </label>
            <label className="editor-field">
              <span>Status</span>
              <select value={draft.status} onChange={(event) => onUpdate({ status: event.target.value as SiteProject["status"] })}>
                <option>Aktiv</option>
                <option>Planung</option>
                <option>Abnahme</option>
                <option>Pausiert</option>
              </select>
            </label>
            <label className="editor-field">
              <span>Fällig am</span>
              <input value={draft.due} onChange={(event) => onUpdate({ due: event.target.value })} />
            </label>
            <label className="editor-field">
              <span>Projektleiter</span>
              <input value={draft.manager} onChange={(event) => onUpdate({ manager: event.target.value })} />
            </label>
            <label className="editor-field">
              <span>Team</span>
              <input min={1} type="number" value={draft.team} onChange={(event) => onUpdate({ team: Number(event.target.value) || 1 })} />
            </label>
            <label className="editor-field">
              <span>Budget</span>
              <input value={draft.budget} onChange={(event) => onUpdate({ budget: event.target.value })} />
            </label>
          </div>
        </div>
        <div className="modal-actions">
          <button className="secondary-action" type="button" onClick={onClose}>Abbrechen</button>
          <button className="primary-action" type="button" onClick={onSave}>Speichern</button>
        </div>
      </section>
    </div>
  );
}

function SiteProgress({
  addProgressItem,
  defects,
  openDefectEditorFromProgressItem,
  progressItems,
  progressQuery,
  progressSelectedAreaId,
  progressSelectedSectionId,
  progressSelectedSubsectionId,
  selectedProject,
  setProgressEditorId,
  setAttachmentPreview,
  setProgressQuery,
  setToast,
  updateProgressItem,
  toggleProgressDone
}: SiteManagerProps) {
  const [showCompletedProgress, setShowCompletedProgress] = useState(false);
  const [showProgressSearch, setShowProgressSearch] = useState(false);
  const projectProgressItems = progressItems.filter((item) => item.projectId === selectedProject.id);
  const taskItems = projectProgressItems.filter((item) => item.type === "task");
  const projectDefects = defects.filter((defect) => defect.projectId === selectedProject.id);
  const openDefectItemIds = new Set(
    projectDefects.flatMap((defect) => (defect.progressItemId && defect.status !== "Erledigt" ? [defect.progressItemId] : []))
  );
  const childrenByParent = projectProgressItems.reduce((map, item) => {
    const key = item.parentId ?? "root";
    const children = map.get(key) ?? [];
    children.push(item);
    map.set(key, children);
    return map;
  }, new Map<string, ProgressNode[]>());

  function getChildren(parentId: string | null) {
    return childrenByParent.get(parentId ?? "root") ?? [];
  }

  function collectTasks(parentId: string): ProgressNode[] {
    return getChildren(parentId).flatMap((item) => (item.type === "task" ? [item] : collectTasks(item.id)));
  }

  function isTaskDone(item: ProgressNode) {
    return Boolean(item.done) || item.status === "Erledigt";
  }

  function taskHasOpenDefect(item: ProgressNode) {
    return openDefectItemIds.has(item.id);
  }

  function getPercent(part: number, total: number) {
    return total ? Math.round((part / total) * 100) : 0;
  }

  const areas = getChildren(null).filter((item) => item.type === "area");
  const selectedArea = areas.find((item) => item.id === progressSelectedAreaId) ?? areas[0];
  const sections = selectedArea ? getChildren(selectedArea.id).filter((item) => item.type === "section") : [];
  const selectedSection = sections.find((item) => item.id === progressSelectedSectionId);
  const subsections = selectedSection ? getChildren(selectedSection.id).filter((item) => item.type === "subsection") : [];
  const selectedSubsection = subsections.find((item) => item.id === progressSelectedSubsectionId);
  const selectedScopeParent = selectedSubsection ?? selectedSection ?? selectedArea;
  const scopeTasks = selectedScopeParent ? collectTasks(selectedScopeParent.id) : taskItems;
  const normalizedQuery = progressQuery.trim().toLowerCase();
  const filteredScopeTasks = scopeTasks.filter((task) => {
    if (!normalizedQuery) {
      return true;
    }

    const pathText = getProgressPathNodes(task.id, projectProgressItems).map((item) => item.title).join(" ");
    const searchText = [
      pathText,
      task.description,
      task.status,
      ...task.assignees,
      ...task.attachments.map((attachment) => attachment.name)
    ].join(" ").toLowerCase();

    return searchText.includes(normalizedQuery);
  });
  const activeTasks = filteredScopeTasks.filter((item) => !isTaskDone(item));
  const completedTaskItems = filteredScopeTasks.filter(isTaskDone);
  const completedTasks = taskItems.filter(isTaskDone).length;
  const openTasks = taskItems.filter((item) => !isTaskDone(item) && item.status === "Offen").length;
  const inProgressTasks = taskItems.filter((item) => !isTaskDone(item) && item.status === "In Arbeit").length;
  const defectTasks = taskItems.filter(taskHasOpenDefect).length;
  const calculatedProgress = taskItems.length ? getPercent(completedTasks, taskItems.length) : selectedProject.progress;

  function handleNewEntry() {
    if (selectedSubsection) {
      addProgressItem(selectedSubsection.id);
      return;
    }
    if (selectedSection) {
      addProgressItem(selectedSection.id);
      return;
    }
    if (selectedArea) {
      addProgressItem(selectedArea.id);
      return;
    }
    addProgressItem(null);
  }

  function updateTaskStatus(itemId: string, status: ProgressNode["status"]) {
    updateProgressItem(itemId, { status, done: status === "Erledigt" });
  }

  function renameProgressItem(itemId: string, title: string) {
    updateProgressItem(itemId, { title });
  }

  return (
    <div className="progress-page">
      <header className="progress-compact-header">
        <div>
          <span>Open Points</span>
          <h2>Open Points</h2>
          <p>{selectedProject.name}</p>
        </div>
        <div className="progress-compact-actions">
          <button
            aria-expanded={showProgressSearch}
            aria-label="Suche öffnen"
            title="Suche"
            type="button"
            onClick={() => setShowProgressSearch((current) => !current)}
          >
            <Search size={16} />
          </button>
          <button aria-label="Filter" title="Filter" type="button" onClick={() => setToast("Filteransicht wurde aktualisiert.")}>
            <Filter size={16} />
          </button>
        </div>
      </header>

      {showProgressSearch ? (
        <label className="progress-inline-search">
          <Search size={17} />
          <input
            value={progressQuery}
            onChange={(event) => setProgressQuery(event.target.value)}
            placeholder="Suche in Projekt, Bereich, Aufgabe ..."
          />
        </label>
      ) : null}

      <div className="progress-workspace">
          <section className="progress-compact-stats">
            <div className="progress-mini-progress">
              <CircularProgress value={calculatedProgress} />
              <div>
                <span>Gesamt</span>
                <strong>{completedTasks}/{taskItems.length || 1}</strong>
              </div>
            </div>
            <ProgressMiniStat label="Offen" tone="blue" value={String(openTasks)} />
            <ProgressMiniStat label="In Arbeit" tone="amber" value={String(inProgressTasks)} />
            <ProgressMiniStat label="Mangel" tone="red" value={String(defectTasks)} />
            <ProgressMiniStat label="Erledigt" tone="green" value={String(completedTasks)} />
          </section>

          <ProgressTable
            defects={projectDefects}
            items={activeTasks}
            onAddItem={handleNewEntry}
            onEdit={setProgressEditorId}
            onOpenDefectEditor={openDefectEditorFromProgressItem}
            onPreviewAttachment={setAttachmentPreview}
            onRename={renameProgressItem}
            onStatusChange={updateTaskStatus}
            onToggleDone={toggleProgressDone}
            totalCount={scopeTasks.length}
          />

          <section className="completed-table-panel">
            <button className="completed-progress-toggle table-style" type="button" onClick={() => setShowCompletedProgress((current) => !current)}>
              <ChevronDown size={16} className={showCompletedProgress ? "open" : ""} />
              <span>Erledigte Punkte ({completedTaskItems.length})</span>
            </button>
            {showCompletedProgress ? (
              <ProgressTable
                defects={projectDefects}
                items={completedTaskItems}
                onEdit={setProgressEditorId}
                onOpenDefectEditor={openDefectEditorFromProgressItem}
                onPreviewAttachment={setAttachmentPreview}
                onRename={renameProgressItem}
                onStatusChange={updateTaskStatus}
                onToggleDone={toggleProgressDone}
                totalCount={scopeTasks.length}
                variant="completed"
              />
            ) : null}
          </section>
      </div>
    </div>
  );
}

function ProgressStructureMenu({
  activeId,
  canPaste = false,
  expandedIds,
  getChildren,
  getTaskCount,
  onAddChild,
  onAddRoot,
  onCopy,
  onCreateInline,
  onDelete,
  onDuplicate,
  onEdit,
  onPaste,
  onSelect,
  onToggle,
  roots,
  variant = "content"
}: {
  activeId?: string;
  canPaste?: boolean;
  expandedIds: Record<string, boolean>;
  getChildren: (parentId: string | null) => ProgressNode[];
  getTaskCount: (itemId: string) => number;
  onAddChild: (parentId: string | null) => void;
  onAddRoot: () => void;
  onCopy?: (itemId: string) => void;
  onCreateInline?: (parentId: string | null, title: string) => void;
  onDelete?: (itemId: string) => void;
  onDuplicate?: (itemId: string) => void;
  onEdit?: (itemId: string) => void;
  onPaste?: (itemId: string) => void;
  onSelect: (item: ProgressNode) => void;
  onToggle: (itemId: string) => void;
  roots: ProgressNode[];
  variant?: "content" | "sidebar";
}) {
  const [draftParentId, setDraftParentId] = useState<string | null | undefined>(undefined);
  const [draftTitle, setDraftTitle] = useState("");
  const [contextMenu, setContextMenu] = useState<{ item: ProgressNode; x: number; y: number } | null>(null);

  function openContextMenu(item: ProgressNode, event: ReactMouseEvent<HTMLDivElement>) {
    if (variant !== "sidebar") {
      return;
    }

    event.preventDefault();
    onSelect(item);
    setContextMenu({
      item,
      x: Math.max(8, Math.min(event.clientX, window.innerWidth - 204)),
      y: Math.max(8, Math.min(event.clientY, window.innerHeight - 176))
    });
  }

  function runContextAction(action: (itemId: string) => void) {
    if (!contextMenu) {
      return;
    }

    action(contextMenu.item.id);
    setContextMenu(null);
  }

  function startInlineCreate(parentId: string | null) {
    if (!onCreateInline) {
      if (parentId) {
        onAddChild(parentId);
      } else {
        onAddRoot();
      }
      return;
    }

    setDraftParentId(parentId);
    setDraftTitle("");
  }

  function submitInlineCreate() {
    const title = draftTitle.trim();
    if (!title || draftParentId === undefined || !onCreateInline) {
      return;
    }

    onCreateInline(draftParentId, title);
    setDraftParentId(undefined);
    setDraftTitle("");
  }

  function renderDraft(parentId: string | null, depth: number, label: string) {
    if (draftParentId !== parentId) {
      return null;
    }

    return (
      <form
        className={`progress-menu-draft level-${depth}`}
        onSubmit={(event) => {
          event.preventDefault();
          submitInlineCreate();
        }}
      >
        <input
          autoFocus
          value={draftTitle}
          onChange={(event) => setDraftTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setDraftParentId(undefined);
              setDraftTitle("");
            }
          }}
          placeholder={`${label} benennen`}
        />
        <button type="submit" aria-label="Speichern" disabled={!draftTitle.trim()}>
          <Check size={13} />
        </button>
        <button
          type="button"
          aria-label="Abbrechen"
          onClick={() => {
            setDraftParentId(undefined);
            setDraftTitle("");
          }}
        >
          <X size={13} />
        </button>
      </form>
    );
  }

  function renderItem(item: ProgressNode, depth: number): ReactNode {
    const children = getChildren(item.id).filter((child) => child.type !== "task");
    const hasChildren = children.length > 0;
    const isOpen = expandedIds[item.id] ?? true;
    const childType = progressTypeCopy[item.type].child;
    const taskCount = getTaskCount(item.id);

    return (
      <div className="progress-menu-branch" key={item.id}>
        <div className={`progress-menu-row level-${depth} ${activeId === item.id ? "active" : ""}`} onContextMenu={(event) => openContextMenu(item, event)}>
          <button
            className={`progress-menu-expand ${isOpen ? "open" : ""}`}
            disabled={!hasChildren}
            type="button"
            aria-label={hasChildren ? `${item.title} ${isOpen ? "zuklappen" : "aufklappen"}` : "Keine Unterbereiche"}
            onClick={() => (hasChildren ? onToggle(item.id) : undefined)}
          >
            {hasChildren ? <ChevronDown size={14} /> : null}
          </button>
          <button className="progress-menu-main" type="button" onClick={() => onSelect(item)}>
            <span>{item.type === "area" ? <FolderKanban size={14} /> : item.type === "section" ? <FileText size={14} /> : <ClipboardList size={14} />}</span>
            <span>
              <strong>{item.title}</strong>
              <small>{taskCount} Punkte</small>
            </span>
          </button>
          <div className="progress-menu-actions">
            {childType && childType !== "task" ? (
              <button className="progress-menu-add" type="button" aria-label={`${progressTypeCopy[item.type].createLabel} erstellen`} onClick={() => startInlineCreate(item.id)}>
                <Plus size={13} />
              </button>
            ) : null}
          </div>
        </div>
        {renderDraft(item.id, Math.min(depth + 1, 2), progressTypeCopy[item.type].createLabel)}
        {hasChildren && isOpen ? children.map((child) => renderItem(child, Math.min(depth + 1, 2))) : null}
      </div>
    );
  }

  return (
    <aside className={`progress-structure-menu ${variant === "sidebar" ? "sidebar-progress-structure" : ""}`} aria-label="Open Points Menü">
      <div className="progress-structure-head">
        <div>
          <span>Open Points Menü</span>
          <strong>Bereiche</strong>
        </div>
        <button type="button" onClick={() => startInlineCreate(null)}>
          <Plus size={14} />
          Bereich
        </button>
      </div>
      <div className="progress-menu-list">
        {renderDraft(null, 0, "Bereich")}
        {roots.map((item) => renderItem(item, 0))}
        {!roots.length ? (
          <div className="progress-menu-empty">
            <FolderKanban size={16} />
            <span>Noch keine Bereiche.</span>
          </div>
        ) : null}
      </div>
      {contextMenu ? (
        <>
          <div
            className="progress-context-backdrop"
            onClick={() => setContextMenu(null)}
            onContextMenu={(event) => {
              event.preventDefault();
              setContextMenu(null);
            }}
          />
          <div className="progress-context-menu" style={{ left: contextMenu.x, top: contextMenu.y }}>
            {onEdit ? (
              <button type="button" onClick={() => runContextAction(onEdit)}>
                <Pencil size={14} />
                Bearbeiten
              </button>
            ) : null}
            {onCopy ? (
              <button type="button" onClick={() => runContextAction(onCopy)}>
                <Copy size={14} />
                Kopieren
              </button>
            ) : null}
            {onPaste ? (
              <button type="button" disabled={!canPaste} onClick={() => runContextAction(onPaste)}>
                <ClipboardList size={14} />
                Einfügen
              </button>
            ) : null}
            {onDuplicate ? (
              <button type="button" onClick={() => runContextAction(onDuplicate)}>
                <Copy size={14} />
                Duplizieren
              </button>
            ) : null}
            {onDelete ? (
              <>
                <span className="progress-context-divider" />
                <button className="danger" type="button" onClick={() => runContextAction(onDelete)}>
                  <Trash2 size={14} />
                  Löschen
                </button>
              </>
            ) : null}
          </div>
        </>
      ) : null}
    </aside>
  );
}

function ProgressMiniStat({ label, tone, value }: { label: string; tone: Tone; value: string }) {
  return (
    <article className={`progress-mini-stat ${tone}`}>
      <span />
      <small>{label}</small>
      <strong>{value}</strong>
    </article>
  );
}

function ProgressMetricCard({
  detail,
  icon: Icon,
  label,
  tone,
  value
}: {
  detail: string;
  icon: NavIcon;
  label: string;
  tone: Tone;
  value: string;
}) {
  return (
    <article className={`progress-metric-card ${tone}`}>
      <span className="progress-metric-icon">
        <Icon size={20} />
      </span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
        <em>{detail}</em>
      </div>
    </article>
  );
}

function ProgressScopeSelect({
  disabled,
  icon: Icon,
  label,
  onChange,
  options,
  step,
  value
}: {
  disabled?: boolean;
  icon: NavIcon;
  label: string;
  onChange: (value: string) => void;
  options: ProgressNode[];
  step: string;
  value: string;
}) {
  return (
    <label className={`progress-scope-select ${disabled ? "disabled" : ""}`}>
      <span className="scope-step">{step}</span>
      <span className="scope-icon">
        <Icon size={15} />
      </span>
      <span className="scope-copy">
        <small>{label}</small>
        <select disabled={disabled || !options.length} value={value} onChange={(event) => onChange(event.target.value)}>
          {!options.length ? <option value="">Noch kein Eintrag</option> : null}
          {options.map((item) => (
            <option key={item.id} value={item.id}>{item.title}</option>
          ))}
        </select>
      </span>
      <ChevronDown size={15} />
    </label>
  );
}

function ProgressSummaryStat({ dot, label, value }: { dot?: Tone; label: string; value: string }) {
  return (
    <div className="progress-summary-stat">
      {dot ? <span className={`summary-dot ${dot}`} /> : null}
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  );
}

function ProgressTable({
  defects,
  items,
  onAddItem,
  onEdit,
  onOpenDefectEditor,
  onPreviewAttachment,
  onRename,
  onStatusChange,
  onToggleDone,
  totalCount,
  variant = "active"
}: {
  defects: SiteDefect[];
  items: ProgressNode[];
  onAddItem?: () => void;
  onEdit: (id: string) => void;
  onOpenDefectEditor: (id: string) => void;
  onPreviewAttachment: (attachment: ProgressAttachment) => void;
  onRename: (id: string, title: string) => void;
  onStatusChange: (id: string, status: ProgressNode["status"]) => void;
  onToggleDone: (id: string) => void;
  totalCount: number;
  variant?: "active" | "completed";
}) {
  const label = variant === "completed" ? "erledigten" : "offenen";

  if (!items.length) {
    return (
      <section className="progress-table-card empty">
        <div className="progress-empty table-empty">
          <ClipboardList size={18} />
          <strong>Keine {label} Punkte in dieser Auswahl.</strong>
          <small>Wähle einen anderen Bereich oder lege einen neuen Eintrag an.</small>
          {onAddItem ? (
            <button className="progress-empty-add" type="button" onClick={onAddItem}>
              <Plus size={14} />
              Punkt hinzufügen
            </button>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section className="progress-table-card">
      <div className="progress-table-scroll">
        <div className="progress-table-grid progress-table-header">
          <span />
          <span>Titel</span>
          <span>Status</span>
          <span>Zugewiesen</span>
          <span>Anhänge</span>
          <span>Mangel</span>
          <span />
        </div>
        {items.map((item) => (
          <ProgressTableRow
            defects={defects}
            item={item}
            key={item.id}
            onEdit={onEdit}
            onOpenDefectEditor={onOpenDefectEditor}
            onPreviewAttachment={onPreviewAttachment}
            onRename={onRename}
            onStatusChange={onStatusChange}
            onToggleDone={onToggleDone}
          />
        ))}
        {onAddItem ? (
          <button className="progress-table-grid progress-add-row" type="button" onClick={onAddItem}>
            <span />
            <span className="progress-add-row-label">
              <Plus size={14} />
              Punkt hinzufügen
            </span>
            <span />
            <span />
            <span />
            <span />
            <span />
          </button>
        ) : null}
      </div>
      <div className="progress-table-footer">
        <span>{items.length} von {totalCount} Punkten sichtbar</span>
      </div>
    </section>
  );
}

function ProgressTableRow({
  defects,
  item,
  onEdit,
  onOpenDefectEditor,
  onPreviewAttachment,
  onRename,
  onStatusChange,
  onToggleDone
}: {
  defects: SiteDefect[];
  item: ProgressNode;
  onEdit: (id: string) => void;
  onOpenDefectEditor: (id: string) => void;
  onPreviewAttachment: (attachment: ProgressAttachment) => void;
  onRename: (id: string, title: string) => void;
  onStatusChange: (id: string, status: ProgressNode["status"]) => void;
  onToggleDone: (id: string) => void;
}) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(item.title);
  const openDefectCount = defects.filter((defect) => defect.progressItemId === item.id && defect.status !== "Erledigt").length;
  const assignee = item.assignees[0] ?? "Nicht zugewiesen";
  const statusClass = item.status === "Erledigt" ? "done" : item.status === "In Arbeit" ? "in-progress" : "open";

  function commitTitle() {
    const nextTitle = titleDraft.trim();
    if (nextTitle && nextTitle !== item.title) {
      onRename(item.id, nextTitle);
    } else {
      setTitleDraft(item.title);
    }
    setIsEditingTitle(false);
  }

  function cancelTitleEdit() {
    setTitleDraft(item.title);
    setIsEditingTitle(false);
  }

  return (
    <div className={`progress-table-grid progress-table-row ${item.done ? "done" : ""}`}>
      <div className="progress-table-check">
        <input checked={Boolean(item.done)} aria-label={`${item.title} erledigt`} onChange={() => onToggleDone(item.id)} type="checkbox" />
      </div>

      <div className="progress-table-title">
        <span className="row-handle" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
        </span>
        {isEditingTitle ? (
          <input
            autoFocus
            className="progress-table-title-input"
            style={{ width: `${Math.max(10, titleDraft.length + 2)}ch` }}
            value={titleDraft}
            onBlur={commitTitle}
            onChange={(event) => setTitleDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.currentTarget.blur();
              }
              if (event.key === "Escape") {
                cancelTitleEdit();
              }
            }}
          />
        ) : (
          <button className="progress-table-title-button" type="button" onClick={() => setIsEditingTitle(true)}>
            {item.title}
          </button>
        )}
      </div>

      <div className={`progress-status-control ${statusClass}`}>
        <span />
        <select value={item.status} onChange={(event) => onStatusChange(item.id, event.target.value as ProgressNode["status"])}>
          <option value="Offen">Offen</option>
          <option value="In Arbeit">In Arbeit</option>
          <option value="Erledigt">Erledigt</option>
        </select>
      </div>

      <div className="progress-assignee">
        <AssigneeAvatar name={assignee} />
        <span>{assignee}</span>
      </div>

      <div className="progress-attachment-cell">
        {item.attachments.length ? (
          <button type="button" onClick={() => onPreviewAttachment(item.attachments[0])}>
            <FileCheck2 size={14} />
            {item.attachments.length}
          </button>
        ) : (
          <span>-</span>
        )}
      </div>

      <div className="progress-defect-cell">
        <button
          aria-label={openDefectCount ? "Offenen Mangel bearbeiten" : "Mangel erstellen"}
          className={openDefectCount ? "active" : ""}
          type="button"
          onClick={() => onOpenDefectEditor(item.id)}
        >
          {openDefectCount ? <AlertTriangle size={16} /> : "Mangel erstellen"}
        </button>
      </div>

      <button className="progress-row-menu" type="button" aria-label={`${item.title} bearbeiten`} onClick={() => onEdit(item.id)}>
        ...
      </button>
    </div>
  );
}

function AssigneeAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return <span className="assignee-avatar">{initials || "?"}</span>;
}

function SiteDefectsModern({ defects, progressItems, projects, selectedProject, toggleDefect, setModal, setToast }: SiteManagerProps) {
  const projectDefects = defects.filter((defect) => defect.projectId === selectedProject.id);

  return (
    <section className="dashboard-card site-feature wide">
      <WidgetHeader title="Mängel" />
      <div className="site-toolbar">
        <button type="button" onClick={() => setModal("defect")}><Plus size={15} /> Mangel aufnehmen</button>
        <button type="button" onClick={() => setToast("Nur offene Mängel werden angezeigt.")}><Filter size={15} /> Offen filtern</button>
      </div>
      <DataRows>
        {projectDefects.map((defect) => (
          <div className="data-row defect-data-row" key={defect.id}>
            <span className={`priority ${defect.priority.toLowerCase()}`}>{defect.priority}</span>
            <div>
              <strong>{defect.title}</strong>
              <small>{getProgressPathLabel(defect.progressItemId, progressItems, defect.progressPath)}</small>
              <p>{defect.description}</p>
            </div>
            <small>{projects.find((project) => project.id === defect.projectId)?.name} - {defect.owner} - {defect.status} - {defect.createdAt}</small>
            <button type="button" onClick={() => toggleDefect(defect.id)}>{defect.status === "Erledigt" ? "Wieder öffnen" : "Erledigen"}</button>
          </div>
        ))}
        {projectDefects.length === 0 ? <EmptyDataRow text="Keine Mängel für dieses Projekt." /> : null}
      </DataRows>
    </section>
  );
}

function SiteDefects({ defects, projects, selectedProject, toggleDefect, setModal, setToast }: SiteManagerProps) {
  const projectDefects = defects.filter((defect) => defect.projectId === selectedProject.id);

  return (
    <section className="dashboard-card site-feature wide">
      <WidgetHeader title="Mängel" />
      <div className="site-toolbar">
        <button type="button" onClick={() => setModal("defect")}><Plus size={15} /> Mangel aufnehmen</button>
        <button type="button" onClick={() => setToast("Nur offene Mängel werden angezeigt.")}><Filter size={15} /> Offen filtern</button>
      </div>
      <DataRows>
        {projectDefects.map((defect) => (
          <div className="data-row" key={defect.id}>
            <span className={`priority ${defect.priority.toLowerCase()}`}>{defect.priority}</span>
            <strong>{defect.title}</strong>
            <small>{projects.find((project) => project.id === defect.projectId)?.name} · {defect.owner}</small>
            <button type="button" onClick={() => toggleDefect(defect.id)}>{defect.status === "Erledigt" ? "Wieder öffnen" : "Erledigen"}</button>
          </div>
        ))}
        {projectDefects.length === 0 ? <EmptyDataRow text="Keine Mängel für dieses Projekt." /> : null}
      </DataRows>
    </section>
  );
}

function SiteTasks({ tasks, projects, selectedProject, toggleTask, setModal }: SiteManagerProps) {
  const projectTasks = tasks.filter((task) => task.projectId === selectedProject.id);

  return (
    <section className="dashboard-card site-feature wide">
      <WidgetHeader title="Aufgaben" />
      <div className="site-toolbar">
        <button type="button" onClick={() => setModal("task")}><Plus size={15} /> Aufgabe erstellen</button>
      </div>
      <DataRows>
        {projectTasks.map((task) => (
          <div className={`data-row ${task.done ? "done" : ""}`} key={task.id}>
            <button className="check-button" type="button" onClick={() => toggleTask(task.id)}>{task.done ? <Check size={14} /> : null}</button>
            <strong>{task.title}</strong>
            <small>{projects.find((project) => project.id === task.projectId)?.name} · {task.owner} · {task.due}</small>
            <span>{task.done ? "Erledigt" : "Offen"}</span>
          </div>
        ))}
        {projectTasks.length === 0 ? <EmptyDataRow text="Keine Aufgaben für dieses Projekt." /> : null}
      </DataRows>
    </section>
  );
}

function SiteNotes({ addNote, noteDraft, notes, projects, selectedProject, setNoteDraft }: SiteManagerProps) {
  const projectNotes = notes.filter((note) => note.projectId === selectedProject.id);

  return (
    <div className="site-grid">
      <section className="dashboard-card site-feature">
        <WidgetHeader title="Neue Notiz" />
        <textarea className="note-input" value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} placeholder="Notiz zur Baustelle..." />
        <button className="primary-action compact-action" type="button" onClick={addNote}><Save size={15} /> Speichern</button>
      </section>
      <section className="dashboard-card site-feature wide">
        <WidgetHeader title="Baustellen-Journal" />
        <DataRows>
          {projectNotes.map((note) => (
            <div className="data-row" key={note.id}>
              <span>{note.pinned ? <Flag size={14} /> : <MessageSquareText size={14} />}</span>
              <strong>{note.text}</strong>
              <small>{projects.find((project) => project.id === note.projectId)?.name} · {note.time}</small>
            </div>
          ))}
          {projectNotes.length === 0 ? <EmptyDataRow text="Noch keine Notizen für dieses Projekt." /> : null}
        </DataRows>
      </section>
    </div>
  );
}

function SiteDocumentation({ addDocument, documents, projects, selectedProject, setToast }: SiteManagerProps) {
  const projectDocuments = documents.filter((document) => document.projectId === selectedProject.id);

  return (
    <section className="dashboard-card site-feature wide">
      <WidgetHeader title="Dokumentation" />
      <div className="site-toolbar">
        <button type="button" onClick={() => addDocument("Foto")}><Camera size={15} /> Foto hinzufügen</button>
        <button type="button" onClick={() => addDocument("Protokoll")}><Upload size={15} /> Protokoll hochladen</button>
      </div>
      <DataRows>
        {projectDocuments.map((document) => (
          <div className="data-row" key={document.id}>
            <span>{document.kind === "Foto" ? <ImageIcon size={14} /> : <FileCheck2 size={14} />}</span>
            <strong>{document.name}</strong>
            <small>{projects.find((project) => project.id === document.projectId)?.name} · {document.kind} · {document.updated}</small>
            <button type="button" onClick={() => setToast(`${document.name} wurde vorbereitet.`)}><Download size={14} /> Öffnen</button>
          </div>
        ))}
        {projectDocuments.length === 0 ? <EmptyDataRow text="Noch keine Dokumentation für dieses Projekt." /> : null}
      </DataRows>
    </section>
  );
}

function SiteReports({ generateReport, reports, setReports, setToast }: SiteManagerProps) {
  function sendReport(reportId: string) {
    setReports((current) => current.map((report) => (report.id === reportId ? { ...report, status: "Gesendet" } : report)));
    setToast("Bericht wurde per Mail versendet.");
  }

  return (
    <section className="dashboard-card site-feature wide">
      <WidgetHeader title="Berichte" />
      <div className="site-toolbar">
        <button type="button" onClick={generateReport}><FileText size={15} /> PDF erstellen</button>
        <button type="button" onClick={() => setToast("Mail-Verteiler aktualisiert.")}><Mail size={15} /> Mail-Verteiler</button>
      </div>
      <DataRows>
        {reports.map((report) => (
          <div className="data-row" key={report.id}>
            <span><FileText size={14} /></span>
            <strong>{report.name}</strong>
            <small>{report.target} · {report.time} · {report.status}</small>
            <button type="button" onClick={() => sendReport(report.id)}>{report.status === "Gesendet" ? "Gesendet" : "Senden"}</button>
          </div>
        ))}
      </DataRows>
    </section>
  );
}

function SiteSettings({ setSiteSettings, setToast, siteSettings }: SiteManagerProps) {
  const settings = [
    { key: "photoRequired" as const, label: "Fotos bei Mängeln verpflichtend", value: siteSettings.photoRequired },
    { key: "autoReports" as const, label: "Wochenberichte automatisch vorbereiten", value: siteSettings.autoReports },
    { key: "customerPortal" as const, label: "Kundenportal aktivieren", value: siteSettings.customerPortal },
    { key: "defectApproval" as const, label: "Mängel-Freigabe durch Projektleitung", value: siteSettings.defectApproval }
  ];

  return (
    <section className="dashboard-card site-feature wide">
      <WidgetHeader title="SiteManager Einstellungen" />
      <div className="settings-list-modern">
        {settings.map((item) => (
          <label className="toggle-line" key={item.key}>
            <span>{item.label}</span>
            <input
              type="checkbox"
              checked={item.value}
              onChange={(event) => {
                setSiteSettings((current) => ({ ...current, [item.key]: event.target.checked }));
                setToast("Einstellung gespeichert.");
              }}
            />
          </label>
        ))}
      </div>
    </section>
  );
}

function ProgressTree({
  defects,
  expandedIds,
  items,
  onAddChild,
  onEdit,
  onOpenDefectEditor,
  onPreviewAttachment,
  onRename,
  onToggleDone,
  onToggleExpanded,
  query,
  mode = "active"
}: {
  defects: SiteDefect[];
  expandedIds: Record<string, boolean>;
  items: ProgressNode[];
  mode?: "active" | "completed";
  onAddChild: (parentId: string | null) => void;
  onEdit: (id: string) => void;
  onOpenDefectEditor: (id: string) => void;
  onPreviewAttachment: (attachment: ProgressAttachment) => void;
  onRename: (id: string, title: string) => void;
  onToggleDone: (id: string) => void;
  onToggleExpanded: (id: string) => void;
  query: string;
}) {
  const normalizedQuery = query.trim().toLowerCase();
  const childrenByParent = items.reduce((map, item) => {
    const key = item.parentId ?? "root";
    const children = map.get(key) ?? [];
    children.push(item);
    map.set(key, children);
    return map;
  }, new Map<string, ProgressNode[]>());

  function getChildren(parentId: string | null) {
    return childrenByParent.get(parentId ?? "root") ?? [];
  }

  function itemMatches(item: ProgressNode) {
    if (!normalizedQuery) {
      return true;
    }

    const searchText = [
      item.title,
      item.description,
      progressTypeCopy[item.type].label,
      item.status,
      ...item.assignees,
      ...item.attachments.map((attachment) => attachment.name)
    ].join(" ").toLowerCase();

    return searchText.includes(normalizedQuery);
  }

  function branchMatches(item: ProgressNode): boolean {
    const children = getChildren(item.id);
    const childMatches = children.some((child) => branchMatches(child));

    if (item.type !== "task") {
      if (mode === "completed") {
        return childMatches;
      }
      return childMatches || (children.length === 0 && itemMatches(item)) || (normalizedQuery ? itemMatches(item) : false);
    }

    const modeMatches = mode === "completed" ? Boolean(item.done) : !item.done;
    return modeMatches && itemMatches(item);
  }

  function renderNode(item: ProgressNode, depth: number): ReactNode {
    if (normalizedQuery && !branchMatches(item)) {
      return null;
    }

    if (!normalizedQuery && !branchMatches(item)) {
      return null;
    }

    const children = getChildren(item.id);
    const hasChildren = children.length > 0;
    const isOpen = normalizedQuery ? true : expandedIds[item.id] ?? true;

    return (
      <div className="progress-branch" key={item.id}>
        <ProgressTreeRowModern
          depth={depth}
          hasChildren={hasChildren}
          isOpen={isOpen}
          item={item}
          openDefectCount={defects.filter((defect) => defect.progressItemId === item.id && defect.status !== "Erledigt").length}
          onAddChild={onAddChild}
          onEdit={onEdit}
          onOpenDefectEditor={onOpenDefectEditor}
          onPreviewAttachment={onPreviewAttachment}
          onRename={onRename}
          onToggleDone={onToggleDone}
          onToggleExpanded={onToggleExpanded}
        />
        {hasChildren && isOpen ? children.map((child) => renderNode(child, Math.min(depth + 1, 3))) : null}
      </div>
    );
  }

  const roots = getChildren(null);
  const renderedRoots = roots.map((item) => renderNode(item, 0)).filter(Boolean);

  if (!renderedRoots.length) {
    return (
      <div className="progress-empty">
        <FolderKanban size={18} />
        <strong>{mode === "completed" ? "Noch keine erledigten Punkte." : "Keine offenen Punkte."}</strong>
        <small>{mode === "completed" ? "Abgehakte Aufgaben erscheinen hier." : "Lege einen Bereich oder eine Aufgabe an."}</small>
      </div>
    );
  }

  return <div className="progress-tree">{renderedRoots}</div>;
}

function ProgressTreeRow({
  depth,
  hasChildren,
  isOpen,
  item,
  onAddChild,
  onEdit,
  onToggleDone,
  onToggleExpanded
}: {
  depth: number;
  hasChildren: boolean;
  isOpen: boolean;
  item: ProgressNode;
  onAddChild: (parentId: string | null) => void;
  onEdit: (id: string) => void;
  onToggleDone: (id: string) => void;
  onToggleExpanded: (id: string) => void;
}) {
  const childType = progressTypeCopy[item.type].child;
  const label = progressTypeCopy[item.type].label;
  const Icon = item.type === "area" ? FolderKanban : item.type === "task" ? CheckCircle2 : FileText;

  return (
    <div className={`progress-tree-row level-${depth} ${item.type} ${item.done ? "done" : ""}`}>
      <button
        className={`progress-expand ${isOpen ? "open" : ""}`}
        type="button"
        aria-label={hasChildren ? `${item.title} ${isOpen ? "zuklappen" : "aufklappen"}` : "Keine Unterpunkte"}
        onClick={() => (hasChildren ? onToggleExpanded(item.id) : undefined)}
        disabled={!hasChildren}
      >
        {hasChildren ? <ChevronDown size={14} /> : null}
      </button>

      {item.type === "task" ? (
        <input
          aria-label={`${item.title} erledigt`}
          checked={Boolean(item.done)}
          className="progress-checkbox"
          onChange={() => onToggleDone(item.id)}
          type="checkbox"
        />
      ) : (
        <span className="progress-checkbox-spacer" />
      )}

      <button className="progress-row-main" type="button" onClick={() => onEdit(item.id)}>
        <span className="progress-row-icon">
          <Icon size={15} />
        </span>
        <span className="progress-row-copy">
          <strong>{item.title}</strong>
          <small>
            {label} · {item.status}
            {item.assignees.length ? ` · ${item.assignees.join(", ")}` : ""}
          </small>
        </span>
      </button>

      <div className="progress-row-meta">
        {item.attachments.length ? <span>{item.attachments.length} Anhang</span> : null}
        {childType ? (
          <button type="button" onClick={() => onAddChild(item.id)}>
            <Plus size={13} />
            {progressTypeCopy[item.type].createLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function ProgressTreeRowModern({
  depth,
  hasChildren,
  isOpen,
  item,
  openDefectCount,
  onAddChild,
  onEdit,
  onOpenDefectEditor,
  onPreviewAttachment,
  onRename,
  onToggleDone,
  onToggleExpanded
}: {
  depth: number;
  hasChildren: boolean;
  isOpen: boolean;
  item: ProgressNode;
  openDefectCount: number;
  onAddChild: (parentId: string | null) => void;
  onEdit: (id: string) => void;
  onOpenDefectEditor: (id: string) => void;
  onPreviewAttachment: (attachment: ProgressAttachment) => void;
  onRename: (id: string, title: string) => void;
  onToggleDone: (id: string) => void;
  onToggleExpanded: (id: string) => void;
}) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(item.title);
  const childType = progressTypeCopy[item.type].child;
  const label = progressTypeCopy[item.type].label;
  const Icon = item.type === "area" ? FolderKanban : item.type === "task" ? CheckCircle2 : FileText;

  function commitTitle() {
    const nextTitle = titleDraft.trim();
    if (nextTitle && nextTitle !== item.title) {
      onRename(item.id, nextTitle);
    } else {
      setTitleDraft(item.title);
    }
    setIsEditingTitle(false);
  }

  function cancelTitleEdit() {
    setTitleDraft(item.title);
    setIsEditingTitle(false);
  }

  return (
    <div className={`progress-tree-row level-${depth} ${item.type} ${item.done ? "done" : ""} ${openDefectCount ? "has-defect" : ""}`}>
      <button
        className={`progress-expand ${isOpen ? "open" : ""}`}
        type="button"
        aria-label={hasChildren ? `${item.title} ${isOpen ? "zuklappen" : "aufklappen"}` : "Keine Unterpunkte"}
        onClick={() => (hasChildren ? onToggleExpanded(item.id) : undefined)}
        disabled={!hasChildren}
      >
        {hasChildren ? <ChevronDown size={14} /> : null}
      </button>

      {item.type === "task" ? (
        <input
          aria-label={`${item.title} erledigt`}
          checked={Boolean(item.done)}
          className="progress-checkbox"
          onChange={() => onToggleDone(item.id)}
          type="checkbox"
        />
      ) : (
        <span className="progress-checkbox-spacer" />
      )}

      <div className="progress-row-main">
        <button className="progress-row-icon" type="button" onClick={() => onEdit(item.id)} aria-label={`${item.title} bearbeiten`}>
          <Icon size={15} />
        </button>
        <span className="progress-row-copy">
          {isEditingTitle ? (
            <input
              autoFocus
              className="progress-title-input"
              style={{ width: `${Math.max(8, titleDraft.length + 2)}ch` }}
              value={titleDraft}
              onBlur={commitTitle}
              onChange={(event) => setTitleDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.currentTarget.blur();
                }
                if (event.key === "Escape") {
                  cancelTitleEdit();
                }
              }}
            />
          ) : (
            <button className="progress-title-button" type="button" onClick={() => setIsEditingTitle(true)}>
              <strong>{item.title}</strong>
            </button>
          )}
          <button className="progress-subtitle-button" type="button" onClick={() => onEdit(item.id)}>
            {label} - {item.status}
            {item.assignees.length ? ` - ${item.assignees.join(", ")}` : ""}
          </button>
        </span>
      </div>

      <div className="progress-row-meta">
        {item.attachments.length ? (
          <button className="row-attachment-pill" type="button" onClick={() => onPreviewAttachment(item.attachments[0])}>
            <FileCheck2 size={13} />
            {item.attachments.length} Anhang
          </button>
        ) : null}
        {childType ? (
          <button type="button" onClick={() => onAddChild(item.id)}>
            <Plus size={13} />
            {progressTypeCopy[item.type].createLabel}
          </button>
        ) : null}
        {!childType || openDefectCount ? (
          <button className={openDefectCount ? "row-defect-action active" : ""} type="button" onClick={() => onOpenDefectEditor(item.id)}>
            <AlertTriangle size={13} />
            {openDefectCount ? "Mangel" : "Mangel erstellen"}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function ProgressEditorModal({
  item,
  openDefectCount,
  onAttach,
  onClose,
  onDelete,
  onOpenDefectEditor,
  onPreviewAttachment,
  onToggleAssignee,
  onToggleDone,
  onUpdate,
  users
}: {
  item: ProgressNode;
  openDefectCount: number;
  onAttach: (itemId: string, kind: ProgressAttachment["kind"], files: FileList | null) => void;
  onClose: () => void;
  onDelete: (itemId: string) => void;
  onOpenDefectEditor: (itemId: string) => void;
  onPreviewAttachment: (attachment: ProgressAttachment) => void;
  onToggleAssignee: (itemId: string, userName: string) => void;
  onToggleDone: (itemId: string) => void;
  onUpdate: (itemId: string, updates: Partial<ProgressNode>) => void;
  users: string[];
}) {
  function handleFiles(kind: ProgressAttachment["kind"], files: FileList | null) {
    onAttach(item.id, kind, files);
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-panel progress-modal-panel" role="dialog" aria-modal="true">
        <button className="modal-close" type="button" onClick={onClose}><X size={16} /></button>
        <span>{progressTypeCopy[item.type].label}</span>
        <h2>Eintrag bearbeiten</h2>

        <div className="progress-editor-grid">
          <label className="editor-field">
            <span>Titel</span>
            <input value={item.title} onChange={(event) => onUpdate(item.id, { title: event.target.value })} />
          </label>

          <label className="editor-field">
            <span>Beschreibung / Details</span>
            <textarea
              value={item.description}
              onChange={(event) => onUpdate(item.id, { description: event.target.value })}
              placeholder="Details, Hinweise oder nächste Schritte..."
            />
          </label>

          {item.type === "task" ? (
            <div className="editor-status-row">
              <label className="editor-field">
                <span>Status</span>
                <select
                  value={item.status}
                  onChange={(event) => {
                    const status = event.target.value as ProgressNode["status"];
                    onUpdate(item.id, { status, done: status === "Erledigt" });
                  }}
                >
                  <option>Offen</option>
                  <option>In Arbeit</option>
                  <option>Erledigt</option>
                </select>
              </label>
              <label className="editor-checkline">
                <input checked={Boolean(item.done)} onChange={() => onToggleDone(item.id)} type="checkbox" />
                Aufgabe erledigt
              </label>
            </div>
          ) : null}

          <div className="editor-section">
            <span>Benutzer zuweisen</span>
            <div className="assignee-grid">
              {users.map((user) => (
                <button
                  className={item.assignees.includes(user) ? "selected" : ""}
                  key={user}
                  type="button"
                  onClick={() => onToggleAssignee(item.id, user)}
                >
                  <UsersRound size={13} />
                  {user}
                </button>
              ))}
            </div>
          </div>

          <div className="editor-section">
            <span>Anhänge</span>
            <div className="attachment-actions">
              <label className="upload-action">
                <Camera size={14} />
                Foto hinzufügen
                <input
                  accept="image/*"
                  type="file"
                  onChange={(event) => {
                    handleFiles("Foto", event.currentTarget.files);
                    event.currentTarget.value = "";
                  }}
                />
              </label>
              <label className="upload-action">
                <Camera size={14} />
                Kamera
                <input
                  accept="image/*"
                  capture="environment"
                  type="file"
                  onChange={(event) => {
                    handleFiles("Foto", event.currentTarget.files);
                    event.currentTarget.value = "";
                  }}
                />
              </label>
              <label className="upload-action">
                <Upload size={14} />
                Datei hinzufügen
                <input
                  type="file"
                  onChange={(event) => {
                    handleFiles("Datei", event.currentTarget.files);
                    event.currentTarget.value = "";
                  }}
                />
              </label>
            </div>
            <ProgressAttachmentList attachments={item.attachments} onPreview={onPreviewAttachment} />
            <div className="attachment-list" hidden>
              {item.attachments.map((attachment) => (
                <div key={attachment.id}>
                  <span>{attachment.kind === "Foto" ? <ImageIcon size={13} /> : <FileText size={13} />}</span>
                  <strong>{attachment.name}</strong>
                  <small>{attachment.kind} · {attachment.time}</small>
                </div>
              ))}
              {!item.attachments.length ? <small className="empty-attachments">Noch keine Anhänge.</small> : null}
            </div>
          </div>
        </div>

        <div className="modal-actions progress-modal-actions">
          <button className="danger-action" type="button" onClick={() => onDelete(item.id)}>
            <X size={15} />
            Löschen
          </button>
          <button className={`secondary-action defect-action ${openDefectCount ? "has-open-defect" : ""}`} type="button" onClick={() => onOpenDefectEditor(item.id)}>
            <AlertTriangle size={15} />
            {openDefectCount ? "Mangel" : "Mangel erstellen"}
          </button>
          <button className="primary-action" type="button" onClick={onClose}>Fertig</button>
        </div>
      </section>
    </div>
  );
}

function ProgressAttachmentList({
  attachments,
  onPreview
}: {
  attachments: ProgressAttachment[];
  onPreview: (attachment: ProgressAttachment) => void;
}) {
  if (!attachments.length) {
    return <small className="empty-attachments">Noch keine Anhänge.</small>;
  }

  return (
    <div className="attachment-list">
      {attachments.map((attachment) => (
        <button className="attachment-item" key={attachment.id} type="button" onClick={() => onPreview(attachment)}>
          <span className="attachment-thumb">
            {attachment.kind === "Foto" && attachment.url ? (
              <img src={attachment.url} alt={attachment.name} />
            ) : attachment.kind === "Foto" ? (
              <ImageIcon size={13} />
            ) : (
              <FileText size={13} />
            )}
          </span>
          <strong>{attachment.name}</strong>
          <small>{attachment.kind} - {attachment.time}</small>
        </button>
      ))}
    </div>
  );
}

function ProgressDefectModal({
  draft,
  onAttach,
  onClose,
  onPreviewAttachment,
  onSave,
  onUpdate,
  path,
  users
}: {
  draft: DefectDraft;
  onAttach: (kind: ProgressAttachment["kind"], files: FileList | null) => void;
  onClose: () => void;
  onPreviewAttachment: (attachment: ProgressAttachment) => void;
  onSave: () => void;
  onUpdate: (updates: Partial<DefectDraft>) => void;
  path: string;
  users: string[];
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-panel progress-modal-panel defect-modal-panel" role="dialog" aria-modal="true">
        <button className="modal-close" type="button" onClick={onClose}><X size={16} /></button>
        <span>Mangel aus Open Point</span>
        <h2>Mangel bearbeiten</h2>
        <p>{path}</p>

        <div className="progress-editor-grid">
          <label className="editor-field">
            <span>Titel</span>
            <input value={draft.title} onChange={(event) => onUpdate({ title: event.target.value })} />
          </label>
          <label className="editor-field">
            <span>Beschreibung</span>
            <textarea value={draft.description} onChange={(event) => onUpdate({ description: event.target.value })} />
          </label>
          <div className="editor-status-row">
            <label className="editor-field">
              <span>Status</span>
              <select value={draft.status} onChange={(event) => onUpdate({ status: event.target.value as SiteDefect["status"] })}>
                <option>Offen</option>
                <option>In Arbeit</option>
                <option>Erledigt</option>
              </select>
            </label>
            <label className="editor-field">
              <span>Priorität</span>
              <select value={draft.priority} onChange={(event) => onUpdate({ priority: event.target.value as SiteDefect["priority"] })}>
                <option>Hoch</option>
                <option>Mittel</option>
                <option>Niedrig</option>
              </select>
            </label>
            <label className="editor-field">
              <span>Zuständig</span>
              <select value={draft.owner} onChange={(event) => onUpdate({ owner: event.target.value })}>
                {users.map((user) => <option key={user}>{user}</option>)}
              </select>
            </label>
          </div>

          <div className="editor-section">
            <span>Foto und Dateien</span>
            <div className="attachment-actions">
              <label className="upload-action">
                <Camera size={14} />
                Foto hinzufügen
                <input
                  accept="image/*"
                  type="file"
                  onChange={(event) => {
                    onAttach("Foto", event.currentTarget.files);
                    event.currentTarget.value = "";
                  }}
                />
              </label>
              <label className="upload-action">
                <Camera size={14} />
                Kamera
                <input
                  accept="image/*"
                  capture="environment"
                  type="file"
                  onChange={(event) => {
                    onAttach("Foto", event.currentTarget.files);
                    event.currentTarget.value = "";
                  }}
                />
              </label>
              <label className="upload-action">
                <Upload size={14} />
                Datei hinzufügen
                <input
                  type="file"
                  onChange={(event) => {
                    onAttach("Datei", event.currentTarget.files);
                    event.currentTarget.value = "";
                  }}
                />
              </label>
            </div>
            <ProgressAttachmentList attachments={draft.attachments} onPreview={onPreviewAttachment} />
          </div>
        </div>

        <div className="modal-actions progress-modal-actions">
          <button className="secondary-action" type="button" onClick={onClose}>Abbrechen</button>
          <button className="primary-action" type="button" onClick={onSave}>Mangel speichern</button>
        </div>
      </section>
    </div>
  );
}

function AttachmentPreviewModal({ attachment, onClose }: { attachment: ProgressAttachment; onClose: () => void }) {
  const isImage = attachment.kind === "Foto" && attachment.url;
  const isPdf = attachment.mimeType === "application/pdf" && attachment.url;

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-panel attachment-preview-panel" role="dialog" aria-modal="true">
        <button className="modal-close" type="button" onClick={onClose}><X size={16} /></button>
        <span>{attachment.kind}</span>
        <h2>{attachment.name}</h2>
        <div className="attachment-preview-stage">
          {isImage ? (
            <img src={attachment.url} alt={attachment.name} />
          ) : isPdf ? (
            <iframe src={attachment.url} title={attachment.name} />
          ) : (
            <div className="file-preview-placeholder">
              <FileText size={28} />
              <strong>{attachment.name}</strong>
              <small>Vorschau für diesen Dateityp ist eingeschränkt.</small>
            </div>
          )}
        </div>
        <div className="modal-actions">
          {attachment.url ? (
            <a className="secondary-action" href={attachment.url} target="_blank" rel="noreferrer">Öffnen</a>
          ) : null}
          <button className="primary-action" type="button" onClick={onClose}>Schliessen</button>
        </div>
      </section>
    </div>
  );
}

function CircularProgress({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="circular-progress" style={{ "--progress-angle": `${clamped * 3.6}deg` } as CSSProperties} aria-label={`${clamped} Prozent`}>
      <span>{clamped}%</span>
    </div>
  );
}

function ProgressBoard({ projects, onUpdate }: { projects: SiteProject[]; onUpdate: (projectId: string, delta: number) => void }) {
  return (
    <div className="progress-board">
      {projects.map((project) => (
        <div className="progress-line" key={project.id}>
          <div>
            <strong>{project.name}</strong>
            <small>{project.status} · fällig {project.due}</small>
          </div>
          <ProgressBar value={project.progress} tone={project.progress > 70 ? "green" : "blue"} />
          <span>{project.progress}%</span>
          <button type="button" onClick={() => onUpdate(project.id, -5)}>-5</button>
          <button type="button" onClick={() => onUpdate(project.id, 5)}>+5</button>
        </div>
      ))}
    </div>
  );
}

function ProjectSummary({ project, onOpen }: { project: SiteProject; onOpen: () => void }) {
  return (
    <button className="project-summary" type="button" onClick={onOpen}>
      <span><MapPinned size={15} /></span>
      <div>
        <strong>{project.name}</strong>
        <small>{project.location} · {project.progress}%</small>
      </div>
      <ArrowUpRight size={14} />
    </button>
  );
}

function DataRows({ children }: { children: ReactNode }) {
  return <div className="data-rows">{children}</div>;
}

function EmptyDataRow({ text }: { text: string }) {
  return (
    <div className="data-row empty-data-row">
      <span>
        <FileText size={14} />
      </span>
      <strong>{text}</strong>
      <small>Projektkontext ist aktiv.</small>
    </div>
  );
}

function ActionModal({
  modal,
  onClose,
  onConfirm,
  project
}: {
  modal: "project" | "defect" | "task" | "report";
  onClose: () => void;
  onConfirm: () => void;
  project: SiteProject;
}) {
  const copy = {
    project: ["Projekt anlegen", "Legt ein neues SiteManager-Projekt mit Standardwerten an."],
    defect: ["Mangel aufnehmen", `Erstellt einen neuen Mangel für ${project.name}.`],
    task: ["Aufgabe erstellen", `Erstellt eine neue Aufgabe für ${project.name}.`],
    report: ["Bericht erstellen", `Generiert einen Statusbericht für ${project.name}.`]
  }[modal];

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal-panel" role="dialog" aria-modal="true">
        <button className="modal-close" type="button" onClick={onClose}><X size={16} /></button>
        <span>SiteManager Aktion</span>
        <h2>{copy[0]}</h2>
        <p>{copy[1]}</p>
        <div className="modal-actions">
          <button className="secondary-action" type="button" onClick={onClose}>Abbrechen</button>
          <button className="primary-action" type="button" onClick={onConfirm}>Ausführen</button>
        </div>
      </section>
    </div>
  );
}

function StatGrid({ stats }: { stats: StatItem[] }) {
  return (
    <div className="stat-grid site-stat-grid">
      {stats.map((item) => (
        <StatCard key={`${item.label}-${item.value}`} {...item} />
      ))}
    </div>
  );
}

function StatCard({ detail, icon: Icon, label, tone, trend, value }: StatItem) {
  return (
    <article className={`stat-card ${tone}`}>
      <div className="stat-icon">
        <Icon size={20} />
      </div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <em>{trend}</em>
        <small>{detail}</small>
      </div>
    </article>
  );
}

function WidgetHeader({ action, title }: { action?: string; title: string }) {
  return (
    <div className="widget-header">
      <h2>{title}</h2>
      {action ? (
        <button className="widget-select" type="button">
          {action}
          <ChevronDown size={13} />
        </button>
      ) : (
        <button className="widget-more" type="button" aria-label={`${title} Optionen`}>
          ...
        </button>
      )}
    </div>
  );
}

function ProgressBar({ tone, value }: { tone: Tone; value: number }) {
  return (
    <span className={`progress ${tone}`} aria-label={`${value} Prozent`}>
      <span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </span>
  );
}
