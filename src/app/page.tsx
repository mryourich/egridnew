import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarRange,
  Camera,
  Check,
  CheckSquare,
  ClipboardList,
  FolderDown,
  GanttChart,
  IdCard,
  LayoutGrid,
  MonitorSmartphone,
  Package,
  ScanLine,
  StickyNote,
  TriangleAlert
} from "lucide-react";
import "./landing.css";

export const metadata: Metadata = {
  title: { absolute: "VYSNER Baustelle – Checklisten, Mängel, Einsatzplanung und Material für Handwerk und Bau" },
  description:
    "Die Baustellen-App für Handwerk und Mittelstand in Österreich und Deutschland: Checklisten und Mängel mit Fotodoku, Aufgaben, Bauzeitplan, Einsatzplanung der Firma, Notizen und Lagerbestand mit Barcode-Scan."
};

const modules = [
  { icon: LayoutGrid, name: "Übersicht", text: "Alle Baustellen mit Fortschritt, offenen Mängeln, fälligen Aufgaben und Material unter Minimum." },
  { icon: ClipboardList, name: "OpenPoints", text: "Checkliste nach Bereichen zum Abhaken und Mängelliste mit Status, Priorität, Zuständigkeit und Frist." },
  { icon: CheckSquare, name: "Aufgaben", text: "Eigene und zugewiesene Aufgaben, gefiltert nach Status und Fälligkeit." },
  { icon: CalendarRange, name: "Kalender", text: "Bauzeitplan je Baustelle in Halbtagen – ziehen, verlängern, verknüpfen." },
  { icon: GanttChart, name: "Planner", text: "Einsatzplanung der ganzen Firma: wer arbeitet wann auf welcher Baustelle, wer ist abwesend." },
  { icon: StickyNote, name: "Notizen", text: "Haftnotizen je Baustelle oder persönlich, farbig markiert und frei sortierbar." },
  { icon: Package, name: "Material", text: "Bestand je Baustelle, Barcode-Scan am Handy, Nachbestellliste und Wareneingang." },
  { icon: IdCard, name: "Stammdaten", text: "Mitarbeiter mit Personalnummer, Kontakt, SV-Nummer, Beschäftigung und Qualifikationen." }
];

const details = [
  {
    kicker: "OpenPoints",
    title: "Abhaken, fotografieren, nachweisen.",
    text: "Die Baustelle so gegliedert, wie sie gebaut wird: Bereich, Abschnitt, Punkt. Aus jedem Punkt wird mit einem Klick ein Mangel – mit Nummer, Ort, Frist und Zuständigkeit.",
    points: ["Fotos direkt mit der Handykamera – mehrere hintereinander, dann alle hochladen", "Mangel mit eigenen Fotos für Mangel und Behebung", "Fotodoku als ZIP mit Ordnern wie die Struktur, plus Liste für Excel", "Fortschritt in Prozent je Bereich und Baustelle"],
    img: "/landing/bs-checkliste.jpg",
    alt: "Checkliste mit Struktur nach Bereichen"
  },
  {
    kicker: "Planner",
    title: "Jeder weiß, wo wer arbeitet.",
    text: "Die ganze Mannschaft auf einer Tafel – eigene Leute, Leiharbeiter und Subunternehmer. Einsätze in Halbtagen, Urlaub und Krankenstand gleich daneben.",
    points: ["Tag, Woche, Monat – Heute immer markiert", "Balken ziehen, verlängern, kopieren, verknüpfen", "Heute auf einen Blick: eingeplant, abwesend, frei", "Österreichische Feiertage eingetragen"],
    img: "/landing/bs-planner.jpg",
    alt: "Einsatzplanung der Firma im Planner"
  },
  {
    kicker: "Material",
    title: "Scannen statt suchen.",
    text: "Wer etwas aus dem Lager nimmt, scannt den Barcode mit dem Handy und tippt die Menge – der Bestand stimmt. Was unter den Mindestbestand fällt, steht oben auf der Bestellliste.",
    points: ["Code-128-Etiketten drucken, Herstellercodes übernehmen", "Kamera am Handy oder Handscanner", "Bestellmenge, Bestellhistorie, Bestellliste als CSV", "Jede Buchung mit Person und Uhrzeit"],
    img: "/landing/bs-material.jpg",
    alt: "Material mit Nachbestellliste"
  }
];

const trades = ["Installateure & Haustechnik", "Elektrotechnik", "Lüftung & Klima", "Baumeister & Bauunternehmen", "Trockenbau & Ausbau", "Industriemontage"];

export default function Landing() {
  return (
    <div className="lp">
      <header className="lp-nav">
        <div className="lp-wrap lp-nav-in">
          <Link href="/" className="lp-logo" aria-label="VYSNER Baustelle – Startseite">
            <Image src="/brand/vysner-icon.png" alt="" width={28} height={28} priority />
            <span>
              <strong>VYSNER</strong>
              <small>Baustelle</small>
            </span>
          </Link>
          <nav className="lp-links" aria-label="Seitenbereiche">
            <a href="#module">Module</a>
            <a href="#funktionen">Funktionen</a>
            <a href="#ablauf">Ablauf</a>
            <a href="#preis">Preis</a>
          </nav>
          <span className="lp-spacer" />
          <Link href="/uebersicht" className="lp-btn lp-btn-ghost">
            Anmelden
          </Link>
          <Link href="/demo" className="lp-btn lp-btn-primary lp-hide-sm">
            Demo öffnen
          </Link>
        </div>
      </header>

      <section className="lp-hero">
        <div className="lp-wrap lp-hero-in">
          <div className="lp-hero-text">
            <span className="lp-kicker">Für Handwerk und Mittelstand · Österreich und Deutschland</span>
            <h1>Die Baustelle im Griff. Ohne Zettelwirtschaft.</h1>
            <p>Checklisten und Mängel mit Fotodoku, Bauzeitplan und Einsatzplanung, Aufgaben, Notizen und Lagerbestand mit Barcode-Scan – in einer App, am PC im Büro und am Handy auf der Baustelle.</p>
            <div className="lp-cta">
              <Link href="/demo" className="lp-btn lp-btn-primary lp-btn-lg">
                Demo mit Beispielbetrieb <ArrowRight size={18} />
              </Link>
              <Link href="/demo?start=leer" className="lp-btn lp-btn-outline lp-btn-lg">
                Leer starten
              </Link>
            </div>
            <ul className="lp-facts">
              <li>
                <Check size={15} /> Keine Installation – läuft im Browser
              </li>
              <li>
                <Check size={15} /> PC, Tablet und Handy
              </li>
              <li>
                <Check size={15} /> Datum, Feiertage und Begriffe für Österreich
              </li>
            </ul>
          </div>
          <figure className="lp-shot lp-hero-shot">
            <Image src="/landing/bs-uebersicht.jpg" alt="Übersicht aller Baustellen mit Kennzahlen" width={1600} height={1000} priority sizes="(max-width: 1000px) 100vw, 720px" />
          </figure>
        </div>
      </section>

      <section className="lp-band" aria-label="Kurz gesagt">
        <div className="lp-wrap lp-band-in">
          <div>
            <Camera size={20} />
            <strong>Fotos vom Handy</strong>
            <span>mehrere auf einmal, direkt am Punkt oder Mangel</span>
          </div>
          <div>
            <ScanLine size={20} />
            <strong>Barcode-Scan</strong>
            <span>Entnahme buchen, Bestand stimmt</span>
          </div>
          <div>
            <FolderDown size={20} />
            <strong>Fotodoku als ZIP</strong>
            <span>Ordner wie Bereiche, Mangel und Behebung</span>
          </div>
          <div>
            <TriangleAlert size={20} />
            <strong>Was dringend ist</strong>
            <span>überfällig, unter Minimum, hohe Priorität – oben</span>
          </div>
        </div>
      </section>

      <section id="module" className="lp-section">
        <div className="lp-wrap">
          <div className="lp-head">
            <span className="lp-kicker">Module</span>
            <h2>Acht Module. Eine Baustelle.</h2>
            <p>Oben die Baustelle wählen – jedes Modul zeigt genau diese. Oder alle auf einmal.</p>
          </div>
          <div className="lp-modules">
            {modules.map(({ icon: Icon, name, text }) => (
              <article key={name} className="lp-module">
                <Icon size={20} strokeWidth={1.8} />
                <h3>{name}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="funktionen" className="lp-section lp-alt">
        <div className="lp-wrap lp-details">
          {details.map((d, i) => (
            <article key={d.kicker} className={`lp-detail ${i % 2 ? "flip" : ""}`}>
              <div className="lp-detail-text">
                <span className="lp-kicker">{d.kicker}</span>
                <h2>{d.title}</h2>
                <p>{d.text}</p>
                <ul>
                  {d.points.map((p) => (
                    <li key={p}>
                      <Check size={15} /> {p}
                    </li>
                  ))}
                </ul>
              </div>
              <figure className="lp-shot">
                <Image src={d.img} alt={d.alt} width={1600} height={950} sizes="(max-width: 1000px) 100vw, 640px" />
              </figure>
            </article>
          ))}
        </div>
      </section>

      <section className="lp-section lp-mobile">
        <div className="lp-wrap lp-mobile-in">
          <div className="lp-phones">
            <figure className="lp-phone">
              <Image src="/landing/bs-handy-scan.jpg" alt="Entnahme nach dem Scan am Handy buchen" width={600} height={1200} sizes="260px" />
            </figure>
            <figure className="lp-phone">
              <Image src="/landing/bs-handy-punkt.jpg" alt="Checklistenpunkt am Handy mit Fotos" width={600} height={1200} sizes="260px" />
            </figure>
          </div>
          <div className="lp-detail-text">
            <span className="lp-kicker">Auf der Baustelle</span>
            <h2>Am Handy genau das Nötige.</h2>
            <p>Die Monteure brauchen kein Schulungshandbuch: Punkt öffnen, Fotos machen, abhaken. Material scannen, Menge tippen, fertig. Im Büro landet alles mit Name und Uhrzeit.</p>
            <ul>
              <li>
                <MonitorSmartphone size={15} /> Gleiche App am PC, Tablet und Handy
              </li>
              <li>
                <Camera size={15} /> Rückkamera für Fotos und Barcodes
              </li>
              <li>
                <IdCard size={15} /> „Angemeldet als“ – jede Änderung mit Person
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section id="ablauf" className="lp-section">
        <div className="lp-wrap">
          <div className="lp-head">
            <span className="lp-kicker">Ablauf</span>
            <h2>In einer Stunde startklar.</h2>
          </div>
          <ol className="lp-steps">
            <li>
              <span>1</span>
              <strong>Mitarbeiter anlegen</strong>
              <p>Stammdaten mit Personalnummer und Funktion – Leiharbeiter und Subunternehmer mit ihrer Firma.</p>
            </li>
            <li>
              <span>2</span>
              <strong>Baustellen anlegen</strong>
              <p>Nummer, Auftraggeber, Adresse, Zeitraum, Bauleitung und Team. Dann Bereiche und Punkte der Checkliste.</p>
            </li>
            <li>
              <span>3</span>
              <strong>Einplanen und loslegen</strong>
              <p>Im Planner die Leute auf die Baustellen ziehen. Ab jetzt wird auf der Baustelle abgehakt, fotografiert und gescannt.</p>
            </li>
          </ol>
          <div className="lp-trades">
            <span>Gemacht für</span>
            {trades.map((t) => (
              <em key={t}>{t}</em>
            ))}
          </div>
        </div>
      </section>

      <section id="preis" className="lp-section lp-alt">
        <div className="lp-wrap lp-price">
          <div className="lp-detail-text">
            <span className="lp-kicker">Preis</span>
            <h2>Ein Fixpreis für die Firma. Monteure gratis.</h2>
            <p>Bezahlt werden die Zugänge für Leitung, Bauleitung und Büro – nie die Leute auf der Baustelle.</p>
          </div>
          <div className="lp-price-card">
            <strong>Firmenlizenz</strong>
            <span>Fixpreis pro Monat · Preis auf Anfrage</span>
            <ul>
              <li>
                <Check size={15} /> Alle acht Module
              </li>
              <li>
                <Check size={15} /> Monteure, Lehrlinge und Externe unbegrenzt
              </li>
              <li>
                <Check size={15} /> PC, Tablet und Handy im Browser
              </li>
            </ul>
            <Link href="/demo" className="lp-btn lp-btn-primary lp-btn-lg">
              Kostenlos ausprobieren <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      <section className="lp-final">
        <div className="lp-wrap lp-final-in">
          <div>
            <h2>Selbst ausprobieren.</h2>
            <p>Der Beispielbetrieb hat vier Baustellen mit Checklisten, Mängeln, Einsätzen und Material. Nichts installieren, nichts anmelden.</p>
          </div>
          <div className="lp-cta">
            <Link href="/demo" className="lp-btn lp-btn-white lp-btn-lg">
              Demo öffnen <ArrowRight size={18} />
            </Link>
            <Link href="/demo?start=leer" className="lp-btn lp-btn-glass lp-btn-lg">
              Leer starten
            </Link>
          </div>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-wrap lp-footer-in">
          <span className="lp-logo small">
            <Image src="/brand/vysner-icon.png" alt="" width={20} height={20} />
            <strong>VYSNER</strong>
          </span>
          <span>Baustellen-App für Handwerk und Mittelstand</span>
          <span className="lp-spacer" />
          <Link href="/demo">Demo</Link>
          <Link href="/uebersicht">Anmelden</Link>
          <span>© {new Date().getFullYear()} VYSNER</span>
        </div>
      </footer>
    </div>
  );
}
