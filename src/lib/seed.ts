import { addDays, startOfWeek, today } from "./date";
import type { Data, SiteNode } from "./types";

/** Lightweight placeholder picture so the demo photo documentation is not empty. */
function demoPhoto(label: string, hue: number) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue},45%,62%)"/><stop offset="1" stop-color="hsl(${hue + 30},40%,32%)"/></linearGradient></defs><rect width="640" height="480" fill="url(#g)"/><path d="M0 380 L160 250 L280 340 L420 200 L640 360 L640 480 L0 480Z" fill="rgba(0,0,0,.18)"/><circle cx="520" cy="110" r="42" fill="rgba(255,255,255,.35)"/><text x="32" y="446" font-family="Arial" font-size="28" fill="#fff">${label}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const DATA_VERSION = 1;

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
    company: { tenantId: "muster", name: "Muster Anlagentechnik GmbH", address: "Industriestraße 12, 4840 Vöcklabruck", workdays: [1, 2, 3, 4, 5] },
    projects: [
      { id: "p1", code: "P-2401", name: "Umspannwerk Nord – Erweiterung", client: "Energie AG", location: "Linz", status: "aktiv", color: "#1463ff", start: d(-21), end: d(45), managerId: "e1", budget: 480000, description: "Erweiterung um zwei 110-kV-Felder inkl. Sekundärtechnik." },
      { id: "p2", code: "P-2402", name: "Tunnel Nord – Elektroinstallation", client: "ASFINAG", location: "Vöcklabruck", status: "aktiv", color: "#00b4d8", start: d(-35), end: d(30), managerId: "e2", budget: 1250000, description: "Kabeltrassen, Beleuchtung und Notstromversorgung Abschnitt A–C." },
      { id: "p3", code: "P-2403", name: "Parkdeck Ladepunkte", client: "Stadtwerke Wels", location: "Wels", status: "aktiv", color: "#7c3aed", start: d(-7), end: d(24), managerId: "e1", budget: 210000, description: "24 AC-Ladepunkte, 4 DC-Schnelllader, Lastmanagement." },
      { id: "p4", code: "P-2404", name: "Schaltanlage Werk 3", client: "Voest Industrie", location: "Steyr", status: "planung", color: "#f59e0b", start: d(14), end: d(70), managerId: "e2", budget: 390000, description: "Neubau NS-Hauptverteilung inkl. Kompensation." }
    ],
    employees: [
      { id: "e1", name: "Mario Juric", role: "Projektleiter", team: "Projektleitung", phone: "+43 660 1234567", email: "mario@example.at", hourlyRate: 78, qualifications: [{ name: "SCC**", validUntil: d(300) }], active: true },
      { id: "e2", name: "Anna Berger", role: "Bauleiterin", team: "Projektleitung", phone: "+43 660 2345678", email: "anna@example.at", hourlyRate: 72, qualifications: [{ name: "SCC**", validUntil: d(20) }, { name: "Erste Hilfe", validUntil: d(180) }], active: true },
      { id: "e3", name: "Lukas Hofer", role: "Elektrotechniker", team: "Montage A", phone: "+43 660 3456789", email: "lukas@example.at", hourlyRate: 52, qualifications: [{ name: "Hochvolt", validUntil: d(12) }], active: true },
      { id: "e4", name: "Stefan Maier", role: "Monteur", team: "Montage A", phone: "+43 660 4567890", email: "stefan@example.at", hourlyRate: 45, qualifications: [{ name: "Staplerschein", validUntil: d(400) }], active: true },
      { id: "e5", name: "Julia Wimmer", role: "Elektrotechnikerin", team: "Montage B", phone: "+43 660 5678901", email: "julia@example.at", hourlyRate: 52, qualifications: [{ name: "Hubarbeitsbühne", validUntil: d(-5) }], active: true },
      { id: "e6", name: "Thomas Gruber", role: "Monteur", team: "Montage B", phone: "+43 660 6789012", email: "thomas@example.at", hourlyRate: 45, qualifications: [], active: true },
      { id: "e7", name: "Daniel Huber", role: "Lehrling", team: "Montage B", phone: "+43 660 7890123", email: "daniel@example.at", hourlyRate: 22, qualifications: [], active: true },
      { id: "e8", name: "Sabine Leitner", role: "Kabelzieherin", team: "Montage A", phone: "+43 660 8901234", email: "sabine@example.at", hourlyRate: 44, qualifications: [{ name: "Erste Hilfe", validUntil: d(90) }], active: true }
    ],
    vehicles: [
      { id: "v1", plate: "VB-123AB", name: "VW Crafter", type: "Transporter", seats: 3, nextService: d(9), status: "verfuegbar" },
      { id: "v2", plate: "VB-456CD", name: "Ford Transit", type: "Transporter", seats: 6, nextService: d(60), status: "verfuegbar" },
      { id: "v3", plate: "VB-789EF", name: "Mercedes Sprinter", type: "Pritsche", seats: 3, nextService: d(-2), status: "werkstatt" },
      { id: "v4", plate: "VB-321GH", name: "Skoda Octavia", type: "PKW", seats: 5, nextService: d(120), status: "verfuegbar" }
    ],
    equipment: [
      { id: "q1", name: "Hubarbeitsbühne 12 m", category: "Hebetechnik", serial: "HB-12-004", nextInspection: d(30), status: "verfuegbar" },
      { id: "q2", name: "Kabeltrommelanhänger", category: "Kabel", serial: "KT-2201", nextInspection: d(200), status: "verfuegbar" },
      { id: "q3", name: "Kabelzugmaschine", category: "Kabel", serial: "KZ-0098", nextInspection: d(5), status: "verfuegbar" },
      { id: "q4", name: "Messkoffer Isolation", category: "Messtechnik", serial: "MK-7781", nextInspection: d(75), status: "verfuegbar" }
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
      { id: "a12", resourceType: "vehicle", resourceId: "v1", projectId: "p1", start: d(0), end: d(9), note: "" },
      { id: "a13", resourceType: "vehicle", resourceId: "v2", projectId: "p2", start: d(-7), end: d(18), note: "" },
      { id: "a14", resourceType: "vehicle", resourceId: "v4", projectId: "p3", start: d(0), end: d(4), note: "" },
      { id: "a15", resourceType: "equipment", resourceId: "q1", projectId: "p3", start: d(1), end: d(6), note: "" },
      { id: "a16", resourceType: "equipment", resourceId: "q3", projectId: "p2", start: d(0), end: d(10), note: "" },
      { id: "a17", resourceType: "equipment", resourceId: "q4", projectId: "p1", start: d(7), end: d(9), note: "Messungen" }
    ],
    absences: [
      { id: "ab1", employeeId: "e3", type: "schulung", start: d(10), end: d(11), note: "Hochvolt Auffrischung" },
      { id: "ab2", employeeId: "e5", type: "urlaub", start: d(14), end: d(18), note: "" },
      { id: "ab3", employeeId: "e8", type: "krank", start: d(2), end: d(3), note: "" }
    ],
    tasks: [
      { id: "t1", projectId: "p1", title: "Baustelleneinrichtung", phase: "Vorbereitung", start: d(-21), end: d(-17), progress: 100, status: "erledigt", assigneeId: "e1", dependsOn: "", milestone: false },
      { id: "t2", projectId: "p1", title: "Fundamente & Kabelkanäle", phase: "Tiefbau", start: d(-16), end: d(-3), progress: 100, status: "erledigt", assigneeId: "e4", dependsOn: "t1", milestone: false },
      { id: "t3", projectId: "p1", title: "Montage Primärtechnik", phase: "Montage", start: d(-2), end: d(12), progress: 35, status: "in_arbeit", assigneeId: "e3", dependsOn: "t2", milestone: false },
      { id: "t4", projectId: "p1", title: "Sekundärtechnik verdrahten", phase: "Montage", start: d(6), end: d(24), progress: 0, status: "offen", assigneeId: "e3", dependsOn: "t3", milestone: false },
      { id: "t5", projectId: "p1", title: "Inbetriebnahme & Prüfung", phase: "Abschluss", start: d(25), end: d(38), progress: 0, status: "offen", assigneeId: "e1", dependsOn: "t4", milestone: false },
      { id: "t6", projectId: "p1", title: "Abnahme", phase: "Abschluss", start: d(40), end: d(40), progress: 0, status: "offen", assigneeId: "e1", dependsOn: "t5", milestone: true },
      { id: "t7", projectId: "p2", title: "Kabeltrassen Abschnitt A", phase: "Trassen", start: d(-35), end: d(-10), progress: 100, status: "erledigt", assigneeId: "e6", dependsOn: "", milestone: false },
      { id: "t8", projectId: "p2", title: "Kabeltrassen Abschnitt B", phase: "Trassen", start: d(-9), end: d(6), progress: 60, status: "in_arbeit", assigneeId: "e8", dependsOn: "t7", milestone: false },
      { id: "t9", projectId: "p2", title: "Kabelzug Abschnitt A+B", phase: "Kabel", start: d(0), end: d(16), progress: 15, status: "in_arbeit", assigneeId: "e8", dependsOn: "", milestone: false },
      { id: "t10", projectId: "p2", title: "Beleuchtung montieren", phase: "Montage", start: d(10), end: d(24), progress: 0, status: "offen", assigneeId: "e4", dependsOn: "t8", milestone: false },
      { id: "t11", projectId: "p2", title: "Materialfreigabe Notstrom", phase: "Kabel", start: d(-4), end: d(2), progress: 20, status: "blockiert", assigneeId: "e2", dependsOn: "", milestone: false },
      { id: "t12", projectId: "p2", title: "Übergabe Abschnitt A–C", phase: "Abschluss", start: d(30), end: d(30), progress: 0, status: "offen", assigneeId: "e2", dependsOn: "t10", milestone: true },
      { id: "t13", projectId: "p3", title: "Unterverteilungen setzen", phase: "Montage", start: d(-7), end: d(1), progress: 80, status: "in_arbeit", assigneeId: "e5", dependsOn: "", milestone: false },
      { id: "t14", projectId: "p3", title: "Wallboxen montieren", phase: "Montage", start: d(2), end: d(11), progress: 0, status: "offen", assigneeId: "e5", dependsOn: "t13", milestone: false },
      { id: "t15", projectId: "p3", title: "Lastmanagement konfigurieren", phase: "Inbetriebnahme", start: d(12), end: d(18), progress: 0, status: "offen", assigneeId: "e1", dependsOn: "t14", milestone: false },
      { id: "t16", projectId: "p3", title: "Abnahme Netzbetreiber", phase: "Abschluss", start: d(22), end: d(22), progress: 0, status: "offen", assigneeId: "e1", dependsOn: "t15", milestone: true },
      { id: "t17", projectId: "p4", title: "Ausführungsplanung", phase: "Planung", start: d(14), end: d(28), progress: 0, status: "offen", assigneeId: "e2", dependsOn: "", milestone: false }
    ],
    issues: [
      { id: "i1", projectId: "p2", kind: "mangel", title: "Befestigung Kabeltrasse lose", description: "Abschnitt B, km 1,2 – zwei Konsolen nicht fest verschraubt.", location: "Abschnitt B / km 1,2", severity: "hoch", status: "offen", assigneeId: "e8", due: d(2), createdAt: d(-2), photo: "", nodeId: "n7" },
      { id: "i2", projectId: "p2", kind: "behinderung", title: "Zufahrt gesperrt durch Tiefbau", description: "Fremdfirma blockiert Zufahrt Portal Nord bis voraussichtlich Freitag.", location: "Portal Nord", severity: "mittel", status: "in_arbeit", assigneeId: "e2", due: d(4), createdAt: d(-1), photo: "", nodeId: "n1" },
      { id: "i3", projectId: "p1", kind: "abweichung", title: "Kabeltyp abweichend geliefert", description: "Geliefert NA2XS2Y statt N2XS2Y – Freigabe durch Planer nötig.", location: "Lager", severity: "mittel", status: "offen", assigneeId: "e1", due: d(3), createdAt: d(-3), photo: "", nodeId: "n16" },
      { id: "i4", projectId: "p3", kind: "mangel", title: "Beschriftung Unterverteilung fehlt", description: "UV-P1 und UV-P2 ohne Stromkreisbeschriftung.", location: "Ebene 1", severity: "niedrig", status: "erledigt", assigneeId: "e5", due: d(-1), createdAt: d(-5), photo: "", nodeId: "n24" },
      { id: "i5", projectId: "p1", kind: "mangel", title: "Erdungsanschluss Feld 2 fehlt", description: "", location: "Feld 2", severity: "kritisch", status: "offen", assigneeId: "e3", due: d(-1), createdAt: d(-4), photo: "", nodeId: "n21" }
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
    materials: [
      { id: "m1", projectId: "p2", name: "Kabeltrasse KR 60×300", unit: "m", planned: 1800, delivered: 1200, used: 1050, unitPrice: 18.5, supplier: "Rexel", deliveryDate: d(3), status: "teilgeliefert" },
      { id: "m2", projectId: "p2", name: "NYY-J 5×16", unit: "m", planned: 3200, delivered: 3200, used: 900, unitPrice: 9.2, supplier: "Schäcke", deliveryDate: d(-10), status: "geliefert" },
      { id: "m3", projectId: "p2", name: "LED Tunnelleuchte 60 W", unit: "Stk", planned: 140, delivered: 0, used: 0, unitPrice: 310, supplier: "Zumtobel", deliveryDate: d(9), status: "bestellt" },
      { id: "m4", projectId: "p1", name: "N2XS2Y 1×240 12/20 kV", unit: "m", planned: 900, delivered: 900, used: 200, unitPrice: 42, supplier: "Nexans", deliveryDate: d(-8), status: "geliefert" },
      { id: "m5", projectId: "p1", name: "Schutzrelais 7SJ82", unit: "Stk", planned: 4, delivered: 0, used: 0, unitPrice: 6800, supplier: "Siemens", deliveryDate: d(12), status: "bestellt" },
      { id: "m6", projectId: "p3", name: "Wallbox 22 kW", unit: "Stk", planned: 24, delivered: 12, used: 4, unitPrice: 1150, supplier: "ABL", deliveryDate: d(1), status: "teilgeliefert" },
      { id: "m7", projectId: "p3", name: "DC-Schnelllader 60 kW", unit: "Stk", planned: 4, delivered: 0, used: 0, unitPrice: 24500, supplier: "Alpitronic", deliveryDate: d(16), status: "geplant" }
    ],
    reports: [
      { id: "r1", projectId: "p2", date: d(-1), weather: "bewoelkt", temperature: 9, crew: 5, hours: 42, work: "Trassen Abschnitt B km 1,0–1,3 montiert, Kabelzug vorbereitet.", incidents: "Zufahrt Nord ab 14 Uhr gesperrt.", authorId: "e2" },
      { id: "r2", projectId: "p1", date: d(-1), weather: "sonnig", temperature: 12, crew: 3, hours: 26, work: "Leistungsschalter Feld 1 gesetzt, Erdung Feld 1 angeschlossen.", incidents: "", authorId: "e1" },
      { id: "r3", projectId: "p3", date: d(-2), weather: "regen", temperature: 7, crew: 2, hours: 16, work: "UV-P1 verdrahtet, Kernbohrungen Ebene 1.", incidents: "", authorId: "e5" }
    ],
    documents: [
      { id: "d1", projectId: "p1", name: "Einreichplan_UW_Nord.pdf", category: "Pläne", size: 2400000, addedAt: d(-20), dataUrl: "" },
      { id: "d2", projectId: "p2", name: "Leistungsverzeichnis_Tunnel.xlsx", category: "Verträge", size: 480000, addedAt: d(-30), dataUrl: "" },
      { id: "d3", projectId: "p3", name: "Datenblatt_Wallbox.pdf", category: "Datenblätter", size: 950000, addedAt: d(-6), dataUrl: "" }
    ],
    activity: [
      { id: "ac1", at: `${d(-1)}T16:40:00`, text: "Tagesbericht erstellt: Tunnel Nord", projectId: "p2" },
      { id: "ac2", at: `${d(-2)}T09:15:00`, text: "Mangel gemeldet: Befestigung Kabeltrasse lose", projectId: "p2" },
      { id: "ac3", at: `${d(-3)}T11:02:00`, text: "Abweichung gemeldet: Kabeltyp abweichend geliefert", projectId: "p1" }
    ]
  };
}

