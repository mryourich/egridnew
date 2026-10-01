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
  ShieldCheck,
  Smartphone,
  Users,
  Wrench
} from "lucide-react";
import "./landing.css";

export const metadata: Metadata = {
  title: { absolute: "VYSNER – Baustellen im Griff" },
  description: "Das Baustellen-Tool für Bauleiter und Monteure: Aufgaben planen, Mängel erfassen und beheben, Fotos dokumentieren und Tagesberichte als PDF."
};

const flow = [
  { icon: CalendarRange, name: "Planen", who: "Bauleitung", text: "Team einteilen, Aufgaben per Rechtsklick in den Plan ziehen – in halben Tagen." },
  { icon: Smartphone, name: "Ausführen", who: "Monteure", text: "Jeder sieht am Handy, was heute zu tun ist, und hakt ab." },
  { icon: Camera, name: "Dokumentieren", who: "alle", text: "Fotos und Mängel direkt mit der Kamera – sortiert nach Bereich." },
  { icon: FileText, name: "Berichten", who: "Bauleitung", text: "Tages-, Foto- und Mängelbericht als PDF für den Auftraggeber." }
];

const features = [
  {
    kicker: "Plan",
    title: "Der Baustellenplan, den Bauleiter wirklich benutzen.",
    text: "Aufgaben wie auf Papier – nur schneller. Ziehen, verlängern, umbenennen, fertig.",
    points: ["Verschieben in halben Tagen", "Rechtsklick: Aufgabe oder Symbol mit Farbpalette", "Urlaub und Krankenstand direkt im Plan", "Kalenderwochen und Feiertage"],
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
    kicker: "Struktur",
    title: "Jeder Bereich, jeder Punkt – abhakbar.",
    text: "Gliedern Sie die Baustelle so, wie Sie sie im Kopf haben: Gebäude, Geschoß, Raum, Punkt.",
    points: ["Beliebig tiefe Struktur", "Fortschritt je Bereich in Prozent", "Fotos und Mängel hängen am richtigen Punkt", "Ein Klick öffnet alles zu einem Punkt"],
    img: "/landing/struktur.jpg",
    w: 2040,
    h: 990,
    alt: "Baustellenstruktur in VYSNER"
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
  { icon: CalendarRange, name: "Plan", text: "Aufgaben und Symbole je Person" },
  { icon: ListChecks, name: "Struktur", text: "Bereiche und Punkte zum Abhaken" },
  { icon: Camera, name: "Fotos", text: "Galerie je Bereich, ZIP und PDF" },
  { icon: AlertTriangle, name: "Mängel", text: "Mit Frist, Zuständigkeit und Nachweis" },
  { icon: ClipboardList, name: "Tagesberichte", text: "Wetter, Team, Arbeiten, PDF" },
  { icon: Users, name: "Team", text: "Einteilen, Urlaub, Krankenstand" }
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
            <a href="#umfang">Umfang</a>
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
              <HardHat size={14} /> Für Bauleiter, Poliere und Monteure
            </span>
            <h1>
              Baustellen im Griff. <span className="lp-grad">Vom Plan bis zur Abnahme.</span>
            </h1>
            <p className="lp-lead">Aufgaben planen, Mängel erfassen und beheben, Fotos dokumentieren, Tagesberichte als PDF – in einer App, die auf der Baustelle jeder sofort versteht.</p>
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
                <Check size={15} /> Ohne Installation
              </li>
              <li>
                <Check size={15} /> Am PC und am Handy
              </li>
              <li>
                <Check size={15} /> In 5 Minuten startklar
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
              <img src="/landing/plan.jpg" alt="" width={2040} height={990} />
            </div>
            <div className="lp-phone lp-phone-hero">
              <img src="/landing/handy-heute.jpg" alt="" width={780} height={1560} />
            </div>
          </div>
        </div>
      </section>

      <section className="lp-strip">
        <div className="lp-wrap lp-strip-in">
          <span>
            <Wrench size={16} /> Mängel mit Vorher/Nachher
          </span>
          <span>
            <FileText size={16} /> Berichte als PDF
          </span>
          <span>
            <Camera size={16} /> Kamera direkt am Handy
          </span>
          <span>
            <CalendarRange size={16} /> Kalenderwochen und Feiertage
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
            <h2>Vom Plan bis zum Bericht – ohne Zettel und Chat-Gruppen.</h2>
            <p>Die Bauleitung plant, die Monteure arbeiten und dokumentieren am Handy. Alles landet automatisch an der richtigen Stelle – und am Ende im Bericht.</p>
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
            <h2>Alles, was auf die Baustelle gehört. Nicht mehr.</h2>
            <p>VYSNER ist kein überladenes ERP. Sechs Bereiche je Baustelle – und jeder davon funktioniert auch am Handy.</p>
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
                Projektleitung <em>bald</em>
              </strong>
              <p>Mehrere Baustellen und Bauleiter überblicken und planen – als nächster Schritt.</p>
            </div>
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
              <p>Monteure und Bauleiter eintragen und die Rechte vergeben – Bauleitung oder Monteur.</p>
            </li>
            <li>
              <span>2</span>
              <strong>Baustelle anlegen</strong>
              <p>Name, Ort, Zeitraum – dann die Leute einteilen und die Struktur anlegen.</p>
            </li>
            <li>
              <span>3</span>
              <strong>Loslegen</strong>
              <p>Aufgaben verteilen, die Monteure sehen sie am Handy – Fotos, Mängel und Berichte kommen von selbst zurück.</p>
            </li>
          </ol>
        </div>
      </section>

      <section className="lp-final">
        <div className="lp-wrap lp-final-in">
          <div>
            <h2>Sehen Sie selbst, wie einfach es ist.</h2>
            <p>Die Demo-Firma ist sofort startklar – mit Baustellen, Team, Plan, Fotos und Mängeln.</p>
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
          <span>Baustellen im Griff.</span>
          <span className="lp-spacer" />
          <Link href="/demo">Demo</Link>
          <Link href="/dashboard">Anmelden</Link>
          <span>© {new Date().getFullYear()} VYSNER</span>
        </div>
      </footer>
    </div>
  );
}
