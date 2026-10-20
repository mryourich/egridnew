import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarRange,
  Camera,
  Check,
  ClipboardList,
  FileText,
  FolderKanban,
  HardHat,
  ListChecks,
  PenLine,
  ShieldCheck,
  Smartphone,
  Users,
  WifiOff
} from "lucide-react";
import "./landing.css";

export const metadata: Metadata = {
  title: { absolute: "VYSNER – Wer macht heute was? Einteilung und Regieschein für Bau und Handwerk" },
  description: "Für kleine Bau- und Handwerksbetriebe: Mitarbeiter in halben Tagen einteilen, Urlaub und Krankenstand im Blick, Regiescheine am Handy unterschreiben lassen – auch ohne Netz. Fixpreis pro Firma, Monteure gratis."
};

const flow = [
  { icon: CalendarRange, name: "Einteilen", who: "Chef / Büro", text: "Wer macht heute was – in halben Tagen, mit Urlaub und Krankenstand." },
  { icon: Smartphone, name: "Arbeiten", who: "Monteure", text: "Jeder sieht am Handy seinen Tag, hakt ab und macht Fotos." },
  { icon: PenLine, name: "Unterschreiben", who: "Kunde", text: "Regieschein mit Stunden und Material – direkt am Handy unterschrieben." },
  { icon: FileText, name: "Abrechnen", who: "Büro", text: "Freigeben, PDF dazu, fertig. Später direkt als Rechnung." }
];

const features = [
  {
    kicker: "Einteilung",
    title: "Wer macht heute was? Auf einen Blick.",
    text: "Die Frage, die sich jeden Morgen stellt – beantwortet, bevor das Telefon läutet. Für kleine Partien, ohne Planungs-Studium.",
    points: ["Einteilen in halben Tagen – Vormittag, Nachmittag", "Urlaub, Krankenstand und Zeitausgleich direkt im Plan", "Sofort sichtbar, wer heute noch frei ist", "Feiertage und Kalenderwochen eingebaut"],
    img: "/landing/einteilung.jpg",
    w: 1590,
    h: 860,
    alt: "Wochen-Einteilung in VYSNER"
  },
  {
    kicker: "Plan",
    title: "Der Baustellenplan, den man wirklich benutzt.",
    text: "Aufgaben wie auf Papier – nur schneller. Ziehen, verlängern, umbenennen, fertig.",
    points: ["Verschieben in halben Tagen", "Rechtsklick: Aufgabe oder Symbol mit Farbpalette", "Mehrere Baustellen, eine Partie", "Monteure sehen nur ihren Teil"],
    img: "/landing/plan.jpg",
    w: 2040,
    h: 990,
    alt: "Baustellenplan in VYSNER"
  },
  {
    kicker: "Mängel",
    title: "Erfassen. Beheben. Nachweisen.",
    text: "Kein Mangel geht mehr verloren – und jede Behebung ist mit Foto belegt.",
    points: ["Foto zuerst – am Handy geht sofort die Kamera auf", "Zuständig und Frist, Überfälliges in Rot", "Monteur meldet „Behoben“ mit Nachher-Foto", "Mängelbericht mit Vorher/Nachher als PDF"],
    img: "/landing/maengel.jpg",
    w: 2040,
    h: 990,
    alt: "Mängelliste in VYSNER"
  },
  {
    kicker: "Berichte",
    title: "Berichte, die Auftraggeber gern lesen.",
    text: "Aus dem, was ohnehin erfasst wird, entsteht der Bericht – sauber, mit Logo, als PDF.",
    points: ["Tagesbericht mit KW, Wetter, Team und Fortschritt", "Fotobericht je Bereich, Export als ZIP", "Mängelbericht mit Vorher/Nachher-Fotos", "Drucken oder als PDF speichern"],
    img: "/landing/bericht.jpg",
    w: 1190,
    h: 1140,
    alt: "Mängelbericht als PDF",
    doc: true
  }
];

const parts = [
  { icon: CalendarRange, name: "Einteilung", text: "Halbe Tage, Urlaub, Krankenstand" },
  { icon: PenLine, name: "Regieschein", text: "Stunden, Material, Unterschrift, PDF" },
  { icon: ListChecks, name: "Struktur", text: "Bereiche und Punkte zum Abhaken" },
  { icon: Camera, name: "Fotos", text: "Galerie je Bereich, ZIP und PDF" },
  { icon: AlertTriangle, name: "Mängel", text: "Mit Frist, Zuständigkeit und Nachweis" },
  { icon: ClipboardList, name: "Tagesberichte", text: "Wetter, Team, Arbeiten, PDF" }
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
            <a href="#regie">Regieschein</a>
            <a href="#funktionen">Funktionen</a>
            <a href="#preis">Preis</a>
          </nav>
          <span className="lp-spacer" />
          <Link href="/dashboard" className="lp-btn lp-btn-ghost">
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
              <HardHat size={14} /> Für kleine Bau- und Handwerksbetriebe
            </span>
            <h1>
              Wer macht heute was? <span className="lp-grad">Eingeteilt, unterschrieben, abgerechnet.</span>
            </h1>
            <p className="lp-lead">Mitarbeiter in halben Tagen einteilen, Urlaub und Krankenstand im Blick, Regiescheine direkt am Handy vom Kunden unterschreiben lassen – auch im Keller ohne Netz.</p>
            <div className="lp-cta">
              <Link href="/demo" className="lp-btn lp-btn-primary lp-btn-lg">
                Demo ansehen <ArrowRight size={18} />
              </Link>
              <Link href="/demo?start=leer" className="lp-btn lp-btn-outline lp-btn-lg">
                Eigene Baustelle anlegen
              </Link>
            </div>
            <ul className="lp-ticks">
              <li>
                <Check size={15} /> Monteure gratis
              </li>
              <li>
                <Check size={15} /> Funktioniert offline
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
              <img src="/landing/einteilung.jpg" alt="" width={1590} height={860} />
            </div>
            <div className="lp-phone lp-phone-hero">
              <img src="/landing/handy-regie.jpg" alt="" width={780} height={1560} />
            </div>
          </div>
        </div>
      </section>

      <section className="lp-strip">
        <div className="lp-wrap lp-strip-in">
          <span>
            <CalendarRange size={16} /> Einteilung in halben Tagen
          </span>
          <span>
            <PenLine size={16} /> Regieschein mit Unterschrift
          </span>
          <span>
            <WifiOff size={16} /> Funktioniert ohne Netz
          </span>
          <span>
            <Users size={16} /> Monteure gratis
          </span>
          <span>
            <ShieldCheck size={16} /> Monteure können nichts löschen
          </span>
        </div>
      </section>

      <section id="ablauf" className="lp-roles">
        <div className="lp-wrap">
          <div className="lp-head lp-head-dark">
            <span className="lp-kicker">Ein Ablauf</span>
            <h2>Von der Einteilung bis zur Abrechnung – ohne Zettel und Chat-Gruppen.</h2>
            <p>Der Chef teilt ein, die Monteure arbeiten und dokumentieren am Handy, der Kunde unterschreibt vor Ort. Das Büro hat am Abend alles beisammen.</p>
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

      <section id="regie" className="lp-features lp-regie">
        <div className="lp-wrap">
          <article className="lp-feature lp-mobile">
            <div className="lp-feature-copy">
              <span className="lp-kicker">Digitaler Regieschein</span>
              <h2>Unterschrift statt Zettelwirtschaft.</h2>
              <p>Der Monteur trägt Stunden und Material ein, der Kunde sieht alles auf einen Blick und unterschreibt mit dem Finger. Daraus wird sofort ein sauberes PDF – kein Abtippen, kein verlorener Zettel.</p>
              <ul>
                <li>
                  <Check size={16} /> Stunden je Mitarbeiter und Material mit Menge
                </li>
                <li>
                  <Check size={16} /> Vorher/Nachher-Fotos im PDF
                </li>
                <li>
                  <Check size={16} /> Nach der Unterschrift gesperrt – nichts wird nachträglich geändert
                </li>
                <li>
                  <Check size={16} /> Büro gibt frei – bereit für die Rechnung
                </li>
              </ul>
            </div>
            <div className="lp-phones" aria-hidden>
              <div className="lp-phone">
                <img src="/landing/handy-regie.jpg" alt="" loading="lazy" width={780} height={1560} />
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="lp-why">
        <div className="lp-wrap lp-why-in">
          <div>
            <span className="lp-why-icon">
              <WifiOff size={22} />
            </span>
            <strong>Funktioniert ohne Netz</strong>
            <p>Im Keller, in der Trafostation, am Land: VYSNER läuft weiter. Einteilung ansehen, Fotos machen, Regieschein unterschreiben lassen – alles wird sofort am Gerät gespeichert.</p>
          </div>
          <div>
            <span className="lp-why-icon">
              <Users size={22} />
            </span>
            <strong>Monteure gratis</strong>
            <p>Kein Preis pro Kopf. Die Firma zahlt einen Fixpreis – jeder Monteur kommt kostenlos dazu, auch Leiharbeiter und Subunternehmer.</p>
          </div>
          <div>
            <span className="lp-why-icon">
              <Smartphone size={22} />
            </span>
            <strong>In 5 Minuten startklar</strong>
            <p>Ohne Installation, am PC und am Handy. Leute anlegen, Baustelle anlegen, einteilen – fertig.</p>
          </div>
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
                <img src={f.img} alt={f.alt} loading="lazy" width={f.w} height={f.h} />
              </div>
            </article>
          ))}

          <article className="lp-feature lp-mobile">
            <div className="lp-feature-copy">
              <span className="lp-kicker">Am Handy</span>
              <h2>Für die Baustelle gebaut.</h2>
              <p>Große Knöpfe, wenig Text. Foto drücken – die Kamera geht auf. Mangel behoben – Nachher-Foto, fertig.</p>
              <ul>
                <li>
                  <Check size={16} /> „Heute zu tun“ für jeden Monteur
                </li>
                <li>
                  <Check size={16} /> Eigene Mängel mit Knopf „Behoben“
                </li>
                <li>
                  <Check size={16} /> Fotos nach Bereich, direkt aus der Kamera
                </li>
                <li>
                  <Check size={16} /> Monteure erfassen und haken ab, löschen aber nichts
                </li>
              </ul>
            </div>
            <div className="lp-phones" aria-hidden>
              <div className="lp-phone">
                <img src="/landing/handy-heute.jpg" alt="" loading="lazy" width={780} height={1560} />
              </div>
              <div className="lp-phone lp-phone-2">
                <img src="/landing/handy-fotos.jpg" alt="" loading="lazy" width={780} height={1560} />
              </div>
            </div>
          </article>
        </div>
      </section>

      <section id="umfang" className="lp-modules">
        <div className="lp-wrap">
          <div className="lp-head">
            <span className="lp-kicker">Umfang</span>
            <h2>Alles, was ein kleiner Betrieb braucht. Nicht mehr.</h2>
            <p>VYSNER ist kein überladenes ERP. Sechs Bereiche – und jeder davon funktioniert auch am Handy und ohne Netz.</p>
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
          <div className="lp-module lp-soon lp-soon-wide">
            <span className="lp-module-icon">
              <FolderKanban size={22} />
            </span>
            <div>
              <strong>
                Von der Baustelle zur Rechnung <em>bald</em>
              </strong>
              <p>Regiestunden und Material landen direkt in VYSNER One – Baustelle und Rechnung aus einer Hand.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="preis" className="lp-price">
        <div className="lp-wrap">
          <div className="lp-head">
            <span className="lp-kicker">Preis</span>
            <h2>Ein Fixpreis für die Firma. Monteure gratis.</h2>
            <p>Große Tools rechnen pro Nutzer ab – das wird für kleine Betriebe schnell teuer. Bei VYSNER zahlt die Firma einen festen Monatspreis.</p>
          </div>
          <div className="lp-price-card">
            <div>
              <strong>Firmenlizenz</strong>
              <span className="lp-price-tag">Fixpreis pro Monat</span>
              <small>Preis auf Anfrage – abhängig von der Zahl der Büro-Zugänge, nie von den Monteuren.</small>
            </div>
            <ul>
              <li>
                <Check size={16} /> Chef, Büro und Bauleitung inklusive
              </li>
              <li>
                <Check size={16} /> Monteure unbegrenzt und kostenlos
              </li>
              <li>
                <Check size={16} /> Einteilung, Regieschein, Mängel, Fotos, Berichte
              </li>
              <li>
                <Check size={16} /> Offline am Handy, am PC im Browser
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
            <span className="lp-kicker">So einfach geht&apos;s</span>
            <h2>In drei Schritten auf der Baustelle.</h2>
          </div>
          <ol className="lp-step-list">
            <li>
              <span>1</span>
              <strong>Team anlegen</strong>
              <p>Monteure und Büro eintragen und die Rechte vergeben – Monteure kosten nichts extra.</p>
            </li>
            <li>
              <span>2</span>
              <strong>Baustelle anlegen</strong>
              <p>Name, Ort, Zeitraum – dann die Leute einteilen und die Struktur anlegen.</p>
            </li>
            <li>
              <span>3</span>
              <strong>Einteilen</strong>
              <p>Wer macht wann was – die Monteure sehen es am Handy, Regiescheine und Fotos kommen von selbst zurück.</p>
            </li>
          </ol>
        </div>
      </section>

      <section className="lp-final">
        <div className="lp-wrap lp-final-in">
          <div>
            <h2>Sehen Sie selbst, wie einfach es ist.</h2>
            <p>Die Demo-Firma ist sofort startklar – mit Einteilung, Baustellen, Regiescheinen, Fotos und Mängeln.</p>
          </div>
          <div className="lp-cta">
            <Link href="/demo" className="lp-btn lp-btn-white lp-btn-lg">
              Demo starten <ArrowRight size={18} />
            </Link>
            <Link href="/demo?start=leer" className="lp-btn lp-btn-glass lp-btn-lg">
              <HardHat size={17} /> Leer starten
            </Link>
          </div>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-wrap lp-footer-in">
          <Image src="/brand/vysner-logo.png" alt="VYSNER" width={125} height={25} />
          <span>Einteilung und Regie für Bau und Handwerk.</span>
          <span className="lp-spacer" />
          <Link href="/demo">Demo</Link>
          <Link href="/dashboard">Anmelden</Link>
          <span>© {new Date().getFullYear()} VYSNER</span>
        </div>
      </footer>
    </div>
  );
}
