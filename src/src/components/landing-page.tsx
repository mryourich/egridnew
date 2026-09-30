import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import {
  ArrowRight,
  BarChart3,
  Building2,
  Car,
  CheckCircle2,
  ClipboardList,
  Database,
  FileCheck2,
  HardHat,
  LockKeyhole,
  Play,
  ShieldCheck,
  Sparkles,
  UsersRound,
  Workflow
} from "lucide-react";

const heroMetrics = [
  { value: "4", label: "Kernmodule" },
  { value: "68%", label: "Projektfortschritt" },
  { value: "41", label: "aktive Dokumente" }
];

const productModules = [
  {
    icon: HardHat,
    kicker: "Bau & Service",
    title: "TeamGrid",
    text: "Open Points, Aufgaben, Mängel, Dokumentation und Berichte laufen in einem klaren Projektcockpit zusammen.",
    metric: "12 Updates heute",
    href: "/client/eww-test/teamgrid",
    tone: "blue"
  },
  {
    icon: UsersRound,
    kicker: "Organisation",
    title: "People",
    text: "Rollen, Teams, Verfügbarkeit und Qualifikationen bleiben nachvollziehbar pro Firma und Workspace.",
    metric: "Rollenbasiert",
    href: "/client/eww-test/people",
    tone: "green"
  },
  {
    icon: Car,
    kicker: "Ressourcen",
    title: "Fleet",
    text: "Fahrzeuge, Reservierungen, Wartung, Schäden und Dokumente sind direkt mit der operativen Arbeit verbunden.",
    metric: "Live Bestand",
    href: "/client/eww-test/fleet",
    tone: "amber"
  },
  {
    icon: FileCheck2,
    kicker: "Wissen & Freigabe",
    title: "Datei-Zentrale",
    text: "Projektunterlagen, Firmenfiles, Fristen und Freigaben landen dort, wo Teams sie wirklich brauchen.",
    metric: "41 Dateien",
    href: "/client/eww-test/datei-zentrale",
    tone: "violet"
  }
];

const cockpitRows = [
  { icon: ClipboardList, label: "Open Points", project: "Netzausbau Nord", value: "68%", progress: "68%" },
  { icon: ShieldCheck, label: "Mängel", project: "Trafo Station 12", value: "3 offen", progress: "42%" },
  { icon: FileCheck2, label: "Dokumente", project: "Abnahme Paket", value: "41", progress: "82%" }
];

const workflowSteps = [
  {
    title: "Firma anlegen",
    text: "Mandant, Rollen und Firmen-ID werden sauber getrennt eingerichtet.",
    icon: Building2
  },
  {
    title: "Teams verbinden",
    text: "Mitarbeiter treten per Code bei und sehen nur den passenden Workspace.",
    icon: UsersRound
  },
  {
    title: "Arbeit steuern",
    text: "Open Points, Aufgaben, Mängel und Dateien bleiben im selben Kontext.",
    icon: Workflow
  },
  {
    title: "Status berichten",
    text: "Fortschritt, Risiken und Nachweise sind jederzeit managementfähig.",
    icon: BarChart3
  }
];

const trustPoints = ["Mandantenfähig", "Rollenbasiert", "EU-ready", "Mobile Teams", "SaaS-ready"];

export function LandingPage() {
  return (
    <main className="landing-page landing-page-pro">
      <nav className="landing-nav pro-nav" aria-label="VYSNpro Navigation">
        <Link className="landing-brand pro-brand" href="/">
          <Image src="/brand/egrid-icon.png" width={42} height={42} alt="VYSNpro" priority />
          <span>
            <strong>VYSNpro</strong>
            <small>Workspace OS</small>
          </span>
        </Link>
        <div className="landing-nav-links">
          <a href="#module">Module</a>
          <a href="#workflow">Workflow</a>
          <a href="#registrierung">Registrierung</a>
        </div>
        <div className="landing-nav-actions">
          <Link className="landing-login" href="/login">Login</Link>
          <Link className="landing-primary" href="/registrieren">Kostenlos starten</Link>
        </div>
      </nav>

      <section className="landing-hero product-hero pro-hero">
        <div className="pro-hero-ambient" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>

        <div className="landing-hero-content pro-hero-copy">
          <span className="landing-pill pro-pill">
            <Sparkles size={15} />
            Business-Plattform für operative Teams
          </span>
          <h1>Steuere Projekte, Teams, Fahrzeuge und Dateien in einem einzigen Workspace.</h1>
          <p>
            VYSNpro verbindet TeamGrid, People, Fleet, Datei-Zentrale, Rollen und Analytics zu einer modernen Firmenzentrale für Bau-, Service- und Projektteams.
          </p>

          <div className="landing-hero-actions pro-hero-actions">
            <Link className="landing-primary large" href="/registrieren/firma">
              Firma registrieren
              <ArrowRight size={17} />
            </Link>
            <Link className="landing-secondary large" href="/registrieren/benutzer">
              Benutzer beitreten
              <UsersRound size={16} />
            </Link>
            <Link className="landing-ghost large" href="/client/eww-test/teamgrid">
              <Play size={16} />
              Demo ansehen
            </Link>
          </div>

          <div className="pro-metric-row" aria-label="VYSNpro Kennzahlen">
            {heroMetrics.map((item) => (
              <div key={item.label}>
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </div>
            ))}
          </div>

          <div className="pro-trust-strip" aria-label="Plattform Eigenschaften">
            {trustPoints.map((item) => (
              <span key={item}>
                <CheckCircle2 size={14} />
                {item}
              </span>
            ))}
          </div>
        </div>

        <aside className="pro-command-center" aria-label="VYSNpro Command Center Vorschau">
          <div className="pro-window">
            <div className="pro-window-top">
              <div>
                <span />
                <span />
                <span />
              </div>
              <strong>VYSNpro Live Cockpit</strong>
              <small>heute</small>
            </div>

            <div className="pro-window-grid">
              <article className="pro-health-card">
                <span className="pro-card-label">Projektstatus</span>
                <strong>68%</strong>
                <small>Netzausbau Nord im Plan</small>
                <div className="pro-health-ring" aria-hidden="true">
                  <span />
                </div>
              </article>

              <article className="pro-focus-card">
                <Database size={18} />
                <span>VYSNpro Core</span>
                <strong>Eine Datenbasis für alle Module</strong>
                <small>Firma · Rollen · Projekte · Dateien</small>
              </article>
            </div>

            <div className="pro-worklist">
              {cockpitRows.map((item) => {
                const Icon = item.icon;
                return (
                  <article key={item.label} style={{ "--progress": item.progress } as CSSProperties}>
                    <span>
                      <Icon size={17} />
                    </span>
                    <div>
                      <strong>{item.label}</strong>
                      <small>{item.project}</small>
                      <i />
                    </div>
                    <em>{item.value}</em>
                  </article>
                );
              })}
            </div>
          </div>

          <div className="pro-floating-card pro-team-card">
            <div className="pro-avatar-stack" aria-hidden="true">
              <Image src="/demo/employee-1.jpeg" width={38} height={38} alt="" />
              <Image src="/demo/employee-2.jpg" width={38} height={38} alt="" />
              <Image src="/demo/person_4_1782285166_9886.jpg" width={38} height={38} alt="" />
            </div>
            <div>
              <strong>Team synchronisiert</strong>
              <small>5 Rollen · 18 aktive Aufgaben</small>
            </div>
          </div>

          <div className="pro-floating-card pro-security-card">
            <LockKeyhole size={18} />
            <div>
              <strong>Mandanten sauber getrennt</strong>
              <small>RLS-Konzept & Firmen-ID</small>
            </div>
          </div>
        </aside>
      </section>

      <section className="landing-section pro-section pro-module-section" id="module">
        <div className="landing-section-head pro-section-head">
          <span>Module</span>
          <h2>Alles, was operative Teams jeden Tag brauchen.</h2>
          <p>
            Die Module funktionieren eigenständig, teilen aber dieselbe Firmen-, Rollen- und Projektlogik. Dadurch bleibt VYSNpro schlank, konsistent und skalierbar.
          </p>
        </div>

        <div className="pro-module-grid">
          {productModules.map((item, index) => {
            const Icon = item.icon;
            return (
              <Link className={`pro-module-card ${item.tone}`} href={item.href} key={item.title} style={{ "--delay": `${index * 80}ms` } as CSSProperties}>
                <span className="pro-module-icon">
                  <Icon size={22} />
                </span>
                <small>{item.kicker}</small>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
                <div>
                  <strong>{item.metric}</strong>
                  <ArrowRight size={16} />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="landing-section pro-section pro-workflow-section" id="workflow">
        <div className="pro-workflow-copy">
          <span>Workflow</span>
          <h2>Vom Firmenstart bis zum Bericht bleibt jeder Schritt nachvollziehbar.</h2>
          <p>
            VYSNpro führt nicht nur Daten zusammen. Es gibt Teams eine klare operative Reihenfolge: registrieren, verbinden, ausführen, dokumentieren und berichten.
          </p>
          <Link className="landing-primary large" href="/client/eww-test/dashboard">
            Dashboard öffnen
            <ArrowRight size={17} />
          </Link>
        </div>

        <div className="pro-process-panel">
          {workflowSteps.map((item, index) => {
            const Icon = item.icon;
            return (
              <article key={item.title}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <Icon size={19} />
                  <strong>{item.title}</strong>
                  <p>{item.text}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="landing-section pro-section pro-insight-band">
        <div>
          <span>Live Übersicht</span>
          <h2>Management sieht sofort, wo Arbeit stockt.</h2>
        </div>
        <div className="pro-insight-grid">
          <article>
            <strong>3</strong>
            <span>offene Mängel</span>
            <small>2 erledigt diese Woche</small>
          </article>
          <article>
            <strong>12</strong>
            <span>neue Updates</span>
            <small>heute im TeamGrid</small>
          </article>
          <article>
            <strong>42</strong>
            <span>Tage bis Deadline</span>
            <small>aktueller Projektplan</small>
          </article>
        </div>
      </section>

      <section className="landing-section pro-section pro-register-cta" id="registrierung">
        <div className="pro-cta-copy">
          <span>Registrierung</span>
          <h2>Zwei klare Einstiege für Firmen und Mitarbeiter.</h2>
          <p>
            Neue Firmen legen ihren Workspace an. Mitarbeiter treten über Firmen- oder Einladungscode bei und landen direkt in der richtigen Umgebung.
          </p>
        </div>
        <div className="pro-cta-actions">
          <Link className="pro-registration-card primary" href="/registrieren/firma">
            <Building2 size={20} />
            <strong>Firma registrieren</strong>
            <small>Neuer Workspace, Admin und Firmenstruktur</small>
            <ArrowRight size={16} />
          </Link>
          <Link className="pro-registration-card" href="/registrieren/benutzer">
            <UsersRound size={20} />
            <strong>Benutzer beitreten</strong>
            <small>Bestehender Workspace per Code</small>
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <footer className="landing-footer pro-footer">
        <span>©2026 VYSNpro</span>
        <div>
          <LockKeyhole size={15} />
          Mandantenfähig · Rollenbasiert · EU-ready
        </div>
      </footer>
    </main>
  );
}
