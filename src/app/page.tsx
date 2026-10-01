import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CalendarRange,
  Camera,
  CarFront,
  Check,
  Clock,
  FileText,
  FolderKanban,
  HardHat,
  Layers,
  ShieldCheck,
  Smartphone,
  UserCog,
  Users,
  Wrench
} from "lucide-react";
import "./landing.css";

export const metadata: Metadata = {
  title: { absolute: "VYSNpro – Die Zentrale für Firmen mit Baustellen" },
  description: "Projekte planen, Teams einteilen, Baustellen dokumentieren und Fahrzeuge buchen – in einer App für Büro und Baustelle."
};

const roles = [
  { icon: UserCog, name: "Personal", text: "Legt Mitarbeiter an, vergibt Rechte, trägt Urlaub und Krankenstand ein." },
  { icon: FolderKanban, name: "Projektleitung", text: "Plant Projekte und entscheidet, wer wann auf welcher Baustelle ist." },
  { icon: HardHat, name: "Bauleitung", text: "Verteilt Aufgaben im Baustellenplan, dokumentiert Fotos, Mängel und Tagesberichte." },
  { icon: Smartphone, name: "Monteure", text: "Sehen am Handy, was heute zu tun ist, haken ab und fotografieren." }
];

const features = [
  {
    kicker: "TeamGrid",
    title: "Der Baustellenplan, den Bauleiter wirklich benutzen.",
    text: "Aufgaben wie auf Papier – nur schneller. Ziehen, verlängern, umbenennen, fertig.",
    points: ["Verschieben in halben Tagen", "Rechtsklick: Aufgabe oder Symbol mit Farbpalette", "Urlaub und Krankenstand direkt im Plan", "Kalenderwochen und Feiertage"],
    img: "/landing/teamgrid.jpg",
    alt: "Baustellenplan in VYSNpro"
  },
  {
    kicker: "Ressourcenplanung",
    title: "Wer ist wann wo – auf einen Blick.",
    text: "Alle Mitarbeiter über alle Projekte. Doppelbuchungen und Abwesenheiten fallen sofort auf.",
    points: ["Abteilungen und Teams als Baum", "Einplanen durch Ziehen", "Konflikte rot markiert", "Detail-, Normal- und Übersichtsansicht"],
    img: "/landing/planung.jpg",
    alt: "Ressourcenplanung in VYSNpro"
  },
  {
    kicker: "Fuhrpark",
    title: "Fahrzeuge ohne Zettelwirtschaft.",
    text: "Jeder bucht sein Poolfahrzeug selbst. Der Fuhrpark sieht Termine, Schäden und Kosten.",
    points: ["Freies Fahrzeug in Sekunden finden", "Erinnerung an Service und Pickerl", "Rückgabe mit Kilometer und Schadensmeldung", "Service-Historie mit Kosten je Fahrzeug"],
    img: "/landing/fuhrpark.jpg",
    alt: "Fuhrpark-Wochenplan in VYSNpro"
  }
];

const modules = [
  { icon: FolderKanban, name: "Projekte", text: "Projekte, Terminplan, Einsatzplanung", live: true },
  { icon: HardHat, name: "TeamGrid", text: "Baustellenplan, Struktur, Fotos, Mängel, Berichte", live: true },
  { icon: CarFront, name: "Fuhrpark", text: "Poolbuchung, Werkstatt, Service-Historie", live: true },
  { icon: Users, name: "Personal", text: "Mitarbeiter, Rechte, Abwesenheiten, Qualifikationen", live: true },
  { icon: Clock, name: "Zeiterfassung", text: "Stunden je Baustelle direkt am Handy", live: false }
];

export default function Landing() {
  return (
    <div className="lp">
      <header className="lp-nav">
        <div className="lp-wrap lp-nav-in">
          <Link href="/" className="lp-logo" aria-label="VYSNpro">
            <Image src="/brand/vysnpro-logo-wide.png" alt="VYSNpro" width={167} height={24} priority />
          </Link>
          <nav className="lp-links" aria-label="Seite">
            <a href="#funktionen">Funktionen</a>
            <a href="#rollen">Rollen</a>
            <a href="#module">Module</a>
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
              <Building2 size={14} /> Für Elektro-, Installations- und Baufirmen
            </span>
            <h1>
              Die Zentrale für Firmen <span className="lp-grad">mit Baustellen.</span>
            </h1>
            <p className="lp-lead">Projekte planen, Teams einteilen, Baustellen dokumentieren und Fahrzeuge buchen – in einer App, die jeder im Betrieb sofort versteht. Vom Büro bis zum Monteur am Handy.</p>
            <div className="lp-cta">
              <Link href="/demo" className="lp-btn lp-btn-primary lp-btn-lg">
                Demo ansehen <ArrowRight size={18} />
              </Link>
              <Link href="/demo?start=leer" className="lp-btn lp-btn-outline lp-btn-lg">
                Mit eigener Firma starten
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
                <Check size={15} /> In 5 Minuten eingerichtet
              </li>
            </ul>
          </div>
          <div className="lp-hero-visual" aria-hidden>
            <div className="lp-browser">
              <div className="lp-browser-bar">
                <i />
                <i />
                <i />
                <span>vysnpro.com</span>
              </div>
              <img src="/landing/teamgrid.jpg" alt="" width={2040} height={990} />
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
            <Layers size={16} /> Mehrere Firmen, getrennte Daten
          </span>
          <span>
            <ShieldCheck size={16} /> Rollen und Rechte
          </span>
          <span>
            <Camera size={16} /> Kamera direkt am Handy
          </span>
          <span>
            <FileText size={16} /> Berichte als PDF
          </span>
          <span>
            <CalendarRange size={16} /> Österreichische Feiertage
          </span>
        </div>
      </section>

      <section id="rollen" className="lp-roles">
        <div className="lp-wrap">
          <div className="lp-head lp-head-dark">
            <span className="lp-kicker">Alles verknüpft</span>
            <h2>Ein System. Jeder sieht genau, was er braucht.</h2>
            <p>Was das Personal einträgt, sieht die Projektleitung beim Planen. Was die Projektleitung plant, landet im Plan der Bauleitung – und auf dem Handy der Monteure.</p>
          </div>
          <ol className="lp-chain">
            {roles.map((r, i) => (
              <li key={r.name}>
                <span className="lp-chain-step">{i + 1}</span>
                <span className="lp-chain-icon">
                  <r.icon size={22} />
                </span>
                <strong>{r.name}</strong>
                <p>{r.text}</p>
              </li>
            ))}
          </ol>
          <p className="lp-roles-note">
            <CarFront size={16} />
            <span>
              Dazu der <strong>Fuhrpark</strong>: Jeder bucht selbst, die Fuhrparkverwaltung behält Werkstatt und Kosten im Blick.
            </span>
          </p>
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
              <div className="lp-shot">
                <img src={f.img} alt={f.alt} loading="lazy" width={2040} height={990} />
              </div>
            </article>
          ))}

          <article className="lp-feature lp-mobile">
            <div className="lp-feature-copy">
              <span className="lp-kicker">Am Handy</span>
              <h2>Für die Baustelle gebaut.</h2>
              <p>Große Knöpfe, wenig Text. Foto drücken – die Kamera geht auf. Mangel melden – erst das Bild, dann zwei Worte.</p>
              <ul>
                <li>
                  <Check size={16} /> „Heute zu tun“ für jeden Monteur
                </li>
                <li>
                  <Check size={16} /> Fotos nach Bereich, Export als ZIP oder PDF
                </li>
                <li>
                  <Check size={16} /> Tagesbericht mit KW und Fortschritt als PDF
                </li>
                <li>
                  <Check size={16} /> Monteure dürfen erfassen, aber nichts löschen
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

      <section id="module" className="lp-modules">
        <div className="lp-wrap">
          <div className="lp-head">
            <span className="lp-kicker">Module</span>
            <h2>Starten Sie mit dem, was Sie brauchen.</h2>
            <p>Alle Module greifen auf dieselben Mitarbeiter, Projekte und Fahrzeuge zu – nichts wird doppelt gepflegt.</p>
          </div>
          <div className="lp-module-grid">
            {modules.map((m) => (
              <div key={m.name} className={`lp-module ${m.live ? "" : "lp-soon"}`}>
                <span className="lp-module-icon">
                  <m.icon size={22} />
                </span>
                <strong>
                  {m.name} {!m.live && <em>bald</em>}
                </strong>
                <p>{m.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-steps">
        <div className="lp-wrap">
          <div className="lp-head">
            <span className="lp-kicker">So einfach geht&apos;s</span>
            <h2>In drei Schritten zur ersten Baustelle.</h2>
          </div>
          <ol className="lp-step-list">
            <li>
              <span>1</span>
              <strong>Mitarbeiter anlegen</strong>
              <p>Das Personal legt alle an und vergibt die Rechte: Projektleitung, Bauleitung, Monteur, Fuhrpark.</p>
            </li>
            <li>
              <span>2</span>
              <strong>Projekt planen</strong>
              <p>Die Projektleitung legt das Projekt an, wählt die Bauleitung und plant das Team ein.</p>
            </li>
            <li>
              <span>3</span>
              <strong>Baustelle läuft</strong>
              <p>Die Bauleitung verteilt Aufgaben, die Monteure sehen sie am Handy – Fotos und Berichte kommen von selbst zurück.</p>
            </li>
          </ol>
        </div>
      </section>

      <section className="lp-final">
        <div className="lp-wrap lp-final-in">
          <div>
            <h2>Sehen Sie selbst, wie einfach es ist.</h2>
            <p>Die Demo-Firma ist sofort startklar – mit Projekten, Baustellen, Team und Fuhrpark.</p>
          </div>
          <div className="lp-cta">
            <Link href="/demo" className="lp-btn lp-btn-white lp-btn-lg">
              Demo starten <ArrowRight size={18} />
            </Link>
            <Link href="/demo?start=leer" className="lp-btn lp-btn-glass lp-btn-lg">
              <Wrench size={17} /> Leer starten
            </Link>
          </div>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-wrap lp-footer-in">
          <Image src="/brand/vysnpro-logo-wide.png" alt="VYSNpro" width={139} height={20} />
          <span>Die Zentrale für Firmen mit Baustellen.</span>
          <span className="lp-spacer" />
          <Link href="/demo">Demo</Link>
          <Link href="/dashboard">Anmelden</Link>
          <span>© {new Date().getFullYear()} VYSNpro</span>
        </div>
      </footer>
    </div>
  );
}
