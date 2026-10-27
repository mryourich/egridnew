"use client";

import { CalendarPlus, CheckCircle2, HardHat } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { today } from "@/core/date";
import { fmtWhen } from "@/core/format";
import { locate } from "@/core/modules";
import { rightsOf, scopedPeople } from "@/core/roles";
import { personName, useStore } from "@/core/store";
import type { Absence } from "@/core/types";
import { Avatar, Button, Empty, PageHead } from "@/core/ui";
import { visibleProjects } from "./model";
import { StickyBoard } from "./sticky";
import { AbsenceCalendar, AbsenceForm } from "./team";

/** All my sticky notes on one board: personal ones and those of my projects. */
export function NotesBoard() {
  const { data } = useStore();
  const ids = new Set(visibleProjects(data).map((p) => p.id));
  const notes = data.notes.filter((n) => (n.projectId ? ids.has(n.projectId) && (n.pinned || n.createdBy === data.meId) : n.createdBy === data.meId));
  return (
    <>
      <PageHead kicker="Notizen" title="Dashboard" sub="Deine Notizzettel – persönliche und angeheftete aus deinen Projekten. Klick daneben speichert." />
      <StickyBoard notes={notes} projectId="" showProject empty="Ersten Notizzettel schreiben" />
    </>
  );
}

/** What happened in my projects, newest first. */
export function ActivityFeed() {
  const { data } = useStore();
  const projects = visibleProjects(data);
  const ids = new Set(projects.map((p) => p.id));
  const [project, setProject] = useState("");
  const list = data.activity.filter((a) => ids.has(a.projectId) && (!project || a.projectId === project)).slice(0, 150);
  return (
    <>
      <PageHead kicker="Aktivitäten" title="Dashboard" sub="Wer hat wann was gemacht – in allen Projekten, die du siehst.">
        <select className="select-sm" value={project} onChange={(e) => setProject(e.target.value)} aria-label="Projekt">
          <option value="">Alle Projekte</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </PageHead>
      <div className="panel">
        {list.length === 0 ? (
          <p className="panel-empty">Noch nichts passiert.</p>
        ) : (
          <ul className="feed">
            {list.map((a) => (
              <li key={a.id}>
                <Avatar id={a.by} size={26} />
                <span>
                  <b>{personName(data, a.by) || "Jemand"}</b> {a.text}
                  <small>
                    <Link href={`/projekte/${a.projectId}`}>{projects.find((p) => p.id === a.projectId)?.name}</Link> · {fmtWhen(a.at)}
                  </small>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

/** Planning › absences: the month calendar of everyone in view. */
export function PlanningAbsences() {
  const { data } = useStore();
  const [away, setAway] = useState<Partial<Absence> | null>(null);
  const edit = rightsOf(data).team || rightsOf(data).plan;
  const people = scopedPeople(data);
  const t = today();
  return (
    <>
      <PageHead kicker="Abwesenheiten" title="Planung" sub="Urlaub, Zeitausgleich, Krankenstand und Schulung – über mehrere Tage ziehen trägt ein.">
        {edit && (
          <Button variant="primary" icon={<CalendarPlus size={15} />} onClick={() => setAway({ start: t, end: t, type: "urlaub" })}>
            Abwesenheit eintragen
          </Button>
        )}
      </PageHead>
      <AbsenceCalendar people={people} onPick={(a) => edit && setAway(a)} />
      {away && <AbsenceForm absence={away} people={people} onClose={() => setAway(null)} />}
    </>
  );
}

/** Modules that come next: the eGrid roadmap page. */
export function ComingSoon() {
  const path = usePathname();
  const { module, sub } = locate(path);
  const { notify } = useStore();
  if (!module) return <Empty title="Seite nicht gefunden" />;
  const item = module.subItems.find((s) => s.key === sub) ?? module.subItems[0];
  return (
    <>
      <PageHead kicker={item.label} title={module.label} sub={module.kicker} />
      <div className="coming-soon">
        <section className="coming-panel">
          <div className="coming-icon">
            <module.icon size={24} />
          </div>
          <span>Coming soon</span>
          <h2>{module.label} wird als nächstes Modul vorbereitet.</h2>
          <p>
            Der Bereich <strong>{item.label}</strong> bekommt dieselbe ruhige Bedienlogik wie der SiteManager: klare Listen, schnelle Aktionen, Rechte und saubere Auswertungen.
          </p>
          <div className="coming-actions">
            <button className="primary-action" type="button" onClick={() => notify(`${module.label} ist vorgemerkt.`)}>
              <CheckCircle2 size={16} />
              Vormerken
            </button>
            <Link className="secondary-action" href="/projekte">
              <HardHat size={16} />
              Zum SiteManager
            </Link>
          </div>
        </section>
        <section className="dashboard-card coming-list">
          <div className="widget-header">
            <h2>Geplante Funktionen</h2>
          </div>
          {module.subItems.map((s) => (
            <div className="coming-row" key={s.key}>
              <span>
                <s.icon size={15} />
              </span>
              <div>
                <strong>{s.label}</strong>
                <small>{s.description}</small>
              </div>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}
