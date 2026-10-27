import { addDays, today } from "./date";
import type { Rolle } from "./roles";
import type { Attachment, Data, OpenPoint, Person, PointType, Project, WorkStatus } from "./types";

export const DATA_VERSION = 1;
/** Raise when the demo content changes – visitors then get the new demo. */
export const DEMO_VERSION = 1;

const ts = (daysAgo: number, time = "08:00") => new Date(`${addDays(today(), -daysAgo)}T${time}:00`).toISOString();

/** A clean company: only the admin who sets it up. */
export function createEmpty(): Data {
  const admin: Person = { id: "admin", name: "Admin", title: "Admin", rolle: "admin", managerId: "", email: "", phone: "", active: true };
  return {
    version: DATA_VERSION,
    workspace: { id: "firma", name: "Meine Firma", slug: "meine-firma", address: "" },
    meId: admin.id,
    people: [admin],
    projects: [],
    points: [],
    defects: [],
    tasks: [],
    notes: [],
    documents: [],
    reports: [],
    activity: []
  };
}

/** The sample company visitors get on vysner.com. */
export function createDemo(): Data {
  const d = (n: number) => addDays(today(), n);
  const person = (id: string, name: string, title: string, rolle: Rolle, managerId: string, phone: string): Person => ({
    id,
    name,
    title,
    rolle,
    managerId,
    phone,
    email: `${name.split(" ")[0].toLowerCase()}@muster-elektro.at`,
    active: true
  });
  const people: Person[] = [
    person("gf", "Gerhard Lindner", "Geschäftsführer", "gf", "", "+43 660 9900112"),
    person("ad", "Claudia Fink", "Büro / Administration", "admin", "gf", "+43 660 7788990"),
    person("bl", "Petra Koller", "Bereichsleiterin Elektro", "bereichsleiter", "gf", "+43 660 9012345"),
    person("mj", "Mario Juric", "Teamleiter Elektro", "teamleiter", "bl", "+43 660 1234567"),
    person("jw", "Johann Wagner", "Projektleiter", "projektleiter", "bl", "+43 660 4455667"),
    person("te", "Thomas Ebner", "Montagekoordinator", "koordinator", "bl", "+43 660 5566778"),
    person("ab", "Anna Berger", "Bauleiterin", "bauleiter", "mj", "+43 660 2345678"),
    person("mh", "Manfred Hammer", "Bauleiter", "bauleiter", "mj", "+43 660 1122334"),
    person("ik", "Ivan Kovac", "Elektrotechniker", "monteur", "ab", "+43 660 2233445"),
    person("mp", "Marko Petrovic", "Servicetechniker", "monteur", "ab", "+43 660 3344556"),
    person("lg", "Luka Grbic", "Monteur", "monteur", "ab", "+43 660 3456789"),
    person("sl", "Sabine Leitner", "Kabelzieherin", "monteur", "mh", "+43 660 8901234"),
    person("dh", "Daniel Huber", "Lehrling", "lehrling", "mh", "+43 660 7890123"),
    person("ks", "Kabelbau Steiner", "Subunternehmer", "extern", "te", "+43 7672 67890")
  ];

  const project = (id: string, p: Partial<Project> & Pick<Project, "name" | "client" | "location" | "status" | "managerId" | "memberIds" | "createdBy">): Project => ({
    id,
    number: "",
    start: d(-30),
    due: d(40),
    budget: null,
    description: "",
    color: "#1a5cff",
    settings: { photoRequired: false, defectApproval: true },
    createdAt: ts(40),
    ...p
  });
  const projects: Project[] = [
    project("p1", { number: "P-2601", name: "Semmering Basistunnel", client: "ÖBB Infrastruktur", location: "Mürzzuschlag", status: "active", start: d(-60), due: d(28), managerId: "mj", memberIds: ["ab", "ik", "mp", "lg", "ks"], createdBy: "mj", budget: 218400, color: "#1a5cff", description: "Elektroinstallation Tunnelabschnitt Nord: Kabeltrassen, Verteiler, Beleuchtung." }),
    project("p2", { number: "P-2602", name: "Ladeinfrastruktur Zentrale", client: "eww Gruppe", location: "Wels", status: "planning", start: d(-10), due: d(70), managerId: "jw", memberIds: ["mh", "sl", "dh"], createdBy: "jw", budget: 74900, color: "#7c3aed", description: "24 AC-Ladepunkte und Lastmanagement im Parkdeck." }),
    project("p3", { number: "P-2603", name: "Smart Meter Rollout", client: "Gemeinde Attnang", location: "Attnang", status: "handover", start: d(-90), due: d(-2), managerId: "mj", memberIds: ["mh", "mp", "dh"], createdBy: "mj", budget: 211000, color: "#0891b2", description: "Tausch von 1.200 Zählern, Abnahme mit der Gemeinde." })
  ];

  const att = (id: string, name: string, url: string, kind: Attachment["kind"] = "photo", by = "ik"): Attachment => ({ id, name, kind, mime: kind === "photo" ? "image/jpeg" : "application/pdf", size: 240_000, url, addedBy: by, addedAt: ts(1, "10:20") });

  let order = 0;
  const points: OpenPoint[] = [];
  const pt = (id: string, projectId: string, parentId: string, type: PointType, title: string, status: WorkStatus, assigneeIds: string[], extra: Partial<OpenPoint> = {}) =>
    points.push({ id, projectId, parentId, type, title, description: "", status, assigneeIds, due: "", order: order++, attachments: [], createdBy: "mj", createdAt: ts(20), ...extra });

  pt("a1", "p1", "", "area", "Elektroinstallation Tunnelabschnitt Nord", "in_progress", ["ik"], { description: "Kabelwege, Verteiler und Erstprüfung." });
  pt("a2", "p1", "a1", "section", "Kabeltrassen Ebene 2", "in_progress", ["ik", "mp"]);
  pt("a3", "p1", "a2", "subsection", "Abschnitt B – Querverbindung", "open", ["mp"], { description: "Abstimmung mit Bauleitung, Fotodokumentation erforderlich." });
  pt("t1", "p1", "a3", "task", "Befestigungspunkte prüfen", "open", ["mp"], { due: d(0), description: "Alle Konsolen auf festen Sitz prüfen und Abweichungen dokumentieren.", attachments: [att("f1", "Referenzfoto Abschnitt B.jpg", "/demo/foto1.jpg")] });
  pt("t2", "p1", "a3", "task", "Fotodokumentation hochladen", "done", ["ik"], { doneBy: "ik", doneAt: ts(2, "15:40"), attachments: [att("f2", "Begehung.jpg", "/demo/foto2.jpg")] });
  pt("t3", "p1", "a3", "task", "Kabelbefestigung montieren", "in_progress", ["ik"], { due: d(2), description: "Montagepunkte laut Ausführungsplan befestigen und prüfen." });
  pt("t4", "p1", "a3", "task", "Kabelverlegung prüfen", "open", ["mp"], { due: d(3) });
  pt("t5", "p1", "a3", "task", "Kennzeichnung anbringen", "open", ["ik"], { due: d(5) });
  pt("t6", "p1", "a3", "task", "Durchgangsöffnung abdichten", "open", ["lg"], { due: d(-1), description: "Brandschutzmanschette setzen und Foto speichern.", attachments: [att("f3", "Durchgang vor Abdichtung.jpg", "/demo/foto3.jpg", "photo", "lg")] });
  pt("t7", "p1", "a3", "task", "Erdungskabel anschließen", "in_progress", ["mj"], { due: d(1), description: "Erdungsanschluss herstellen und Durchgangsmessung dokumentieren." });
  pt("a4", "p1", "", "area", "Dokumentation und Abnahme", "open", ["mj"], { description: "Prüfprotokolle, Nachweise und Übergabeunterlagen." });
  pt("a5", "p1", "a4", "section", "Offene Nachweise", "open", ["ab"]);
  pt("t8", "p1", "a5", "task", "Prüfprotokoll Verteiler E2 anhängen", "open", ["ik"], { due: d(6) });
  pt("t9", "p1", "a5", "task", "Wochenbericht an Projektleitung", "open", ["ab"], { due: d(4) });
  pt("b1", "p2", "", "area", "Ladepunkte Parkdeck", "in_progress", ["mh"]);
  pt("b2", "p2", "b1", "section", "Ebene 1 – Wandmontage", "open", ["sl"]);
  pt("u1", "p2", "b2", "task", "Bohrbild mit Bauherr abstimmen", "open", ["mh"], { due: d(3) });
  pt("u2", "p2", "b2", "task", "Materialliste bestätigen", "done", ["mh"], { doneBy: "mh", doneAt: ts(3, "11:00") });
  pt("u3", "p2", "b2", "task", "Leitungswege markieren", "open", ["sl", "dh"], { due: d(8) });
  pt("c1", "p3", "", "area", "Abnahme Smart Meter", "in_progress", ["mh"]);
  pt("c2", "p3", "c1", "section", "Zählerschrank Reihe 4", "in_progress", ["mp"]);
  pt("v1", "p3", "c2", "task", "Foto der finalen Montage aufnehmen", "open", ["mp"], { due: d(-2) });
  pt("v2", "p3", "c2", "task", "Plombierung prüfen", "done", ["dh"], { doneBy: "dh", doneAt: ts(4, "09:30") });
  pt("v3", "p3", "c2", "task", "Abnahmeprotokoll vorbereiten", "done", ["mh"], { doneBy: "mh", doneAt: ts(1, "14:00") });

  return {
    version: DATA_VERSION,
    demo: DEMO_VERSION,
    workspace: { id: "muster", name: "Muster Elektrotechnik GmbH", slug: "muster-elektro", address: "Industriestraße 12, 4840 Vöcklabruck" },
    meId: "mj",
    people,
    projects,
    points,
    defects: [
      { id: "m1", projectId: "p1", no: 1, openPointId: "t1", title: "Konsole lose an Achse 14", description: "Befestigungspunkte und Fotobelege fehlen für die Abnahme.", location: "Ebene 2, Achse 14", ownerId: "ik", priority: "high", status: "open", due: d(2), attachments: [att("f4", "Konsole Achse 14.jpg", "/demo/foto4.jpg", "photo", "mp")], createdBy: "mp", createdAt: ts(1, "09:12") },
      { id: "m2", projectId: "p1", no: 2, openPointId: "", title: "Kabeltyp abweichend geliefert", description: "NYY statt NYCWY im Bereich Verteiler E2.", location: "Lager", ownerId: "ab", priority: "medium", status: "in_progress", due: d(5), attachments: [], createdBy: "ab", createdAt: ts(3, "13:40") },
      { id: "m3", projectId: "p3", no: 1, openPointId: "v1", title: "Foto der finalen Montage fehlt", description: "Muss vor der Übergabe nachgereicht werden.", location: "Zählerschrank Reihe 4", ownerId: "mp", priority: "medium", status: "open", due: d(1), attachments: [], createdBy: "mh", createdAt: ts(2, "16:05") },
      { id: "m4", projectId: "p2", no: 1, openPointId: "", title: "Abnahmeprotokoll nicht unterschrieben", description: "Unterschrift der Projektleitung fehlt.", location: "", ownerId: "jw", priority: "low", status: "done", due: "", attachments: [], createdBy: "mh", createdAt: ts(6), closedBy: "jw", closedAt: ts(5) }
    ],
    tasks: [
      { id: "k1", projectId: "p1", title: "Wochenbericht an Projektleitung senden", ownerId: "mj", due: d(0), done: false, createdBy: "mj", createdAt: ts(3) },
      { id: "k2", projectId: "p1", title: "Hubarbeitsbühne für Ebene 2 reservieren", ownerId: "ab", due: d(2), done: false, createdBy: "mj", createdAt: ts(2) },
      { id: "k3", projectId: "p2", title: "Materialfreigabe mit Einkauf klären", ownerId: "mh", due: d(1), done: false, createdBy: "jw", createdAt: ts(4) },
      { id: "k4", projectId: "p3", title: "Abnahmefotos prüfen", ownerId: "mh", due: d(-3), done: true, doneAt: ts(3), createdBy: "mj", createdAt: ts(8) }
    ],
    notes: [
      { id: "n1", projectId: "p1", text: "Kabelweg in Ebene 2 mit Bauleitung ÖBB abgestimmt – Querschlag 3 erst ab KW 45 zugänglich.", pinned: true, createdBy: "ab", createdAt: ts(1, "09:15") },
      { id: "n2", projectId: "p1", text: "Schlüssel für Technikraum liegt beim Portier, Hr. Leitner.", pinned: false, createdBy: "mj", createdAt: ts(4, "07:40") },
      { id: "n3", projectId: "p2", text: "Liefertermin Wallboxen muss noch bestätigt werden.", pinned: false, createdBy: "jw", createdAt: ts(1, "16:30") }
    ],
    documents: [
      { id: "d1", projectId: "p1", name: "Fotodokumentation Begehung", kind: "photo", status: "approved", file: att("df1", "Begehung Tunnel.jpg", "/demo/tunnel.jpg", "photo", "ab"), createdBy: "ab", createdAt: ts(2) },
      { id: "d2", projectId: "p1", name: "Grundriss Ebene 2", kind: "plan", status: "approved", file: { ...att("df2", "Grundriss Ebene 2.png", "/demo/tunnel-plan.png", "file", "mj"), mime: "image/png" }, createdBy: "mj", createdAt: ts(12) },
      { id: "d3", projectId: "p2", name: "Montageplan Ladepunkte", kind: "plan", status: "review", file: att("df3", "Parkdeck.jpg", "/demo/foto5.jpg", "photo", "jw"), createdBy: "jw", createdAt: ts(5) }
    ],
    reports: [],
    activity: [
      { id: "ac1", projectId: "p1", at: ts(1, "09:12"), by: "mp", text: "Mangel M-001 „Konsole lose an Achse 14“ gemeldet" },
      { id: "ac2", projectId: "p1", at: ts(2, "15:40"), by: "ik", text: "„Fotodokumentation hochladen“ erledigt" },
      { id: "ac3", projectId: "p1", at: ts(1, "09:15"), by: "ab", text: "Notiz geschrieben" },
      { id: "ac4", projectId: "p3", at: ts(1, "14:00"), by: "mh", text: "„Abnahmeprotokoll vorbereiten“ erledigt" }
    ]
  };
}
