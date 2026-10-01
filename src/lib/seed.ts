import { addDays, startOfWeek, today } from "./date";
import type { Data, SiteNode } from "./types";

/** Lightweight placeholder picture so the demo photo documentation is not empty. */
function demoPhoto(label: string, hue: number) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue},45%,62%)"/><stop offset="1" stop-color="hsl(${hue + 30},40%,32%)"/></linearGradient></defs><rect width="640" height="480" fill="url(#g)"/><path d="M0 380 L160 250 L280 340 L420 200 L640 360 L640 480 L0 480Z" fill="rgba(0,0,0,.18)"/><circle cx="520" cy="110" r="42" fill="rgba(255,255,255,.35)"/><text x="32" y="446" font-family="Arial" font-size="28" fill="#fff">${label}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const DATA_VERSION = 5;

/** A clean company: only one site-management login, which then creates sites and the team. */
export function createEmpty(): Data {
  return {
    version: DATA_VERSION,
    currentUserId: "bl",
    company: { tenantId: "firma", name: "Meine Firma", address: "", workdays: [1, 2, 3, 4, 5] },
    projects: [],
    employees: [
      { id: "bl", name: "Bauleitung", role: "Bauleitung", access: "bl", department: "Bauleitung", team: "Bauleitung", phone: "", email: "", hourlyRate: 0, qualifications: [], active: true }
    ],
    assignments: [],
    absences: [],
    issues: [],
    siteNodes: [],
    jobs: [],
    photos: [],
    reports: [],
    activity: []
  };
}

/** Demo data relative to today, so the planner always shows a realistic current week. */
export function createSeed(): Data {
  const t = today();
  const w = startOfWeek(t);
  const d = (n: number) => addDays(w, n);

  let order = 0;
  const node = (id: string, projectId: string, parentId: string, title: string, status: SiteNode["status"], assigneeId = "", due = "", description = ""): SiteNode => ({
    id,
    projectId,
    parentId,
    title,
    description,
    status,
    assigneeId,
    due,
    order: order++
  });

  return {
    version: DATA_VERSION,
    currentUserId: "e2",
    company: { tenantId: "muster", name: "Muster Anlagentechnik GmbH", address: "Industriestraße 12, 4840 Vöcklabruck", workdays: [1, 2, 3, 4, 5] },
    projects: [
      { id: "p1", code: "P-2401", name: "Umspannwerk Nord – Erweiterung", client: "Energie AG", location: "Linz", status: "aktiv", color: "#1463ff", start: d(-21), end: d(45), managerId: "", siteManagerId: "e10", budget: 480000, description: "Erweiterung um zwei 110-kV-Felder inkl. Sekundärtechnik." },
      { id: "p2", code: "P-2402", name: "Tunnel Nord – Elektroinstallation", client: "ASFINAG", location: "Vöcklabruck", status: "aktiv", color: "#00b4d8", start: d(-35), end: d(30), managerId: "", siteManagerId: "e2", budget: 1250000, description: "Kabeltrassen, Beleuchtung und Notstromversorgung Abschnitt A–C." },
      { id: "p3", code: "P-2403", name: "Parkdeck Ladepunkte", client: "Stadtwerke Wels", location: "Wels", status: "aktiv", color: "#7c3aed", start: d(-7), end: d(24), managerId: "", siteManagerId: "e1", budget: 210000, description: "24 AC-Ladepunkte, 4 DC-Schnelllader, Lastmanagement." },
      { id: "p4", code: "P-2404", name: "Schaltanlage Werk 3", client: "Voest Industrie", location: "Steyr", status: "planung", color: "#f59e0b", start: d(14), end: d(70), managerId: "", siteManagerId: "e10", budget: 390000, description: "Neubau NS-Hauptverteilung inkl. Kompensation." }
    ],
    employees: [
      { id: "e1", name: "Mario Juric", role: "Bauleiter", department: "Bauleitung", team: "Bauleitung", phone: "+43 660 1234567", email: "mario@example.at", hourlyRate: 78, qualifications: [{ name: "SCC**", validUntil: d(300) }], active: true },
      { id: "e2", name: "Anna Berger", role: "Bauleiterin", department: "Bauleitung", team: "Bauleitung", phone: "+43 660 2345678", email: "anna@example.at", hourlyRate: 72, qualifications: [{ name: "SCC**", validUntil: d(20) }, { name: "Erste Hilfe", validUntil: d(180) }], active: true },
      { id: "e3", name: "Lukas Hofer", role: "Elektrotechniker", department: "Montage", team: "Montage A", phone: "+43 660 3456789", email: "lukas@example.at", hourlyRate: 52, qualifications: [{ name: "Hochvolt", validUntil: d(12) }], active: true },
      { id: "e4", name: "Stefan Maier", role: "Monteur", department: "Montage", team: "Montage A", phone: "+43 660 4567890", email: "stefan@example.at", hourlyRate: 45, qualifications: [{ name: "Staplerschein", validUntil: d(400) }], active: true },
      { id: "e5", name: "Julia Wimmer", role: "Elektrotechnikerin", department: "Montage", team: "Montage B", phone: "+43 660 5678901", email: "julia@example.at", hourlyRate: 52, qualifications: [{ name: "Hubarbeitsbühne", validUntil: d(-5) }], active: true },
      { id: "e6", name: "Thomas Gruber", role: "Monteur", department: "Montage", team: "Montage B", phone: "+43 660 6789012", email: "thomas@example.at", hourlyRate: 45, qualifications: [], active: true },
      { id: "e7", name: "Daniel Huber", role: "Lehrling", department: "Montage", team: "Montage B", phone: "+43 660 7890123", email: "daniel@example.at", hourlyRate: 22, qualifications: [], active: true },
      { id: "e8", name: "Sabine Leitner", role: "Kabelzieherin", department: "Montage", team: "Montage A", phone: "+43 660 8901234", email: "sabine@example.at", hourlyRate: 44, qualifications: [{ name: "Erste Hilfe", validUntil: d(90) }], active: true },
      { id: "e10", name: "Markus Brandl", role: "Bauleiter", department: "Bauleitung", team: "Bauleitung", phone: "+43 660 1122334", email: "markus@example.at", hourlyRate: 70, qualifications: [{ name: "SCC**", validUntil: d(200) }], active: true },
      { id: "e11", name: "Ivan Kovac", role: "Inbetriebnehmer", department: "Service", team: "Inbetriebnahme", phone: "+43 660 2233445", email: "ivan@example.at", hourlyRate: 58, qualifications: [{ name: "Hochvolt", validUntil: d(150) }], active: true },
      { id: "e12", name: "Marko Petrovic", role: "Servicetechniker", department: "Service", team: "Inbetriebnahme", phone: "+43 660 3344556", email: "marko@example.at", hourlyRate: 54, qualifications: [], active: true },
      { id: "e13", name: "Elektro Huber GmbH", role: "Subunternehmer", department: "Extern", team: "Subunternehmer", phone: "+43 7672 12345", email: "office@huber.example", hourlyRate: 48, qualifications: [], active: true },
      { id: "e14", name: "Kabelbau Steiner", role: "Subunternehmer", department: "Extern", team: "Subunternehmer", phone: "+43 7672 67890", email: "office@steiner.example", hourlyRate: 46, qualifications: [], active: true }
    ],
    assignments: [
      { id: "a1", resourceType: "employee", resourceId: "e1", projectId: "p1", start: d(0), end: d(1), note: "" },
      { id: "a2", resourceType: "employee", resourceId: "e1", projectId: "p3", start: d(2), end: d(4), note: "Abnahme Vorbereitung" },
      { id: "a3", resourceType: "employee", resourceId: "e2", projectId: "p2", start: d(-3), end: d(11), note: "" },
      { id: "a4", resourceType: "employee", resourceId: "e3", projectId: "p1", start: d(0), end: d(9), note: "Sekundärtechnik" },
      { id: "a5", resourceType: "employee", resourceId: "e4", projectId: "p1", start: d(0), end: d(4), note: "" },
      { id: "a6", resourceType: "employee", resourceId: "e4", projectId: "p2", start: d(7), end: d(18), note: "" },
      { id: "a7", resourceType: "employee", resourceId: "e5", projectId: "p3", start: d(0), end: d(11), note: "Ladepunkte montieren" },
      { id: "a8", resourceType: "employee", resourceId: "e6", projectId: "p2", start: d(-7), end: d(4), note: "" },
      { id: "a9", resourceType: "employee", resourceId: "e6", projectId: "p3", start: d(3), end: d(8), note: "Doppelt verplant" },
      { id: "a10", resourceType: "employee", resourceId: "e7", projectId: "p3", start: d(0), end: d(11), note: "" },
      { id: "a11", resourceType: "employee", resourceId: "e8", projectId: "p2", start: d(0), end: d(15), note: "Kabelzug Abschnitt B" },
      { id: "a19", resourceType: "employee", resourceId: "e10", projectId: "p1", start: d(-7), end: d(20), note: "" },
      { id: "a20", resourceType: "employee", resourceId: "e11", projectId: "p1", start: d(18), end: d(32), note: "Inbetriebnahme" },
      { id: "a21", resourceType: "employee", resourceId: "e11", projectId: "p3", start: d(3), end: d(8), note: "Lastmanagement" },
      { id: "a22", resourceType: "employee", resourceId: "e12", projectId: "p2", start: d(-2), end: d(9), note: "" },
      { id: "a23", resourceType: "employee", resourceId: "e12", projectId: "p3", start: d(12), end: d(22), note: "" },
      { id: "a24", resourceType: "employee", resourceId: "e13", projectId: "p2", start: d(5), end: d(26), note: "Beleuchtung" },
      { id: "a25", resourceType: "employee", resourceId: "e14", projectId: "p2", start: d(-10), end: d(12), note: "Kabelzug" },
      { id: "a26", resourceType: "employee", resourceId: "e2", projectId: "p3", start: d(12), end: d(16), note: "" },
      { id: "a27", resourceType: "employee", resourceId: "e1", projectId: "p2", start: d(7), end: d(9), note: "Baubesprechung" }
    ],
    absences: [
      { id: "ab1", employeeId: "e3", type: "schulung", start: d(10), end: d(11), note: "Hochvolt Auffrischung" },
      { id: "ab2", employeeId: "e5", type: "urlaub", start: d(14), end: d(18), note: "" },
      { id: "ab3", employeeId: "e8", type: "krank", start: d(9), end: d(10), note: "" },
      { id: "ab4", employeeId: "e1", type: "urlaub", start: d(21), end: d(25), note: "" },
      { id: "ab5", employeeId: "e12", type: "urlaub", start: d(-4), end: d(-3), note: "" }
    ],
    issues: [
      { id: "i1", projectId: "p2", kind: "mangel", title: "Befestigung Kabeltrasse lose", description: "Abschnitt B, km 1,2 – zwei Konsolen nicht fest verschraubt.", location: "Abschnitt B / km 1,2", severity: "hoch", status: "offen", assigneeId: "e8", due: d(2), createdAt: d(-2), photo: demoPhoto("Konsole lose", 15), nodeId: "n7" },
      { id: "i2", projectId: "p2", kind: "behinderung", title: "Zufahrt gesperrt durch Tiefbau", description: "Fremdfirma blockiert Zufahrt Portal Nord bis voraussichtlich Freitag.", location: "Portal Nord", severity: "mittel", status: "in_arbeit", assigneeId: "e2", due: d(4), createdAt: d(-1), photo: "", nodeId: "n1" },
      { id: "i3", projectId: "p1", kind: "abweichung", title: "Kabeltyp abweichend geliefert", description: "Geliefert NA2XS2Y statt N2XS2Y – Freigabe durch Planer nötig.", location: "Lager", severity: "mittel", status: "offen", assigneeId: "e1", due: d(3), createdAt: d(-3), photo: "", nodeId: "n16" },
      { id: "i4", projectId: "p3", kind: "mangel", title: "Beschriftung Unterverteilung fehlt", description: "UV-P1 und UV-P2 ohne Stromkreisbeschriftung.", location: "Ebene 1", severity: "niedrig", status: "erledigt", assigneeId: "e5", due: d(-1), createdAt: d(-5), photo: demoPhoto("UV-P1 ohne Beschriftung", 40), nodeId: "n24", fixPhoto: demoPhoto("UV-P1 beschriftet", 140), fixNote: "Alle Stromkreise beschriftet, Plan in der Tür.", fixedAt: d(-1), fixedBy: "e5" },
      { id: "i5", projectId: "p1", kind: "mangel", title: "Erdungsanschluss Feld 2 fehlt", description: "", location: "Feld 2", severity: "kritisch", status: "offen", assigneeId: "e3", due: d(-1), createdAt: d(-4), photo: demoPhoto("Feld 2 – Erdung", 0), nodeId: "n21" }
    ],
    jobs: [
      { id: "j1", projectId: "p2", employeeId: "e8", title: "Kabelzug Abschnitt B", color: "#2563eb", start: d(0), end: d(3), nodeId: "n6", note: "", done: false },
      { id: "j2", projectId: "p2", employeeId: "e8", title: "Befestigung prüfen", color: "#dc2626", start: d(4), end: d(4), nodeId: "n7", note: "Mangel beheben", done: false },
      { id: "j3", projectId: "p2", employeeId: "e6", title: "Trasse Abschnitt A fertig", color: "#16a34a", start: d(-3), end: d(1), nodeId: "n3", note: "", done: true },
      { id: "j4", projectId: "p2", employeeId: "e6", title: "Durchgang abdichten", color: "#ea580c", start: d(2), end: d(4), nodeId: "n8", note: "", done: false },
      { id: "j5", projectId: "p2", employeeId: "e12", title: "Verteiler E2 setzen", color: "#7c3aed", start: d(1), end: d(5), nodeId: "n11", note: "", done: false },
      { id: "j6", projectId: "p2", employeeId: "e14", title: "Kabelzug Hauptachse", color: "#0891b2", start: d(-2), end: d(8), nodeId: "", note: "", done: false },
      { id: "j7", projectId: "p2", employeeId: "e4", title: "Leuchten Abschnitt A", color: "#ca8a04", start: d(7), end: d(11), nodeId: "n14", note: "", done: false },
      { id: "j8", projectId: "p2", employeeId: "e13", title: "Notbeleuchtung", color: "#db2777", start: d(8), end: d(15), nodeId: "n15", note: "", done: false },
      { id: "j9", projectId: "p3", employeeId: "e5", title: "Wallboxen Reihe 1–4", color: "#2563eb", start: d(0), end: d(6), nodeId: "n25", note: "", done: false },
      { id: "j10", projectId: "p3", employeeId: "e7", title: "Kabelbefestigung", color: "#16a34a", start: d(0), end: d(4), nodeId: "n26", note: "", done: false }
    ],
    siteNodes: [
      node("n1", "p2", "", "Elektroinstallation Tunnelabschnitt Nord", "in_arbeit", "e2", "", "Kabelwege, Verteiler und Erstprüfung."),
      node("n2", "p2", "n1", "Kabeltrassen Ebene 2", "in_arbeit", "e8", d(6), "Montage und Dokumentation der Trassen im Technikbereich."),
      node("n3", "p2", "n2", "Abschnitt A – Hauptachse", "erledigt", "e6"),
      node("n4", "p2", "n3", "Konsolen setzen", "erledigt", "e6"),
      node("n5", "p2", "n3", "Trasse montieren", "erledigt", "e6"),
      node("n6", "p2", "n2", "Abschnitt B – Querverbindung", "in_arbeit", "e8", d(4), "Abstimmung mit Bauleitung und Fotodokumentation erforderlich."),
      node("n7", "p2", "n6", "Befestigungspunkte prüfen", "offen", "e8", d(2), "Alle Konsolen auf festen Sitz prüfen."),
      node("n8", "p2", "n6", "Durchgangsöffnung abdichten", "in_arbeit", "e4", d(3)),
      node("n9", "p2", "n6", "Fotodokumentation hochladen", "offen", "e8", d(4)),
      node("n10", "p2", "n1", "Verteiler E2", "offen", "e4", d(12)),
      node("n11", "p2", "n10", "Verteiler setzen", "offen", "e4"),
      node("n12", "p2", "n10", "Prüfprotokoll anhängen", "offen", "e2"),
      node("n13", "p2", "", "Beleuchtung", "offen", "e4", d(24)),
      node("n14", "p2", "n13", "Leuchten Abschnitt A", "offen", "e4"),
      node("n15", "p2", "n13", "Notbeleuchtung", "offen", "e4"),
      node("n16", "p1", "", "Feld 1 – 110 kV", "in_arbeit", "e3", d(9)),
      node("n17", "p1", "n16", "Leistungsschalter setzen", "erledigt", "e3"),
      node("n18", "p1", "n16", "Erdung anschließen", "erledigt", "e4"),
      node("n19", "p1", "n16", "Sekundärverdrahtung", "in_arbeit", "e3", d(9)),
      node("n20", "p1", "", "Feld 2 – 110 kV", "offen", "e3", d(20)),
      node("n21", "p1", "n20", "Erdungsanschluss", "offen", "e3", d(-1)),
      node("n22", "p1", "n20", "Wandler montieren", "offen", "e4", d(15)),
      node("n23", "p3", "", "Parkdeck Ebene 1", "in_arbeit", "e5", d(11)),
      node("n24", "p3", "n23", "Unterverteilung UV-P1", "erledigt", "e5"),
      node("n25", "p3", "n23", "Wallboxen Reihe 1–4", "in_arbeit", "e5", d(8)),
      node("n26", "p3", "n23", "Kabelbefestigung montieren", "offen", "e7", d(6)),
      node("n27", "p3", "", "Parkdeck Ebene 2", "offen", "e5", d(20)),
      node("n28", "p3", "n27", "Zählerschrank Reihe 4", "offen", "e5", d(18))
    ],
    photos: [
      { id: "f1", projectId: "p2", nodeId: "n6", dataUrl: demoPhoto("Abschnitt B – Begehung", 205), caption: "Querverbindung vor Montage", takenAt: `${d(-2)}T09:12`, authorId: "e2" },
      { id: "f2", projectId: "p2", nodeId: "n5", dataUrl: demoPhoto("Trasse Abschnitt A", 190), caption: "Trasse fertig montiert", takenAt: `${d(-6)}T14:40`, authorId: "e6" },
      { id: "f3", projectId: "p2", nodeId: "n8", dataUrl: demoPhoto("Durchgang", 25), caption: "Durchgang vor Abdichtung", takenAt: `${d(-1)}T11:05`, authorId: "e4" },
      { id: "f4", projectId: "p1", nodeId: "n17", dataUrl: demoPhoto("Feld 1 – Schalter", 150), caption: "Leistungsschalter gesetzt", takenAt: `${d(-3)}T15:20`, authorId: "e3" },
      { id: "f5", projectId: "p3", nodeId: "n24", dataUrl: demoPhoto("UV-P1", 265), caption: "UV-P1 verdrahtet", takenAt: `${d(-2)}T10:30`, authorId: "e5" }
    ],
    reports: [
      { id: "r1", projectId: "p2", date: d(-1), weather: "bewoelkt", temperature: 9, crew: 5, hours: 42, work: "Trassen Abschnitt B km 1,0–1,3 montiert, Kabelzug vorbereitet.", incidents: "Zufahrt Nord ab 14 Uhr gesperrt.", authorId: "e2" },
      { id: "r2", projectId: "p1", date: d(-1), weather: "sonnig", temperature: 12, crew: 3, hours: 26, work: "Leistungsschalter Feld 1 gesetzt, Erdung Feld 1 angeschlossen.", incidents: "", authorId: "e1" },
      { id: "r3", projectId: "p3", date: d(-2), weather: "regen", temperature: 7, crew: 2, hours: 16, work: "UV-P1 verdrahtet, Kernbohrungen Ebene 1.", incidents: "", authorId: "e5" }
    ],
    activity: [
      { id: "ac1", at: `${d(-1)}T16:40:00`, text: "Tagesbericht erstellt: Tunnel Nord", projectId: "p2" },
      { id: "ac2", at: `${d(-2)}T09:15:00`, text: "Mangel gemeldet: Befestigung Kabeltrasse lose", projectId: "p2" },
      { id: "ac3", at: `${d(-3)}T11:02:00`, text: "Abweichung gemeldet: Kabeltyp abweichend geliefert", projectId: "p1" }
    ]
  };
}

