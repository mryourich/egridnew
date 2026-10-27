import { addDays, today } from "./date";
import type { Rolle } from "./roles";
import type { Attachment, Data, Job, Material, OpenPoint, Person, Photo, PointType, Project, WorkStatus } from "./types";

export const DATA_VERSION = 1;
/** Raise when the demo content changes – visitors then get the new demo. */
export const DEMO_VERSION = 3;

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
    absences: [],
    jobs: [],
    photos: [],
    materials: [],
    articles: [],
    regie: [],
    dailies: [],
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
    active: true,
    team: ["monteur", "lehrling"].includes(rolle) ? "Montage" : rolle === "extern" ? "Subunternehmer" : "Leitung"
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
    project("p1", { number: "P-2601", name: "Semmering Basistunnel", client: "ÖBB Infrastruktur", location: "Mürzzuschlag", status: "active", start: d(-60), due: d(28), managerId: "mj", memberIds: ["ab", "ik", "mp", "lg", "ks"], createdBy: "mj", budget: 218400, color: "#1a5cff", image: "/demo/tunnel.jpg", description: "Elektroinstallation Tunnelabschnitt Nord: Kabeltrassen, Verteiler, Beleuchtung." }),
    project("p2", { number: "P-2602", name: "Ladeinfrastruktur Zentrale", client: "eww Gruppe", location: "Wels", status: "planning", start: d(-10), due: d(70), managerId: "jw", memberIds: ["mh", "sl", "dh"], createdBy: "jw", budget: 74900, color: "#7c3aed", image: "/demo/foto5.jpg", description: "24 AC-Ladepunkte und Lastmanagement im Parkdeck." }),
    project("p3", { number: "P-2603", name: "Smart Meter Rollout", client: "Gemeinde Attnang", location: "Attnang", status: "handover", start: d(-90), due: d(-2), managerId: "mj", memberIds: ["mh", "mp", "dh"], createdBy: "mj", budget: 211000, color: "#0891b2", image: "/demo/band2.jpg", description: "Tausch von 1.200 Zählern, Abnahme mit der Gemeinde." })
  ];

  const att = (id: string, name: string, url: string, kind: Attachment["kind"] = "photo", by = "ik"): Attachment => ({ id, name, kind, mime: kind === "photo" ? "image/jpeg" : "application/pdf", size: 240_000, url, addedBy: by, addedAt: ts(1, "10:20") });

  const job = (id: string, projectId: string, employeeId: string, title: string, color: string, start: string, end: string, extra: Partial<Job> = {}): Job => ({ id, projectId, employeeId, title, color, start, end, note: "", done: false, createdBy: "mj", createdAt: ts(10), ...extra });
  const photo = (id: string, projectId: string, pointId: string, caption: string, url: string, daysAgo: number, by: string): Photo => ({ id, projectId, pointId, caption, file: { ...att(`${id}f`, `${caption}.jpg`, url, "photo", by), addedAt: ts(daysAgo, "10:1" + id.slice(-1)) }, createdBy: by, createdAt: ts(daysAgo, "10:1" + id.slice(-1)) });
  const material = (id: string, projectId: string, artNo: string, name: string, qty: number, unit: string, status: Material["status"], daysAgo: number): Material => ({ id, projectId, artNo, name, qty, unit, status, note: "", createdBy: "ik", createdAt: ts(daysAgo, "07:30") });

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
      { id: "m4", projectId: "p2", no: 1, openPointId: "", title: "Abnahmeprotokoll nicht unterschrieben", description: "Unterschrift der Projektleitung fehlt.", location: "", ownerId: "jw", priority: "low", status: "done", due: "", attachments: [], fixNote: "Protokoll unterschrieben nachgereicht.", fixPhotos: [att("fx1", "Protokoll unterschrieben.jpg", "/demo/foto3.jpg", "photo", "jw")], createdBy: "mh", createdAt: ts(6), closedBy: "jw", closedAt: ts(5) }
    ],
    tasks: [
      { id: "k1", projectId: "p1", title: "Wochenbericht an Projektleitung senden", ownerId: "mj", due: d(0), done: false, createdBy: "mj", createdAt: ts(3) },
      { id: "k2", projectId: "p1", title: "Hubarbeitsbühne für Ebene 2 reservieren", ownerId: "ab", due: d(2), done: false, createdBy: "mj", createdAt: ts(2) },
      { id: "k3", projectId: "p2", title: "Materialfreigabe mit Einkauf klären", ownerId: "mh", due: d(1), done: false, createdBy: "jw", createdAt: ts(4) },
      { id: "k4", projectId: "p3", title: "Abnahmefotos prüfen", ownerId: "mh", due: d(-3), done: true, doneAt: ts(3), createdBy: "mj", createdAt: ts(8) }
    ],
    notes: [
      { id: "n1", projectId: "p1", text: "Kabelweg in Ebene 2 mit Bauleitung ÖBB abgestimmt – Querschlag 3 erst ab KW 45 zugänglich.", pinned: true, color: "#fff4b8", createdBy: "ab", createdAt: ts(1, "09:15") },
      { id: "n2", projectId: "p1", text: "Schlüssel für Technikraum liegt beim Portier, Hr. Leitner.", pinned: false, color: "#cfe6ff", createdBy: "mj", createdAt: ts(4, "07:40") },
      { id: "n3", projectId: "p2", text: "Liefertermin Wallboxen muss noch bestätigt werden.", pinned: true, color: "#ffd9c2", createdBy: "jw", createdAt: ts(1, "16:30") },
      { id: "n4", projectId: "", text: "Morgenrunde Tunnel:\n– Blindstopfen immer montieren\n– Kabelbinder kürzen, nicht scharf lassen", pinned: false, color: "#d6f0c9", createdBy: "mj", createdAt: ts(1, "07:10") },
      { id: "n5", projectId: "", text: "Nacharbeiten:\n– Türanzeigen anschließen\n– Messungen QK 1–3 offen\n– Schilder NS-Raum fehlen", pinned: false, color: "#fff4b8", createdBy: "mj", createdAt: ts(0, "06:50") }
    ],
    documents: [
      { id: "d1", projectId: "p1", name: "Fotodokumentation Begehung", kind: "photo", status: "approved", file: att("df1", "Begehung Tunnel.jpg", "/demo/tunnel.jpg", "photo", "ab"), createdBy: "ab", createdAt: ts(2) },
      { id: "d2", projectId: "p1", name: "Grundriss Ebene 2", kind: "plan", status: "approved", file: { ...att("df2", "Grundriss Ebene 2.png", "/demo/tunnel-plan.png", "file", "mj"), mime: "image/png" }, createdBy: "mj", createdAt: ts(12) },
      { id: "d3", projectId: "p2", name: "Montageplan Ladepunkte", kind: "plan", status: "review", file: att("df3", "Parkdeck.jpg", "/demo/foto5.jpg", "photo", "jw"), createdBy: "jw", createdAt: ts(5) }
    ],
    reports: [],
    absences: [
      { id: "ab1", employeeId: "mp", type: "urlaub", start: d(9), end: d(13), note: "" },
      { id: "ab2", employeeId: "lg", type: "krank", start: d(-1), end: d(1), note: "Krankmeldung liegt vor" },
      { id: "ab3", employeeId: "sl", type: "za", start: d(2), end: d(2), note: "" },
      { id: "ab4", employeeId: "dh", type: "schulung", start: d(6), end: d(7), note: "Berufsschule" },
      { id: "ab5", employeeId: "mj", type: "urlaub", start: d(20), end: d(24), note: "" }
    ],
    jobs: [
      job("j1", "p1", "ik", "Kabelbefestigung Abschnitt B", "#2e75b6", d(0), d(3)),
      job("j2", "p1", "ik", "Kennzeichnung", "#de7a25", d(4), d(5)),
      job("j3", "p1", "mp", "Kabelverlegung prüfen", "#8fbfa6", d(-3), d(2)),
      job("j4", "p1", "mp", "Verteiler E2 setzen", "#735a97", d(3), d(7)),
      job("j5", "p1", "lg", "Durchgang abdichten", "#d91414", d(2), d(4)),
      job("j6", "p1", "ks", "Kabelzug Hauptachse", "#5fb3d9", d(-2), d(8)),
      job("j7", "p1", "ab", "Baubesprechung ÖBB", "#707070", d(1), d(1), { endAm: true }),
      job("j8", "p1", "mj", "Abnahme Ebene 2", "#2e75b6", d(0), d(0), { startPm: true, note: "mit Bauleitung ÖBB" }),
      job("j9", "p2", "mh", "Bohrbild abstimmen", "#bfcb2c", d(0), d(1)),
      job("j10", "p2", "sl", "Leitungswege markieren", "#b07d5e", d(-1), d(4)),
      job("j11", "p2", "dh", "Leitungswege markieren", "#b07d5e", d(0), d(4)),
      job("j12", "p2", "sl", "Wallboxen Reihe 1–4", "#2e75b6", d(5), d(12)),
      job("j13", "p3", "mp", "Foto finale Montage", "#de7a25", d(8), d(8), { endAm: true }),
      job("j14", "p3", "mh", "Übergabe Gemeinde", "#7f6252", d(3), d(3)),
      job("j15", "p1", "ik", "", "#fbd02e", d(3), d(3), { symbol: true, icon: "⚠️", endAm: true, comment: "Brandschutz vor Abdichtung prüfen" })
    ],
    photos: [
      photo("ph1", "p1", "a3", "Querverbindung vor Montage", "/demo/foto7.jpg", 2, "ik"),
      photo("ph2", "p1", "a2", "Trasse fertig montiert", "/demo/foto8.jpg", 1, "mp"),
      photo("ph3", "p1", "a2", "Übersicht Röhre Nord", "/demo/foto9.jpg", 0, "ab"),
      photo("ph4", "p2", "b2", "Parkdeck Ebene 1", "/demo/band.jpg", 3, "mh"),
      photo("ph5", "p3", "c2", "Zählerschrank Reihe 4", "/demo/band2.jpg", 2, "mp")
    ],
    materials: [
      material("ma1", "p1", "300013261", "Kabelschuh 50/M10", 150, "Stk", "ordered", 6),
      material("ma2", "p1", "300025001", "Kabelschuh 120/M10", 60, "Stk", "ordered", 6),
      material("ma3", "p1", "", "Schirmschelle 22-25", 500, "Stk", "open", 1),
      material("ma4", "p1", "018774530", "Beschlagschraube 4,5×30/27", 500, "Stk", "arrived", 12),
      material("ma5", "p1", "217999", "Beschriftungsband P-Touch 9 mm", 6, "Stk", "open", 0),
      material("ma6", "p2", "062675", "Metallbohrer 7,5 mm", 10, "Stk", "arrived", 9),
      material("ma7", "p2", "", "NYM-J 5×10", 250, "m", "open", 1)
    ],
    articles: [
      { id: "ar1", artNo: "300013261", name: "Kabelschuh 50/M10", unit: "Stk" },
      { id: "ar2", artNo: "300025001", name: "Kabelschuh 120/M10", unit: "Stk" },
      { id: "ar3", artNo: "018774530", name: "Beschlagschraube 4,5×30/27", unit: "Stk" },
      { id: "ar4", artNo: "217999", name: "Beschriftungsband P-Touch 9 mm", unit: "Stk" },
      { id: "ar5", artNo: "062675", name: "Metallbohrer 7,5 mm", unit: "Stk" },
      { id: "ar6", artNo: "LED-NB-12", name: "Notleuchte LED 12 W", unit: "Stk" }
    ],
    regie: [
      {
        id: "rg1",
        projectId: "p1",
        no: 1,
        date: d(-2),
        orderedBy: "Hr. Leitner (ÖBB)",
        description: "Zusätzliche Notbeleuchtung im Querschlag 3 montiert und angeschlossen – nicht im Leistungsverzeichnis enthalten.",
        workers: [
          { employeeId: "ik", hours: 4 },
          { employeeId: "lg", hours: 4 }
        ],
        materials: [
          { artNo: "LED-NB-12", name: "Notleuchte LED 12 W", qty: 2, unit: "Stk" },
          { artNo: "", name: "NYM-J 3×1,5", qty: 25, unit: "m" }
        ],
        photos: [att("rp1", "Notbeleuchtung QS3.jpg", "/demo/foto5.jpg", "photo", "ik")],
        signature: "",
        signedBy: "",
        createdBy: "ab",
        createdAt: ts(2, "15:30")
      }
    ],
    dailies: [
      { id: "dr1", projectId: "p1", date: d(-1), weather: "Bewölkt, 9 °C", crew: [{ employeeId: "ik", hours: 8.5 }, { employeeId: "mp", hours: 8.5 }, { employeeId: "ks", hours: 9 }], work: "Trassen Abschnitt B montiert, Kabelzug Hauptachse vorbereitet.", incidents: "Zufahrt Nord ab 14 Uhr gesperrt.", photos: [att("dp1", "Trasse km 1,2.jpg", "/demo/foto2.jpg", "photo", "ab")], createdBy: "ab", createdAt: ts(1, "16:40") },
      { id: "dr2", projectId: "p2", date: d(-2), weather: "Sonnig, 12 °C", crew: [{ employeeId: "mh", hours: 8 }, { employeeId: "sl", hours: 8 }], work: "Leitungswege Ebene 1 markiert, Kernbohrungen vorbereitet.", incidents: "", photos: [], createdBy: "mh", createdAt: ts(2, "16:10") }
    ],
    activity: [
      { id: "ac1", projectId: "p1", at: ts(1, "09:12"), by: "mp", text: "Mangel M-001 „Konsole lose an Achse 14“ gemeldet" },
      { id: "ac2", projectId: "p1", at: ts(2, "15:40"), by: "ik", text: "„Fotodokumentation hochladen“ erledigt" },
      { id: "ac3", projectId: "p1", at: ts(1, "09:15"), by: "ab", text: "Notiz geschrieben" },
      { id: "ac4", projectId: "p3", at: ts(1, "14:00"), by: "mh", text: "„Abnahmeprotokoll vorbereiten“ erledigt" }
    ]
  };
}
