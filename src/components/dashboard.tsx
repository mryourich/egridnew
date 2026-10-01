"use client";

import { AlertTriangle, CalendarClock, CheckCircle2, ChevronRight, ClipboardList, FolderKanban, Package, Plus, TrendingUp, Users } from "lucide-react";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { fmt, fmtShort, today, weekdayLong } from "@/lib/date";
import * as L from "@/lib/labels";
import { ago, projectStats } from "@/lib/overview";
import { shortPath } from "@/lib/site";
import { currentUser, employeeName, fmtStamp, isManager, myProjects, useStore } from "@/lib/store";
import type { Data, Project } from "@/lib/types";
import { useEditor } from "./shell";
import { Empty, Kpi } from "./ui";

function greeting() {
  const h = new Date().getHours();
  return h < 11 ? "Guten Morgen" : h < 18 ? "Guten Tag" : "Guten Abend";
}

/** Name of a plan row: an employee or a free row of the project. */
export function rowName(data: Data, p: Project | undefined, id: string) {
  return data.employees.find((e) => e.id === id)?.name ?? p?.planRows?.find((r) => r.id === id)?.name ?? "–";
}

/** Start: all my projects in one view – progress, tasks, defects, material and what happens today. */
export function Dashboard() {
  const { data } = useStore();
  const openEditor = useEditor();
  const manager = isManager(data);
  const me = currentUser(data);
  const t = today();
  const projects = myProjects(data);
  const rows = projects.map((p) => ({ p, s: projectStats(data, p) }));
  const byId = new Map(projects.map((p) => [p.id, p]));
  const sum = (f: (s: (typeof rows)[number]["s"]) => number) => rows.reduce((n, r) => n + f(r.s), 0);
  const avg = rows.length ? Math.round(sum((s) => s.progress) / rows.length) : 0;

  const openIssues = sum((s) => s.openIssues.length);
  const critical = sum((s) => s.criticalIssues.length);
  const overdue = sum((s) => s.overduePoints.length + s.overdueIssues.length);
  const openPoints = sum((s) => s.openPoints.length);
  const inWork = sum((s) => s.inWork.length);
  const ordered = sum((s) => s.materialOrdered.length);
  const matOpen = sum((s) => s.materialOpen.length);
  const crew = new Set(rows.flatMap((r) => r.s.jobsToday.map((j) => j.employeeId))).size;

  const deadlines = rows
    .flatMap(({ p, s }) => [
      ...[...s.overduePoints, ...s.duePoints].map((n) => ({ key: n.id, p, date: n.due, title: n.title, where: shortPath(data.siteNodes, n.parentId || n.id), kind: "Punkt" as const, href: `/projekte/${p.id}/struktur` })),
      ...s.openIssues.filter((i) => i.due && i.due <= addWeek(t)).map((i) => ({ key: i.id, p, date: i.due, title: i.title, where: i.location, kind: "Mangel" as const, href: `/projekte/${p.id}/maengel` }))
    ])
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 8);
  const crit = rows.flatMap(({ p, s }) => s.criticalIssues.map((i) => ({ p, i }))).slice(0, 6);
  const todayJobs = rows.flatMap(({ p, s }) => s.jobsToday.map((j) => ({ p, j })));
  const material = rows.flatMap(({ p, s }) => s.materialOrdered.map((m) => ({ p, m }))).slice(0, 6);
  const activity = data.activity.filter((a) => byId.has(a.projectId)).slice(0, 8);

  return (
    <div className="page page-wide dash">
      <header className="hero">
        <div>
          <h1>
            {greeting()}, {me?.name.split(" ")[0]}
          </h1>
          <p>
            {weekdayLong(t)}, {fmt(t)} · {projects.length} {projects.length === 1 ? "Projekt" : "Projekte"} · {data.company.name}
          </p>
        </div>
        {manager && (
          <div className="page-actions">
            <button className="btn btn-primary" type="button" onClick={() => openEditor({ kind: "project" })}>
              <Plus size={15} /> Neues Projekt
            </button>
          </div>
        )}
      </header>

      <div className="kpi-grid dash-kpis">
        <Kpi icon={TrendingUp} label="Ø Fortschritt" value={`${avg} %`} hint={`${projects.length} Projekte`} />
        <Kpi icon={ClipboardList} label="Offene Punkte" value={openPoints} hint={`${inWork} in Arbeit`} tone="blue" />
        <Kpi icon={AlertTriangle} label="Offene Mängel" value={openIssues} hint={critical ? `${critical} hoch / kritisch` : "nichts Kritisches"} tone={critical ? "red" : openIssues ? "amber" : "green"} />
        <Kpi icon={CalendarClock} label="Überfällig" value={overdue} hint="Punkte und Mängel" tone={overdue ? "red" : "green"} />
        <Kpi icon={Package} label="Material" value={ordered} hint={`bestellt · ${matOpen} noch offen`} tone="amber" />
        <Kpi icon={Users} label="Heute im Einsatz" value={crew} hint={`${todayJobs.length} Aufgaben`} tone="green" />
      </div>

      <section className="card card-flush dash-projects">
        <header className="card-header">
          <h2>Projekte</h2>
          <Link href="/projekte" className="link-btn">
            Alle <ChevronRight size={14} />
          </Link>
        </header>
        {rows.length === 0 ? (
          <Empty>
            Noch kein Projekt.{" "}
            {manager && (
              <button className="link-btn" type="button" onClick={() => openEditor({ kind: "project" })}>
                Projekt anlegen
              </button>
            )}
          </Empty>
        ) : (
          <div className="dp-table">
            <div className="dp-row dp-th">
              <span>Projekt</span>
              <span>Fortschritt</span>
              <span>Punkte offen</span>
              <span>Mängel</span>
              <span>Material</span>
              <span>Heute</span>
              <span>Ende</span>
            </div>
            {rows.map(({ p, s }) => (
              <Link key={p.id} href={`/projekte/${p.id}`} className="dp-row" style={{ "--c": p.color } as CSSProperties}>
                <span className="dp-name">
                  {p.image ? <img src={p.image} alt="" /> : <i />}
                  <span>
                    <strong>{p.name}</strong>
                    <small>{[p.code, p.client].filter(Boolean).join(" · ")}</small>
                  </span>
                </span>
                <span className="dp-prog">
                  <span className="dp-bar">
                    <i style={{ width: `${s.progress}%` }} />
                  </span>
                  <b>{s.progress} %</b>
                </span>
                <span data-l="Punkte offen">
                  <b>{s.openPoints.length}</b>
                  {s.overduePoints.length > 0 && <em className="dp-red">{s.overduePoints.length} überfällig</em>}
                  {!s.overduePoints.length && s.inWork.length > 0 && <em>{s.inWork.length} in Arbeit</em>}
                </span>
                <span data-l="Mängel">
                  <b className={s.criticalIssues.length ? "text-red" : ""}>{s.openIssues.length}</b>
                  {s.criticalIssues.length > 0 && <em className="dp-red">{s.criticalIssues.length} kritisch</em>}
                </span>
                <span data-l="Material">
                  <b>{s.materialOrdered.length + s.materialOpen.length}</b>
                  {s.materialOrdered.length > 0 && <em>{s.materialOrdered.length} bestellt</em>}
                </span>
                <span data-l="Heute">
                  <b>{s.crewToday}</b>
                  <em>{s.crewToday === 1 ? "Person" : "Personen"}</em>
                </span>
                <span data-l="Ende">
                  <b>{p.end ? fmtShort(p.end) : "–"}</b>
                  {s.daysLeft !== null && <em className={s.daysLeft < 0 ? "dp-red" : ""}>{s.daysLeft < 0 ? `${-s.daysLeft} T. drüber` : `noch ${s.daysLeft} T.`}</em>}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <div className="dash-grid">
        <Panel title="Fällig & überfällig" icon={<CalendarClock size={16} />} empty="Nichts fällig in den nächsten 7 Tagen.">
          {deadlines.map((d) => (
            <Link key={d.key} href={d.href} className="dl-item">
              <span className={`dl-date ${d.date < t ? "late" : d.date === t ? "now" : ""}`}>{d.date < t ? "überfällig" : d.date === t ? "heute" : fmtShort(d.date)}</span>
              <span>
                <strong>{d.title}</strong>
                <small>
                  {d.kind} · {d.p.name}
                  {d.where ? ` · ${d.where}` : ""}
                </small>
              </span>
            </Link>
          ))}
        </Panel>

        <Panel title="Hoch & kritisch" icon={<AlertTriangle size={16} />} empty={<><CheckCircle2 size={15} /> Keine kritischen Mängel.</>}>
          {crit.map(({ p, i }) => (
            <Link key={i.id} href={`/projekte/${p.id}/maengel`} className="dl-item">
              {i.photo ? <img className="dl-thumb" src={i.photo} alt="" /> : <span className={`dl-sev sev-${i.severity}`}>{L.severity[i.severity].label}</span>}
              <span>
                <strong>{i.title}</strong>
                <small>
                  {p.name}
                  {i.location ? ` · ${i.location}` : ""}
                  {i.assigneeId ? ` · ${employeeName(data, i.assigneeId)}` : ""}
                </small>
              </span>
            </Link>
          ))}
        </Panel>

        <Panel title="Heute auf den Baustellen" icon={<Users size={16} />} empty="Für heute ist nichts eingeplant.">
          {todayJobs.slice(0, 8).map(({ p, j }) => (
            <Link key={j.id} href={`/projekte/${p.id}/plan`} className="dl-item">
              <i className="dl-bar" style={{ background: j.color }} />
              <span>
                <strong>{j.title || "Aufgabe"}</strong>
                <small>
                  {rowName(data, p, j.employeeId)} · {p.name}
                </small>
              </span>
            </Link>
          ))}
          {todayJobs.length > 8 && <p className="muted small dl-more">+ {todayJobs.length - 8} weitere</p>}
        </Panel>

        <Panel title="Material bestellt" icon={<Package size={16} />} empty="Nichts unterwegs.">
          {material.map(({ p, m }) => (
            <Link key={m.id} href={`/projekte/${p.id}/material`} className="dl-item">
              <span className="dl-qty">
                {m.qty} {m.unit}
              </span>
              <span>
                <strong>{m.name}</strong>
                <small>
                  {m.artNo ? `${m.artNo} · ` : ""}
                  {p.name}
                </small>
              </span>
            </Link>
          ))}
        </Panel>

        <Panel title="Letzte Aktivität" icon={<FolderKanban size={16} />} empty="Noch nichts passiert." wide>
          {activity.map((a) => (
            <Link key={a.id} href={`/projekte/${a.projectId}`} className="dl-item dl-act">
              <i className="dl-dot" style={{ background: byId.get(a.projectId)?.color }} />
              <span>
                <strong>{a.text}</strong>
                <small title={ago(a.at)}>
                  {a.by ? `${employeeName(data, a.by)} · ` : ""}
                  {fmtStamp(a.at)} · {byId.get(a.projectId)?.name}
                </small>
              </span>
            </Link>
          ))}
        </Panel>
      </div>
    </div>
  );
}

function addWeek(d: string) {
  const x = new Date(`${d}T12:00:00`);
  x.setDate(x.getDate() + 7);
  return x.toISOString().slice(0, 10);
}

export function Panel({ title, icon, empty, wide, children, action }: { title: string; icon: ReactNode; empty: ReactNode; wide?: boolean; children: ReactNode[] | ReactNode; action?: ReactNode }) {
  const list = Array.isArray(children) ? children.flat().filter(Boolean) : children ? [children] : [];
  return (
    <section className={`card dash-panel ${wide ? "wide" : ""}`}>
      <header className="card-header">
        <h2>
          {icon} {title}
        </h2>
        {action}
      </header>
      {list.length ? <div className="dl-list">{list}</div> : <p className="dl-empty">{empty}</p>}
    </section>
  );
}
