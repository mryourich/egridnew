"use client";

import { ArrowUpRight, HelpCircle } from "lucide-react";
import Link from "next/link";
import { fmt, today, weekdayLong } from "@/core/date";
import { MODULES, type ModuleKey } from "@/core/modules";
import { me, rightsOf, scopedPeople } from "@/core/roles";
import { useStore } from "@/core/store";
import { modulesFor } from "@/core/shell";
import { projectFacts, visibleProjects } from "./model";
import { plannedOn } from "./plan-kit";

const GREETING = () => {
  const h = new Date().getHours();
  return h < 11 ? "Guten Morgen" : h < 17 ? "Hallo" : "Guten Abend";
};

/** App launcher: every module of the platform as a tile, with a live number – like an operating system for the company. */
export function Launcher() {
  const { data } = useStore();
  const user = me(data);
  const t = today();
  const projects = visibleProjects(data);
  const facts = projects.map((p) => projectFacts(data, p));
  const openDefects = facts.reduce((n, f) => n + f.openDefects.length, 0);
  const mine = data.points.filter((p) => p.type === "task" && p.status !== "done" && p.assigneeIds.includes(data.meId)).length + data.defects.filter((d) => d.status !== "done" && d.ownerId === data.meId).length + data.tasks.filter((x) => !x.done && x.ownerId === data.meId).length;
  const people = scopedPeople(data);
  const away = data.absences.filter((a) => a.start <= t && a.end >= t && people.some((p) => p.id === a.employeeId)).length;
  const live: Partial<Record<ModuleKey, string>> = {
    dashboard: `${mine} Aufgaben für dich`,
    site: `${projects.length} Projekte · ${openDefects} offene Mängel`,
    planning: `${people.filter((p) => plannedOn(data, p.id, t)).length} von ${people.length} heute eingeteilt`,
    people: `${people.length} Personen · ${away} abwesend`,
    settings: rightsOf(data).admin ? data.workspace.name : undefined
  };
  const mods = modulesFor(data);
  const groups = [
    { title: "Arbeit", list: mods.filter((m) => !m.soon && m.key !== "settings") },
    { title: "Bald verfügbar", list: mods.filter((m) => m.soon) },
    { title: "Verwaltung", list: mods.filter((m) => m.key === "settings") }
  ].filter((g) => g.list.length);

  return (
    <div className="launcher">
      <header className="launcher-head">
        <span className="eyebrow">{data.workspace.name}</span>
        <h1>
          {GREETING()}, {user?.name.split(" ")[0]}
        </h1>
        <p>
          {weekdayLong(t)}, {fmt(t)} · Alle VYSNER-Apps an einem Ort – ein Datenstand für Projekte, Planung und Team.
        </p>
      </header>

      {groups.map((g) => (
        <section key={g.title} className="launcher-group">
          <h2>{g.title}</h2>
          <div className="launcher-grid">
            {g.list.map((m) => (
              <Link key={m.key} href={m.path} className={`app-tile ${m.soon ? "soon" : ""}`} style={{ "--app": m.color } as React.CSSProperties}>
                <span className="app-icon">
                  <m.icon size={24} />
                </span>
                <span className="app-text">
                  <strong>{m.label}</strong>
                  <small>{m.kicker}</small>
                  {m.soon ? <em>Bald verfügbar</em> : live[m.key] && <em>{live[m.key]}</em>}
                </span>
                <ArrowUpRight size={16} className="app-go" />
              </Link>
            ))}
          </div>
        </section>
      ))}

      <section className="launcher-group" id="hilfe">
        <h2>Hilfe</h2>
        <div className="launcher-help">
          <HelpCircle size={20} />
          <div>
            <strong>So funktioniert VYSNER</strong>
            <p>
              Links wechselst du zwischen <b>Plattform-Menü</b> (alle Apps) und dem <b>Untermenü</b> der offenen App. Im SiteManager wählst du zuerst ein Projekt; unter <b>Open Points</b> legst du links Bereiche an (Rechtsklick = kopieren, einfügen, löschen) und hakst rechts Punkte ab. Eingaben speichern, sobald du woanders hinklickst.
            </p>
          </div>
        </div>
      </section>
      <p className="launcher-foot">{MODULES.length} Apps · VYSNER Plattform</p>
    </div>
  );
}
