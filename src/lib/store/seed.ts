import { addDays, isWeekend, startOfWeek, today } from "../date";
import type { CalendarEntry, Data, Defect, MaterialItem, Note, OpenPoint, Person, PointType, Site, Task, WorkStatus } from "./types";

/** Bump when the stored shape changes. */
export const DATA_VERSION = 1;
/** Bump when the sample company changes – saved demo data is then replaced. */
export const DEMO_VERSION = 3;

export const SITE_COLORS = ["#0e5a7a", "#3d6b45", "#7a4e0e", "#5a3d7a", "#7a1f2b", "#2f4f6f", "#56606b"];

export function createEmpty(): Data {
  return {
    version: DATA_VERSION,
    workspace: { id: "ws", name: "Mein Betrieb", address: "" },
    meId: "me",
    people: [{ id: "me", name: "Ich", role: "Bauleitung", phone: "", active: true }],
    sites: [],
    points: [],
    defects: [],
    tasks: [],
    entries: [],
    absences: [],
    calendar: {},
    notes: [],
    materials: []
  };
}

/** Next workday on or after a date. */
const work = (d: string) => {
  let x = d;
  while (isWeekend(x)) x = addDays(x, 1);
  return x;
};

/**
 * Sample company: an Austrian building-services firm with four sites. Dates are relative to today,
 * so the demo always looks current.
 */
export function createDemo(): Data {
  const t = today();
  const mon = startOfWeek(t);
  const d = (n: number) => addDays(t, n);
  const w = (n: number) => work(addDays(mon, n));
  const at = (n: number, h = 9) => new Date(`${addDays(t, n)}T${String(h).padStart(2, "0")}:15:00`).toISOString();

  const people: Person[] = [
    { id: "p-huber", name: "Thomas Huber", role: "Bauleiter", phone: "+43 664 412 18 20", active: true },
    { id: "p-berger", name: "Martina Berger", role: "Projektleiterin", phone: "+43 664 412 18 21", active: true },
    { id: "p-wagner", name: "Stefan Wagner", role: "Polier", phone: "+43 676 230 44 10", active: true },
    { id: "p-pichler", name: "Lukas Pichler", role: "Monteur", phone: "+43 676 230 44 11", active: true },
    { id: "p-steiner", name: "Daniel Steiner", role: "Monteur", phone: "+43 676 230 44 12", active: true },
    { id: "p-moser", name: "Andreas Moser", role: "Elektriker", phone: "+43 699 118 50 03", active: true },
    { id: "p-hofer", name: "Julia Hofer", role: "Technikerin", phone: "+43 699 118 50 04", active: true },
    { id: "p-leitner", name: "Kevin Leitner", role: "Lehrling", phone: "+43 660 771 02 98", active: true },
    { id: "p-gruber", name: "Markus Gruber", role: "Monteur", phone: "+43 676 230 44 13", active: true },
    { id: "p-bauer", name: "Florian Bauer", role: "Installateur", phone: "+43 676 230 44 14", active: true },
    { id: "p-petrovic", name: "Ivan Petrović", role: "Helfer", phone: "+43 660 512 33 07", active: true },
    { id: "p-schmid", name: "Michael Schmid", role: "Elektriker", phone: "+43 664 980 21 55", active: true }
  ];
  // master data: personnel number, address, social security, entry date, employment, qualifications
  const master: Record<string, Partial<Person>> = {
    "p-huber": { personnelNo: "1001", birthDate: "1979-03-14", svNo: "1235 140379", street: "Linzer Straße 12", zip: "4020", city: "Linz", entryDate: "2008-04-01", employment: "vollzeit", weeklyHours: 38.5, trade: "Installateur", qualifications: ["Meister Gas/Wasser/Heizung", "Ersthelfer", "Sicherheitsvertrauensperson"], licenses: "B, BE" },
    "p-berger": { personnelNo: "1002", birthDate: "1986-09-02", svNo: "2349 020986", street: "Hauptplatz 3", zip: "4600", city: "Wels", entryDate: "2015-02-01", employment: "vollzeit", weeklyHours: 38.5, trade: "Gebäudetechnik", qualifications: ["DI (FH) Gebäudetechnik", "Baustellenkoordinatorin"], licenses: "B" },
    "p-wagner": { personnelNo: "1003", birthDate: "1975-06-21", svNo: "3456 210675", street: "Bahnhofstraße 8", zip: "4040", city: "Linz", entryDate: "2001-08-15", employment: "vollzeit", weeklyHours: 38.5, trade: "Installateur", qualifications: ["Polier", "Ersthelfer", "Staplerschein"], licenses: "B, C, CE" },
    "p-pichler": { personnelNo: "1004", birthDate: "1992-11-30", svNo: "4560 301192", street: "Kirchengasse 5", zip: "4061", city: "Pasching", entryDate: "2014-09-01", employment: "vollzeit", weeklyHours: 38.5, trade: "Installateur", qualifications: ["Lehrabschluss Installations- und Gebäudetechnik", "Druckprobe Heizung"], licenses: "B" },
    "p-steiner": { personnelNo: "1005", birthDate: "1990-01-17", svNo: "5675 170190", street: "Am Anger 22", zip: "4050", city: "Traun", entryDate: "2016-03-01", employment: "vollzeit", weeklyHours: 38.5, trade: "Installateur", qualifications: ["Lüftungsmonteur", "Hubarbeitsbühne"], licenses: "B" },
    "p-moser": { personnelNo: "1006", birthDate: "1984-04-08", svNo: "6781 080484", street: "Feldweg 4", zip: "4600", city: "Wels", entryDate: "2012-05-02", employment: "vollzeit", weeklyHours: 38.5, trade: "Elektrotechnik", qualifications: ["Elektrotechniker", "E-Befund / Prüfungen ÖVE"], licenses: "B" },
    "p-hofer": { personnelNo: "1007", birthDate: "1995-12-11", svNo: "7899 111295", street: "Schillerstraße 19", zip: "4020", city: "Linz", entryDate: "2021-01-11", employment: "teilzeit", weeklyHours: 30, trade: "Lüftung / Sprinkler", qualifications: ["HTL Gebäudetechnik"], licenses: "B" },
    "p-leitner": { personnelNo: "1008", birthDate: "2008-07-25", svNo: "8901 250708", street: "Dorfstraße 2", zip: "4481", city: "Asten", entryDate: "2024-09-01", employment: "lehrling", weeklyHours: 38.5, trade: "Installateur", qualifications: ["2. Lehrjahr"], licenses: "–" },
    "p-gruber": { personnelNo: "1009", birthDate: "1988-02-03", svNo: "1018 030288", street: "Gartenweg 7", zip: "4470", city: "Enns", entryDate: "2019-04-01", employment: "vollzeit", weeklyHours: 38.5, trade: "Installateur", qualifications: ["Schweißer (WIG)"], licenses: "B" },
    "p-bauer": { personnelNo: "1010", birthDate: "1997-10-19", svNo: "1126 191097", street: "Rosenstraße 11", zip: "4400", city: "Steyr", entryDate: "2022-06-07", employment: "vollzeit", weeklyHours: 38.5, trade: "Installateur", qualifications: ["Ersthelfer"], licenses: "B" },
    "p-petrovic": { personnelNo: "L-201", company: "Personaldienst Linz GmbH", birthDate: "1991-05-28", entryDate: "2026-09-15", exitDate: "2026-12-18", employment: "leiharbeiter", weeklyHours: 38.5, trade: "Helfer", qualifications: [], licenses: "B" },
    "p-schmid": { personnelNo: "S-301", company: "Elektro Schmid OG", email: "office@schmid-demo.at", entryDate: "2026-10-01", employment: "subunternehmer", trade: "Elektrotechnik", qualifications: ["Konzessionierter Elektrotechniker"], licenses: "B" }
  };
  for (const p of people) {
    const [firstName, ...rest] = p.name.split(" ");
    Object.assign(p, { firstName, lastName: rest.join(" "), email: `${firstName.toLowerCase()}.${rest.join("").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")}@demo-haustechnik.at`, emergencyName: "", emergencyPhone: "", note: "" }, master[p.id]);
  }
  const me = "p-huber";
  const stamp = (n = -20) => ({ createdBy: me, createdAt: at(n) });

  const sites: Site[] = [
    { id: "s-linz", number: "2025-031", name: "Wohnanlage Linz-Urfahr", client: "WSG Wohnbau GmbH", address: "Hagenstraße 42, 4040 Linz", status: "aktiv", start: d(-62), end: d(48), managerId: "p-huber", memberIds: ["p-wagner", "p-pichler", "p-steiner", "p-leitner", "p-gruber", "p-petrovic"], color: SITE_COLORS[0], note: "Bauteil A und B, 46 Wohneinheiten, Haustechnik und Elektro.", ...stamp(-70) },
    { id: "s-wels", number: "2025-044", name: "Bürogebäude Wels Nord", client: "Pöttinger Immobilien KG", address: "Dr.-Schauer-Straße 8, 4600 Wels", status: "aktiv", start: d(-24), end: d(70), managerId: "p-berger", memberIds: ["p-moser", "p-hofer", "p-steiner", "p-schmid"], color: SITE_COLORS[1], note: "Lüftung, Sprinkler, Elektro 3 Geschoße.", ...stamp(-30) },
    { id: "s-steyr", number: "2025-019", name: "Schule Steyr – Sanierung", client: "Stadt Steyr, Gebäudemanagement", address: "Promenade 3, 4400 Steyr", status: "abnahme", start: d(-140), end: d(6), managerId: "p-huber", memberIds: ["p-wagner", "p-moser", "p-bauer"], color: SITE_COLORS[2], note: "Abnahme mit Bauherr am Freitag.", ...stamp(-150) },
    { id: "s-enns", number: "2025-052", name: "Halle Enns – Erweiterung", client: "Logistik Enns GmbH", address: "Industriezeile 17, 4470 Enns", status: "geplant", start: d(21), end: d(110), managerId: "p-berger", memberIds: ["p-pichler", "p-hofer"], color: SITE_COLORS[3], note: "Baubeginn nach Fertigstellung Fundamente.", ...stamp(-12) }
  ];

  /* checklist: area › section › subsection › point */
  const points: OpenPoint[] = [];
  let order = 0;
  const node = (siteId: string, parentId: string, type: PointType, title: string, x: Partial<OpenPoint> = {}): string => {
    const id = `op-${points.length + 1}`;
    const status: WorkStatus = x.status ?? "offen";
    points.push({ id, siteId, parentId, type, title, note: "", status, assigneeIds: [], due: "", order: order++, files: [], ...stamp(-40), ...x, ...(status === "erledigt" ? { doneBy: x.assigneeIds?.[0] ?? me, doneAt: at(-3, 14) } : {}) });
    return id;
  };

  const linzA = node("s-linz", "", "bereich", "Bauteil A");
  const linzA1 = node("s-linz", linzA, "abschnitt", "Erdgeschoß");
  const linzA1a = node("s-linz", linzA1, "unterabschnitt", "Technikraum");
  node("s-linz", linzA1a, "punkt", "Heizungsverteiler montieren", { status: "erledigt", assigneeIds: ["p-pichler"], due: d(-6) });
  node("s-linz", linzA1a, "punkt", "Druckprobe Heizung durchführen", { status: "in_arbeit", assigneeIds: ["p-pichler", "p-leitner"], due: d(2), note: "Prüfdruck 6 bar, Protokoll an Bauleitung." });
  node("s-linz", linzA1a, "punkt", "Wärmemengenzähler setzen", { assigneeIds: ["p-steiner"], due: d(5) });
  const linzA1b = node("s-linz", linzA1, "unterabschnitt", "Top 1–4");
  node("s-linz", linzA1b, "punkt", "Sanitär-Vorwandinstallation", { status: "erledigt", assigneeIds: ["p-steiner"], due: d(-10) });
  node("s-linz", linzA1b, "punkt", "Fußbodenheizung verlegen", { status: "erledigt", assigneeIds: ["p-pichler"], due: d(-4) });
  node("s-linz", linzA1b, "punkt", "Heizkreise einregulieren", { assigneeIds: ["p-pichler"], due: d(9) });
  const linzA2 = node("s-linz", linzA, "abschnitt", "1. Obergeschoß");
  node("s-linz", linzA2, "punkt", "Steigleitungen dämmen", { status: "in_arbeit", assigneeIds: ["p-leitner"], due: d(1) });
  node("s-linz", linzA2, "punkt", "Brandschutzmanschetten Deckendurchbrüche", { assigneeIds: ["p-wagner"], due: d(-1), note: "Vor Estrich! Fotos für Dokumentation." });
  node("s-linz", linzA2, "punkt", "Lüftungsgeräte Top 5–8 setzen", { assigneeIds: ["p-steiner"], due: d(12) });
  const linzB = node("s-linz", "", "bereich", "Bauteil B");
  const linzB1 = node("s-linz", linzB, "abschnitt", "Tiefgarage");
  node("s-linz", linzB1, "punkt", "CO-Warnanlage verkabeln", { assigneeIds: ["p-moser"], due: d(15) });
  node("s-linz", linzB1, "punkt", "Entwässerung Rinnen anschließen", { status: "erledigt", assigneeIds: ["p-wagner"], due: d(-14) });
  node("s-linz", linzB1, "punkt", "Hebeanlage in Betrieb nehmen", { assigneeIds: ["p-wagner", "p-pichler"], due: d(7) });

  const welsE = node("s-wels", "", "bereich", "Erdgeschoß");
  node("s-wels", welsE, "punkt", "Hauptverteiler setzen", { status: "erledigt", assigneeIds: ["p-moser"], due: d(-8) });
  node("s-wels", welsE, "punkt", "Kabeltrassen Flur montieren", { status: "in_arbeit", assigneeIds: ["p-moser", "p-steiner"], due: d(3) });
  node("s-wels", welsE, "punkt", "Sprinklerleitung Empfang", { assigneeIds: ["p-hofer"], due: d(10) });
  const wels1 = node("s-wels", "", "bereich", "1. Obergeschoß");
  node("s-wels", wels1, "punkt", "Lüftungskanäle Großraumbüro", { status: "in_arbeit", assigneeIds: ["p-hofer"], due: d(6) });
  node("s-wels", wels1, "punkt", "Deckenauslässe nach Rasterplan", { assigneeIds: ["p-hofer"], due: d(18) });
  const wels2 = node("s-wels", "", "bereich", "Dach");
  node("s-wels", wels2, "punkt", "Kranhub Lüftungsgerät abstimmen", { assigneeIds: ["p-berger"], due: d(4), note: "Kranfirma: Termin bestätigen lassen." });

  const steyrA = node("s-steyr", "", "bereich", "Turnsaal");
  node("s-steyr", steyrA, "punkt", "Hallenbeleuchtung umrüsten (LED)", { status: "erledigt", assigneeIds: ["p-moser"], due: d(-20) });
  node("s-steyr", steyrA, "punkt", "Umkleiden Duschen Endmontage", { status: "erledigt", assigneeIds: ["p-wagner"], due: d(-9) });
  const steyrB = node("s-steyr", "", "bereich", "Klassentrakt");
  node("s-steyr", steyrB, "punkt", "Heizkörperthermostate tauschen", { status: "erledigt", assigneeIds: ["p-wagner"], due: d(-12) });
  node("s-steyr", steyrB, "punkt", "E-Befund erstellen", { status: "in_arbeit", assigneeIds: ["p-moser"], due: d(2) });
  node("s-steyr", steyrB, "punkt", "Revisionsunterlagen zusammenstellen", { assigneeIds: ["p-huber"], due: d(4) });

  const ennsA = node("s-enns", "", "bereich", "Vorbereitung");
  node("s-enns", ennsA, "punkt", "Ausführungspläne freigeben lassen", { status: "in_arbeit", assigneeIds: ["p-berger"], due: d(8) });
  node("s-enns", ennsA, "punkt", "Baustelleneinrichtung planen", { assigneeIds: ["p-hofer"], due: d(16) });

  const defect = (siteId: string, no: number, x: Partial<Defect> & Pick<Defect, "title">): Defect => ({
    id: `m-${siteId}-${no}`,
    siteId,
    no,
    pointId: "",
    description: "",
    location: "",
    status: "offen",
    priority: "mittel",
    ownerId: "",
    due: "",
    files: [],
    ...stamp(-15),
    ...x
  });
  const defects: Defect[] = [
    defect("s-linz", 1, { title: "Undichte Pressverbindung Heizungsverteiler", location: "Bauteil A, EG, Technikraum", description: "Tropfwasser am Vorlauf Heizkreis 3. Fitting tauschen.", status: "behoben", priority: "hoch", ownerId: "p-pichler", due: d(-5), fixedBy: "p-pichler", fixedAt: at(-4, 11) }),
    defect("s-linz", 2, { title: "Fehlende Brandschutzmanschette Deckendurchbruch", location: "Bauteil A, 1. OG, Schacht 2", description: "Rohrdurchführung DN 100 ohne Manschette.", priority: "hoch", ownerId: "p-wagner", due: d(1), pointId: "op-13" }),
    defect("s-linz", 3, { title: "Rohrdämmung beschädigt", location: "Bauteil A, 1. OG, Gang", status: "in_arbeit", priority: "mittel", ownerId: "p-leitner", due: d(4) }),
    defect("s-linz", 4, { title: "Gefälle Bodenrinne falsch", location: "Bauteil B, Tiefgarage, Achse 4", priority: "niedrig", ownerId: "p-wagner", due: d(14) }),
    defect("s-wels", 1, { title: "Kabeltrasse kollidiert mit Lüftungskanal", location: "EG, Flur Achse C", description: "Abstimmung mit Lüftungsbauer nötig, Trasse 20 cm tiefer.", status: "in_arbeit", priority: "hoch", ownerId: "p-moser", due: d(2) }),
    defect("s-wels", 2, { title: "Brandschutzklappe nicht zugänglich", location: "1. OG, Großraumbüro", priority: "mittel", ownerId: "p-hofer", due: d(9) }),
    defect("s-steyr", 1, { title: "Thermostatkopf lose", location: "Klasse 2b", status: "abgenommen", priority: "niedrig", ownerId: "p-wagner", due: d(-15), fixedBy: "p-wagner", fixedAt: at(-16, 10) }),
    defect("s-steyr", 2, { title: "Notleuchte Turnsaal ohne Funktion", location: "Turnsaal, Ausgang Ost", status: "behoben", priority: "hoch", ownerId: "p-moser", due: d(-2), fixedBy: "p-moser", fixedAt: at(-2, 15) }),
    defect("s-steyr", 3, { title: "Silikonfuge Dusche nachziehen", location: "Umkleide Damen", priority: "niedrig", ownerId: "p-wagner", due: d(3) })
  ];

  const task = (id: string, x: Partial<Task> & Pick<Task, "title">): Task => ({ id, siteId: "", note: "", ownerId: me, status: "offen", priority: "mittel", due: "", ...stamp(-6), ...x });
  const tasks: Task[] = [
    task("t-1", { siteId: "s-linz", title: "Druckprobenprotokoll an WSG senden", ownerId: me, due: d(2), priority: "hoch" }),
    task("t-2", { siteId: "s-linz", title: "Nachtragsangebot Zusatzheizkörper Top 7", ownerId: me, due: d(5) }),
    task("t-3", { siteId: "s-steyr", title: "Abnahmetermin mit Gebäudemanagement bestätigen", ownerId: me, due: d(0), priority: "hoch", status: "in_arbeit" }),
    task("t-4", { siteId: "s-wels", title: "Kollision Kabeltrasse mit Lüftungsbauer klären", ownerId: "p-moser", due: d(1), priority: "hoch", createdBy: me }),
    task("t-5", { siteId: "s-wels", title: "Kranfirma Termin anfragen", ownerId: "p-berger", due: d(3), createdBy: me }),
    task("t-6", { siteId: "s-linz", title: "Materialliste Bauteil B prüfen", ownerId: "p-wagner", due: d(4), createdBy: me }),
    task("t-7", { siteId: "s-linz", title: "Wochenbericht KW an Bauherr", ownerId: me, due: d(-1), status: "erledigt", doneAt: at(-1, 16) }),
    task("t-8", { siteId: "s-enns", title: "Baustellenbesprechung vorbereiten", ownerId: "p-berger", due: d(14), priority: "niedrig", createdBy: "p-berger" }),
    task("t-9", { siteId: "", title: "Prüfintervalle Werkzeuge (E-Check) eintragen", ownerId: me, due: d(10), priority: "niedrig" }),
    task("t-10", { siteId: "s-steyr", title: "Revisionsordner drucken und binden", ownerId: "p-leitner", due: d(3), createdBy: me }),
    task("t-11", { siteId: "s-wels", title: "Elektro-Unterlagen für Vorabnahme", ownerId: me, due: d(-2), priority: "mittel", createdBy: "p-berger" })
  ];

  const entry = (id: string, x: Partial<CalendarEntry> & Pick<CalendarEntry, "siteId" | "rowId" | "title" | "start" | "end">): CalendarEntry => ({
    id,
    color: sites.find((s) => s.id === x.siteId)?.color ?? SITE_COLORS[0],
    note: "",
    done: false,
    ...stamp(-10),
    ...x
  });
  const entries: CalendarEntry[] = [
    entry("e-1", { siteId: "s-linz", rowId: "p-wagner", title: "Bauteil A Rohinstallation", start: w(-7), end: w(4) }),
    entry("e-2", { siteId: "s-linz", rowId: "p-pichler", title: "Fußbodenheizung", start: w(-3), end: w(1) }),
    entry("e-3", { siteId: "s-linz", rowId: "p-pichler", title: "Druckprobe", start: w(2), end: w(2), startPm: false }),
    entry("e-4", { siteId: "s-linz", rowId: "p-steiner", title: "Vorwand Top 5–8", start: w(0), end: w(3) }),
    entry("e-5", { siteId: "s-wels", rowId: "p-steiner", title: "Trassen", start: w(4), end: w(9) }),
    entry("e-6", { siteId: "s-wels", rowId: "p-moser", title: "Hauptverteiler", start: w(-4), end: w(2) }),
    entry("e-7", { siteId: "s-steyr", rowId: "p-moser", title: "E-Befund", start: w(3), end: w(4) }),
    entry("e-8", { siteId: "s-wels", rowId: "p-hofer", title: "Lüftung 1. OG", start: w(0), end: w(11) }),
    entry("e-9", { siteId: "s-steyr", rowId: "p-wagner", title: "Abnahme", start: work(d(4)), end: work(d(4)), symbol: true, icon: "flag" }),
    entry("e-10", { siteId: "s-linz", rowId: "p-leitner", title: "Dämmung Steigleitungen", start: w(0), end: w(2) }),
    entry("e-11", { siteId: "s-enns", rowId: "p-berger", title: "Planfreigabe", start: w(7), end: w(8) }),
    entry("e-13", { siteId: "s-steyr", rowId: "p-bauer", title: "Restarbeiten Umkleiden", start: w(-2), end: w(3) }),
    entry("e-14", { siteId: "s-linz", rowId: "p-gruber", title: "Tiefgarage Entwässerung", start: w(1), end: w(8) }),
    entry("e-15", { siteId: "s-linz", rowId: "p-petrovic", title: "Helfer Bauteil A", start: w(-5), end: w(9) }),
    entry("e-16", { siteId: "s-wels", rowId: "p-schmid", title: "Elektro Subunternehmer", start: w(5), end: w(12) }),
    entry("e-17", { siteId: "s-enns", rowId: "p-gruber", title: "Baustelleneinrichtung", start: w(15), end: w(16) }),
    entry("e-12", { siteId: "s-wels", rowId: "p-berger", title: "Kranhub Dach", start: work(d(4)), end: work(d(4)), symbol: true, icon: "lift" })
  ];

  const note = (id: string, siteId: string, text: string, color: string, n: number, by = me): Note => ({ id, siteId, text, color, order: n, createdBy: by, createdAt: at(-n - 1, 8) });
  const notes: Note[] = [
    note("n-1", "s-linz", "Schlüssel Technikraum liegt im Baucontainer, Fach 3.", "yellow", 0),
    note("n-2", "s-linz", "Estrich Bauteil A 1. OG ab Mittwoch – vorher alle Durchbrüche schließen!", "red", 1, "p-wagner"),
    note("n-3", "s-wels", "Zufahrt nur über Dr.-Schauer-Straße, Tor 2. Anlieferung bis 9:00.", "blue", 2, "p-berger"),
    note("n-4", "s-steyr", "Abnahme: Prüfbuch Notbeleuchtung und E-Befund mitnehmen.", "green", 3),
    note("n-5", "", "Rückruf Großhändler wegen Lieferzeit Wärmepumpe.", "grey", 4),
    note("n-6", "s-linz", "Bauherr wünscht Fotos der Leitungsführung vor dem Schließen der Vorwände.", "yellow", 5)
  ];

  const mat = (id: string, siteId: string, name: string, artNo: string, barcode: string, qty: number, unit: string, minQty: number, supplier: string, ordered = false, x: Partial<MaterialItem> = {}): MaterialItem => ({
    id,
    siteId,
    name,
    artNo,
    barcode,
    qty,
    unit,
    minQty,
    supplier,
    ordered,
    note: "",
    ...stamp(-18),
    ...(ordered ? { orderedAt: at(-2, 10) } : {}),
    ...x
  });
  const materials: MaterialItem[] = [
    mat("mt-1", "s-linz", "Mehrschichtverbundrohr 16×2", "MV-16-200", "9120001160204", 180, "m", 100, "Frauenthal Handel", false),
    mat("mt-2", "s-linz", "Pressfitting Bogen 90° 16", "PF-B16", "9120001160211", 24, "Stk", 40, "Frauenthal Handel", true, { note: "Lieferung Donnerstag" }),
    mat("mt-3", "s-linz", "Kautschukdämmung 13 mm, Ø 22", "KD-13-22", "9120001160228", 60, "m", 50, "Holter", false),
    mat("mt-4", "s-linz", "Brandschutzmanschette DN 100", "BM-100", "9120001160235", 3, "Stk", 10, "Hilti Austria", false, { note: "Für Schacht 2 dringend" }),
    mat("mt-5", "s-linz", "Montageschiene 41×21", "MS-4121", "9120001160242", 42, "m", 20, "Würth", false),
    mat("mt-6", "s-linz", "Silikon sanitär weiß", "SI-SAN-W", "9120001160259", 6, "Kartusche", 12, "Würth", true),
    mat("mt-7", "s-wels", "NYM-J 5×2,5", "NYM-5-25", "9120001160266", 450, "m", 200, "Schäcke", false),
    mat("mt-8", "s-wels", "Kabeltrasse 300×60", "KT-30060", "9120001160273", 18, "m", 30, "Schäcke", true),
    mat("mt-9", "s-wels", "Sprinklerkopf 68 °C", "SPK-68", "9120001160280", 64, "Stk", 40, "Minimax", false),
    mat("mt-10", "s-wels", "Wickelfalzrohr Ø 250", "WF-250", "9120001160297", 0, "m", 24, "Lindab", false, { note: "Nachbestellung Großraumbüro" }),
    mat("mt-11", "s-steyr", "Thermostatkopf M30×1,5", "TK-M30", "9120001160303", 12, "Stk", 5, "Holter", false),
    mat("mt-12", "s-steyr", "Notleuchte LED 3 h", "NL-LED3", "9120001160310", 2, "Stk", 2, "Schäcke", false),
    mat("mt-13", "s-enns", "Gewindestange M10", "GS-M10", "9120001160327", 0, "Stk", 100, "Würth", true)
  ];

  // booking history: a few withdrawals and earlier orders, open orders with their quantity
  const move = (kind: "entnahme" | "zugang" | "bestellung", qty: number, n: number, by: string) => ({ id: `mv-${kind}-${n}-${qty}`, at: at(-n, 7 + (n % 8)), by, kind, qty });
  const history: Record<string, ReturnType<typeof move>[]> = {
    "mt-1": [move("bestellung", 200, 40, me), move("zugang", 200, 36, "p-wagner"), move("entnahme", 25, 9, "p-pichler"), move("entnahme", 40, 4, "p-pichler")],
    "mt-2": [move("bestellung", 60, 30, me), move("zugang", 60, 27, "p-wagner"), move("entnahme", 12, 6, "p-pichler"), move("entnahme", 24, 3, "p-steiner"), move("bestellung", 40, 2, me)],
    "mt-4": [move("bestellung", 10, 25, me), move("zugang", 10, 22, "p-wagner"), move("entnahme", 4, 8, "p-wagner"), move("entnahme", 3, 2, "p-wagner")],
    "mt-6": [move("entnahme", 2, 5, "p-steiner"), move("bestellung", 12, 1, me)],
    "mt-8": [move("bestellung", 30, 3, "p-berger")],
    "mt-10": [move("bestellung", 30, 50, "p-berger"), move("zugang", 30, 45, "p-moser"), move("entnahme", 18, 10, "p-hofer"), move("entnahme", 12, 3, "p-hofer")],
    "mt-13": [move("bestellung", 200, 1, "p-berger")]
  };
  for (const m of materials) {
    if (history[m.id]) m.log = history[m.id];
    if (m.ordered) m.orderedQty = [...(m.log ?? [])].reverse().find((x) => x.kind === "bestellung")?.qty;
  }

  return {
    version: DATA_VERSION,
    demo: DEMO_VERSION,
    workspace: { id: "ws-demo", name: "Haustechnik Huber GmbH", address: "Gewerbepark 4, 4020 Linz" },
    meId: me,
    people,
    sites,
    points,
    defects,
    tasks,
    entries,
    absences: [
      { id: "a-1", personId: "p-steiner", type: "urlaub", start: w(10), end: w(14), note: "" },
      { id: "a-2", personId: "p-leitner", type: "schulung", start: w(3), end: w(3), note: "Berufsschule" },
      { id: "a-3", personId: "p-hofer", type: "krank", start: d(-3), end: d(-2), note: "" }
    ],
    calendar: { groups: [{ id: "g-buero", name: "Bauleitung & Technik" }, { id: "g-bau", name: "Montage" }, { id: "g-fremd", name: "Leiharbeit & Subunternehmer" }], memberGroup: { "p-huber": "g-buero", "p-berger": "g-buero", "p-hofer": "g-buero", "p-wagner": "g-bau", "p-pichler": "g-bau", "p-steiner": "g-bau", "p-moser": "g-bau", "p-leitner": "g-bau", "p-gruber": "g-bau", "p-bauer": "g-bau", "p-petrovic": "g-fremd", "p-schmid": "g-fremd", "r-kran": "g-bau" }, rows: [{ id: "r-kran", name: "Kran / Hebegeräte" }] },
    notes,
    materials
  };
}
