import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Camera,
  Car,
  Check,
  ClipboardList,
  FileText,
  FolderKanban,
  FolderOpen,
  ListTree,
  Network,
  NotebookPen,
  ShieldCheck,
  Smartphone,
  TriangleAlert,
  Users,
  UsersRound
} from "lucide-react";
import "./landing.css";

export const metadata: Metadata = {
  title: { absolute: "VYSNER TeamGrid – Projekte, Offene Punkte und Mängel für Bau-, Service- und Projektteams" },
  description:
    "VYSNER TeamGrid gliedert jedes Projekt in Bereiche und Punkte, hält Mängel mit Foto und Frist fest und zeigt jeder Rolle genau das, was sie braucht – vom Monteur bis zur Geschäftsführung. Für kleine und große Firmen."
};

const flow = [
  { icon: ListTree, name: "Gliedern", who: "Projektleitung", text: "Bereiche anlegen – Gebäude, Geschoß, Abschnitt – und darin die Punkte, die erledigt werden müssen." },
  { icon: Smartphone, name: "Abarbeiten", who: "Team vor Ort", text: "Jeder sieht seine Punkte, hakt ab und hängt Fotos an – am Handy, direkt aus der Kamera." },
  { icon: TriangleAlert, name: "Nachweisen", who: "Bauleitung", text: "Mängel mit Foto, Ort, Frist und Zuständigkeit. Geschlossen wird erst, wenn es passt." },
  { icon: FileText, name: "Berichten", who: "Büro / Leitung", text: "Statusbericht, Mängelbericht und Offene-Punkte-Liste als PDF – aus dem, was ohnehin erfasst wurde." }
];

const features = [
  {
    kicker: "Projekte",
    title: "Alle Projekte auf einer Seite – nüchtern und vollständig.",
    text: "Fortschritt, offene Punkte, Mängel und Termine je Projekt in einer Zeile. Ohne bunte Kacheln, ohne Suchen.",
    points: ["Fortschritt aus den erledigten Punkten – kein Schätzwert", "Überfälliges in Rot", "Filter nach Status, Suche nach Nummer und Auftraggeber", "Fertige Projekte ins Archiv"],
    img: "/landing/tg-projekte.jpg",
    alt: "Projektliste in VYSNER TeamGrid"
  },
  {
    kicker: "Offene Punkte",
    title: "Jeder Bereich, jeder Punkt – abhakbar.",
    text: "Das Projekt so gegliedert, wie es auf der Baustelle aussieht. Links die Bereiche, rechts die Punkte mit Status, Zuständigkeit und Frist.",
    points: ["Bereich › Unterbereich › Abschnitt › Punkt", "Fortschritt je Bereich in Prozent", "Fotos und Dateien je Punkt, Mangel mit einem Klick", "Bereiche samt Punkten duplizieren"],
    img: "/landing/tg-punkte.jpg",
    alt: "Offene Punkte nach Bereichen"
  },
  {
    kicker: "Mängel",
    title: "Erfassen. Zuweisen. Schließen – mit Nachweis.",
    text: "Kein Mangel geht verloren. Jeder hat eine Nummer, einen Ort, eine Frist und einen Verantwortlichen.",
    points: ["Fortlaufende Nummer je Projekt (M-001 …)", "Aus einem offenen Punkt oder frei erfasst", "Auf Wunsch schließt nur die Projektleitung", "Wer, wann, was – lückenlos nachvollziehbar"],
    img: "/landing/tg-maengel.jpg",
    alt: "Mangel bearbeiten"
  },
  {
    kicker: "Berichte",
    title: "Berichte, die Auftraggeber gern lesen.",
    text: "Sauber gesetzt, mit Firmenadresse und Stand – als PDF gespeichert oder gedruckt.",
    points: ["Statusbericht für Bauherr und Geschäftsführung", "Mängelbericht mit Fotos", "Offene-Punkte-Liste für die Begehung", "Immer der aktuelle Stand"],
    img: "/landing/tg-bericht.jpg",
    alt: "Mängelbericht als PDF",
    doc: true
  }
];

const parts = [
  { icon: ListTree, name: "Offene Punkte", text: "Bereiche und Punkte mit Status, Frist und Fotos" },
  { icon: TriangleAlert, name: "Mängel", text: "Nummer, Ort, Priorität, Frist, Nachweis" },
  { icon: ClipboardList, name: "Aufgaben", text: "Bestellen, anrufen, reservieren – mit Zuständigkeit" },
  { icon: NotebookPen, name: "Notizen", text: "Baustellen-Journal, Wichtiges angeheftet" },
  { icon: FolderOpen, name: "Dokumente", text: "Pläne, Protokolle, Fotos mit Freigabestatus" },
  { icon: FileText, name: "Berichte", text: "Status, Mängel, Offene Punkte als PDF" }
];

const hub = [
  { icon: UsersRound, name: "People", text: "Mitarbeiter, Qualifikationen, Abwesenheiten" },
  { icon: Car, name: "Fleet", text: "Fahrzeuge, Reservierungen, Wartung" },
  { icon: FolderKanban, name: "Datei-Zentrale", text: "Firmendokumente, Freigaben, Fristen" }
];

export default function Landing() {
  return (
    <div className="lp">
      <header className="lp-nav">
        <div className="lp-wrap lp-nav-in">
          <Link href="/" className="lp-logo" aria-label="VYSNER">
            <Image src="/brand/vysner-logo.png" alt="VYSNER" width={160} height={32} priority />
          </Link>
          <nav className="lp-links" aria-label="Seite">
            <a href="#ablauf">Ablauf</a>
            <a href="#funktionen">Funktionen</a>
            <a href="#rollen">Rollen</a>
            <a href="#hub">Ausblick</a>
            <a href="#preis">Preis</a>
          </nav>
          <span className="lp-spacer" />
          <Link href="/projekte" className="lp-btn lp-btn-ghost">
            Anmelden
          </Link>
          <Link href="/demo" className="lp-btn lp-btn-primary lp-hide-sm">
            Demo starten
          </Link>
        </div>
      </header>

      <section className="lp-hero">
        <div className="lp-wrap lp-hero-in">
          <div className="lp-hero-copy">
            <span className="lp-pill">
              <Building2 size={14} /> TeamGrid – für Bau-, Service- und Projektteams
            </span>
            <h1>
              Jedes Projekt im Griff. <span className="lp-grad">Offene Punkte, Mängel, Nachweise.</span>
            </h1>
            <p className="lp-lead">
              VYSNER TeamGrid gliedert Projekte in Bereiche und Punkte, hält Mängel mit Foto und Frist fest und zeigt jeder Rolle genau das, was sie braucht – vom Monteur bis zur Geschäftsführung.
            </p>
            <div className="lp-cta">
              <Link href="/demo" className="lp-btn lp-btn-primary lp-btn-lg">
                Demo ansehen <ArrowRight size={18} />
              </Link>
              <Link href="/demo?start=leer" className="lp-btn lp-btn-outline lp-btn-lg">
                Leer starten
              </Link>
            </div>
            <ul className="lp-ticks">
              <li>
                <Check size={15} /> Für 5 oder 500 Mitarbeiter
              </li>
              <li>
                <Check size={15} /> Monteure gratis
              </li>
              <li>
                <Check size={15} /> Ohne Installation
              </li>
            </ul>
          </div>
          <div className="lp-hero-visual" aria-hidden>
            <div className="lp-browser">
              <div className="lp-browser-bar">
                <i />
                <i />
                <i />
                <span>vysner.com</span>
              </div>
              <img src="/landing/tg-uebersicht.jpg" alt="" width={2040} height={990} />
            </div>
            <div className="lp-phone lp-phone-hero">
              <img src="/landing/tg-handy-punkte.jpg" alt="" width={780} height={1560} />
            </div>
          </div>
        </div>
      </section>

      <section className="lp-strip">
        <div className="lp-wrap lp-strip-in">
          <span>
            <ListTree size={16} /> Offene Punkte nach Bereichen
          </span>
          <span>
            <TriangleAlert size={16} /> Mängel mit Foto und Frist
          </span>
          <span>
            <Network size={16} /> Sichtbarkeit nach Organigramm
          </span>
          <span>
            <FileText size={16} /> Berichte als PDF
          </span>
          <span>
            <Users size={16} /> Monteure gratis
          </span>
        </div>
      </section>

      <section id="ablauf" className="lp-roles">
        <div className="lp-wrap">
          <div className="lp-head lp-head-dark">
            <span className="lp-kicker">Ein Ablauf</span>
            <h2>Vom ersten Bereich bis zur Abnahme – ohne Listen in Excel und Fotos im Chat.</h2>
            <p>Die Projektleitung gliedert, das Team arbeitet ab und dokumentiert, Mängel werden nachweisbar geschlossen. Am Ende steht der Bericht.</p>
          </div>
          <ol className="lp-chain">
            {flow.map((r, i) => (
              <li key={r.name}>
                <span className="lp-chain-step">{i + 1}</span>
                <span className="lp-chain-icon">
                  <r.icon size={22} />
                </span>
                <strong>{r.name}</strong>
                <em className="lp-chain-who">{r.who}</em>
                <p>{r.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="funktionen" className="lp-features">
        <div className="lp-wrap">
          {features.map((f, i) => (
            <article key={f.kicker} className={`lp-feature ${i % 2 ? "lp-flip" : ""}`}>
              <div className="lp-feature-copy">
                <span className="lp-kicker">{f.kicker}</span>
                <h2>{f.title}</h2>
                <p>{f.text}</p>
                <ul>
                  {f.points.map((p) => (
                    <li key={p}>
                      <Check size={16} /> {p}
                    </li>
                  ))}
                </ul>
              </div>
              <div className={`lp-shot ${f.doc ? "lp-shot-doc" : ""}`}>
                <img src={f.img} alt={f.alt} loading="lazy" />
              </div>
            </article>
          ))}

          <article className="lp-feature lp-mobile">
            <div className="lp-feature-copy">
              <span className="lp-kicker">Am Handy</span>
              <h2>Auf der Baustelle genauso wie im Büro.</h2>
              <p>Dieselbe Oberfläche im Browser – ohne App-Installation. Punkte abhaken, Foto direkt aus der Kamera, Mangel melden.</p>
              <ul>
                <li>
                  <Check size={16} /> Monteure sehen nur ihre Projekte
                </li>
                <li>
                  <Check size={16} /> „Foto“ öffnet die Kamera
                </li>
                <li>
                  <Check size={16} /> Mangel in drei Feldern gemeldet
                </li>
                <li>
                  <Check size={16} /> Funktioniert auch bei schlechtem Netz
                </li>
              </ul>
            </div>
            <div className="lp-phones" aria-hidden>
              <div className="lp-phone">
                <img src="/landing/tg-handy-punkte.jpg" alt="" loading="lazy" width={780} height={1560} />
              </div>
              <div className="lp-phone lp-phone-2">
                <img src="/landing/tg-handy-mangel.jpg" alt="" loading="lazy" width={780} height={1560} />
              </div>
            </div>
          </article>
        </div>
      </section>

      <section id="rollen" className="lp-why">
        <div className="lp-wrap lp-why-in">
          <div>
            <span className="lp-why-icon">
              <Network size={22} />
            </span>
            <strong>Jeder sieht, was ihm zugeteilt ist</strong>
            <p>Ein Projekt sehen nur, wer es angelegt hat, die Projektleitung und eingeladene Leute – und die Leiter darüber im Organigramm. Nichts wird für alle sichtbar, nur weil es angelegt wurde.</p>
          </div>
          <div>
            <span className="lp-why-icon">
              <ShieldCheck size={22} />
            </span>
            <strong>Rollen wie im Betrieb</strong>
            <p>Admin, Geschäftsführung, Bereichs-, Team- und Projektleitung, Koordination, Bauleitung, Monteure, Lehrlinge, Externe – jede Rolle mit klaren Rechten.</p>
          </div>
          <div>
            <span className="lp-why-icon">
              <Camera size={22} />
            </span>
            <strong>Nachweis statt Zuruf</strong>
            <p>Wer hat was wann erledigt, gemeldet oder geschlossen – jeder Eintrag trägt Name und Zeitstempel. Auf Wunsch nur mit Foto abschließbar.</p>
          </div>
        </div>
      </section>

      <section id="umfang" className="lp-modules">
        <div className="lp-wrap">
          <div className="lp-head">
            <span className="lp-kicker">TeamGrid</span>
            <h2>Alles, was ein Projekt braucht. Übersichtlich.</h2>
            <p>Links das Projektmenü, rechts die Arbeit. Keine verschachtelten Dialoge, keine Spielereien.</p>
          </div>
          <div className="lp-module-grid lp-module-grid-3">
            {parts.map((m) => (
              <div key={m.name} className="lp-module">
                <span className="lp-module-icon">
                  <m.icon size={22} />
                </span>
                <strong>{m.name}</strong>
                <p>{m.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="hub" className="lp-modules">
        <div className="lp-wrap">
          <div className="lp-head">
            <span className="lp-kicker">Ausblick</span>
            <h2>TeamGrid ist das erste Modul des VYSNER Unternehmens-Hubs.</h2>
            <p>Mitarbeiter, Fahrzeuge und Firmendokumente kommen dazu – in derselben Oberfläche, mit denselben Rollen.</p>
          </div>
          <div className="lp-module-grid lp-module-grid-3">
            {hub.map((m) => (
              <div key={m.name} className="lp-module lp-soon">
                <span className="lp-module-icon">
                  <m.icon size={22} />
                </span>
                <div>
                  <strong>
                    {m.name} <em>bald</em>
                  </strong>
                  <p>{m.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="preis" className="lp-price">
        <div className="lp-wrap">
          <div className="lp-head">
            <span className="lp-kicker">Preis</span>
            <h2>Ein Fixpreis für die Firma. Monteure gratis.</h2>
            <p>Bezahlt werden die Zugänge für Leitung, Koordination und Bauleitung – nie die Leute auf der Baustelle.</p>
          </div>
          <div className="lp-price-card">
            <div>
              <strong>Firmenlizenz</strong>
              <span className="lp-price-tag">Fixpreis pro Monat</span>
              <small>Preis auf Anfrage – abhängig von der Zahl der Leitungs-Zugänge.</small>
            </div>
            <ul>
              <li>
                <Check size={16} /> Leitung, Koordination und Bauleitung inklusive
              </li>
              <li>
                <Check size={16} /> Monteure, Lehrlinge und Externe unbegrenzt
              </li>
              <li>
                <Check size={16} /> Offene Punkte, Mängel, Aufgaben, Dokumente, Berichte
              </li>
              <li>
                <Check size={16} /> Am PC und am Handy im Browser
              </li>
            </ul>
            <Link href="/demo" className="lp-btn lp-btn-primary lp-btn-lg">
              Kostenlos testen <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      <section className="lp-steps">
        <div className="lp-wrap">
          <div className="lp-head">
            <span className="lp-kicker">So geht&apos;s</span>
            <h2>In drei Schritten startklar.</h2>
          </div>
          <ol className="lp-step-list">
            <li>
              <span>1</span>
              <strong>Benutzer anlegen</strong>
              <p>Leute mit Rolle und Vorgesetztem eintragen – daraus ergibt sich, wer was sieht.</p>
            </li>
            <li>
              <span>2</span>
              <strong>Projekt anlegen und einladen</strong>
              <p>Name, Auftraggeber, Ort, Projektleitung. Dann das Team einladen.</p>
            </li>
            <li>
              <span>3</span>
              <strong>Bereiche und Punkte</strong>
              <p>Projekt gliedern, Punkte zuweisen – das Team arbeitet ab und dokumentiert.</p>
            </li>
          </ol>
        </div>
      </section>

      <section className="lp-final">
        <div className="lp-wrap lp-final-in">
          <div>
            <h2>Sehen Sie selbst.</h2>
            <p>Die Demo-Firma ist sofort startklar – mit Projekten, Offenen Punkten, Mängeln und Berichten. Oben rechts lässt sich jede Rolle ausprobieren.</p>
          </div>
          <div className="lp-cta">
            <Link href="/demo" className="lp-btn lp-btn-white lp-btn-lg">
              Demo starten <ArrowRight size={18} />
            </Link>
            <Link href="/demo?start=leer" className="lp-btn lp-btn-glass lp-btn-lg">
              Leer starten
            </Link>
          </div>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-wrap lp-footer-in">
          <Image src="/brand/vysner-logo.png" alt="VYSNER" width={125} height={25} />
          <span>TeamGrid – Projekte, Offene Punkte und Mängel.</span>
          <span className="lp-spacer" />
          <Link href="/demo">Demo</Link>
          <Link href="/dashboard">Anmelden</Link>
          <span>© {new Date().getFullYear()} VYSNER</span>
        </div>
      </footer>
    </div>
  );
}
