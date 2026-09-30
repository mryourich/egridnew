"use client";

import { CalendarRange, FolderKanban, ShieldAlert, Truck, Users } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { useEditor } from "@/components/shell";
import { Badge, Card, Dot, Empty, Kpi, PageHeader, Progress } from "@/components/ui";
import { addDays, diffDays, fmt, fmtShort, inRange, isWeekend, startOfWeek, today, weekdayShort } from "@/lib/date";
import * as L from "@/lib/labels";
import { currentUser, findConflicts, projectProgress, resourceName, roleOf, useStore } from "@/lib/store";
import { HrHome } from "@/components/hr-home";
import { MyWork } from "@/components/my-work";
import { SitesOverview } from "@/components/sites-overview";

export default function DashboardPage() {
  const { data } = useStore();
  const role = roleOf(currentUser(data));
  if (role === "monteur") return <MyWork />;
  if (role === "bl") return <SitesOverview />;
  if (role === "hr") return <HrHome />;
  return <ManagementHome />;
}

function ManagementHome() {
  const { data } = useStore();
  const openEditor = useEditor();
  const t = today();
  const employees = data.employees.filter((e) => e.active);
  const conflicts = useMemo(() => findConflicts(data), [data]);

  const absentToday = data.absences.filter((a) => inRange(t, a.start, a.end));
  const bookedToday = new Set(
    data.assignments
      .filter((a) => a.resourceType === "employee" && inRange(t, a.start, a.end) && !absentToday.some((ab) => ab.employeeId === a.resourceId))
      .map((a) => a.resourceId)
  );
  const freeToday = employees.filter((e) => !bookedToday.has(e.id) && !absentToday.some((a) => a.employeeId === e.id));
  const active = data.projects.filter((p) => p.status === "aktiv");

  // Employee utilisation for the next 10 working days.
  const week = useMemo(() => {
    const list: { date: string; booked: number; absent: number; capacity: number }[] = [];
    for (let d = startOfWeek(t); list.length < 10; d = addDays(d, 1)) {
      if (isWeekend(d)) continue;
      const absent = employees.filter((e) => data.absences.some((a) => a.employeeId === e.id && inRange(d, a.start, a.end))).length;
      const booked = employees.filter(
        (e) => !data.absences.some((a) => a.employeeId === e.id && inRange(d, a.start, a.end)) && data.assignments.some((a) => a.resourceType === "employee" && a.resourceId === e.id && inRange(d, a.start, a.end))
      ).length;
      list.push({ date: d, booked, absent, capacity: employees.length });
    }
    return list;
  }, [data, employees, t]);

  // Upcoming deadlines across modules.
  const deadlines = useMemo(() => {
    const horizon = addDays(t, 30);
    const items: { date: string; label: string; detail: string; tone: L.Tone; href: string }[] = [];
    for (const e of employees)
      for (const q of e.qualifications)
        if (q.validUntil && q.validUntil <= horizon) items.push({ date: q.validUntil, label: `${q.name} – ${e.name}`, detail: "Qualifikation", tone: q.validUntil < t ? "red" : "amber", href: "/ressourcen" });
    for (const v of data.vehicles) if (v.nextService <= horizon) items.push({ date: v.nextService, label: `${v.name} ${v.plate}`, detail: "Service / Pickerl", tone: v.nextService < t ? "red" : "amber", href: "/ressourcen" });
    for (const q of data.equipment) if (q.nextInspection <= horizon) items.push({ date: q.nextInspection, label: q.name, detail: "Geräteprüfung", tone: q.nextInspection < t ? "red" : "amber", href: "/ressourcen" });
    for (const task of data.tasks)
      if (task.milestone && task.status !== "erledigt" && task.start <= horizon) items.push({ date: task.start, label: task.title, detail: data.projects.find((p) => p.id === task.projectId)?.name ?? "Meilenstein", tone: "blue", href: `/projekte/${task.projectId}` });
    for (const m of data.materials)
      if (m.status !== "geliefert" && m.deliveryDate <= addDays(t, 14)) items.push({ date: m.deliveryDate, label: m.name, detail: "Lieferung", tone: m.deliveryDate < t ? "red" : "cyan", href: `/projekte/${m.projectId}` });
    return items.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 10);
  }, [data, employees, t]);

  return (
    <div className="page">
      <PageHeader
        title={`Guten ${new Date().getHours() < 11 ? "Morgen" : new Date().getHours() < 18 ? "Tag" : "Abend"}`}
        subtitle={`${weekdayShort(t)}, ${fmt(t)} · ${data.company.name}`}
        actions={
          <>
            <Link className="btn" href="/teamgrid">
              Meine Baustellen
            </Link>
            <button className="btn btn-primary" type="button" onClick={() => openEditor({ kind: "assignment" })}>
              Einplanen
            </button>
          </>
        }
      />

      <div className="kpi-grid">
        <Kpi icon={FolderKanban} label="Aktive Projekte" value={active.length} hint={`${data.projects.filter((p) => p.status === "planung").length} in Planung`} />
        <Kpi icon={Users} label="Heute eingeplant" value={`${bookedToday.size} / ${employees.length}`} hint={`${freeToday.length} frei · ${absentToday.length} abwesend`} tone="green" />
        <Kpi icon={ShieldAlert} label="Planungskonflikte" value={conflicts.size} hint={conflicts.size ? <Link href="/ressourcenplanung">Zur Einsatzplanung</Link> : "alles sauber"} tone={conflicts.size ? "red" : "green"} />
      </div>

      <div className="grid-dash">
        <Card title="Auslastung Mitarbeiter – nächste 10 Arbeitstage" actions={<Link className="link-btn" href="/ressourcenplanung">Einsatzplanung</Link>}>
          <div className="util-chart">
            {week.map((d) => {
              const pct = d.capacity ? (d.booked / d.capacity) * 100 : 0;
              const abs = d.capacity ? (d.absent / d.capacity) * 100 : 0;
              return (
                <div key={d.date} className={`util-col ${d.date === t ? "today" : ""}`} title={`${fmt(d.date)}: ${d.booked} eingeplant, ${d.absent} abwesend, ${d.capacity - d.booked - d.absent} frei`}>
                  <div className="util-bar">
                    <span className="free" style={{ height: `${Math.max(0, 100 - pct - abs)}%` }} />
                    <span className="abs" style={{ height: `${abs}%` }} />
                    <span className="booked" style={{ height: `${pct}%` }} />
                  </div>
                  <strong>{Math.round(pct)}%</strong>
                  <small>
                    {weekdayShort(d.date)} <span className="d">{fmtShort(d.date)}</span>
                  </small>
                </div>
              );
            })}
          </div>
          <div className="util-legend">
            <span>
              <i className="booked" /> eingeplant
            </span>
            <span>
              <i className="abs" /> abwesend
            </span>
            <span>
              <i className="free" /> frei
            </span>
          </div>
        </Card>

        <Card title="Heute frei / abwesend">
          <ul className="compact-list">
            {freeToday.map((e) => (
              <li key={e.id}>
                <button type="button" onClick={() => openEditor({ kind: "assignment", item: { resourceType: "employee", resourceId: e.id } })}>
                  <Badge tone="green">frei</Badge>
                  <strong>{e.name}</strong>
                  <span className="muted">{e.role}</span>
                  <span className="link-btn">einplanen</span>
                </button>
              </li>
            ))}
            {absentToday.map((a) => (
              <li key={a.id}>
                <span className="row-inline">
                  <Badge tone={L.absenceType[a.type].tone}>{L.absenceType[a.type].label}</Badge>
                  <strong>{resourceName(data, "employee", a.employeeId)}</strong>
                  <span className="muted">bis {fmtShort(a.end)}</span>
                </span>
              </li>
            ))}
            {!freeToday.length && !absentToday.length && <Empty>Alle Mitarbeiter sind eingeplant.</Empty>}
          </ul>
        </Card>

        <Card title="Projekte" actions={<Link className="link-btn" href="/projekte">Alle</Link>} flush>
          <ul className="project-list">
            {active.map((p) => {
              const progress = projectProgress(data, p.id);
              const elapsed = Math.max(0, Math.min(100, Math.round((diffDays(p.start, t) / Math.max(1, diffDays(p.start, p.end))) * 100)));
              const issues = data.issues.filter((i) => i.projectId === p.id && i.status !== "erledigt").length;
              return (
                <li key={p.id}>
                  <Link href={`/projekte/${p.id}`}>
                    <Dot color={p.color} />
                    <span className="pl-name">
                      <strong>{p.name}</strong>
                      <small>
                        {p.code} · bis {fmt(p.end)}
                      </small>
                    </span>
                    <span className="pl-progress">
                      <Progress value={progress} color={p.color} />
                      <small className={progress + 10 < elapsed ? "text-red" : "muted"}>
                        {progress} % · Zeit {elapsed} %
                      </small>
                    </span>
                    {issues ? <Badge tone="amber">{issues}</Badge> : <span />}
                  </Link>
                </li>
              );
            })}
            {!active.length && <Empty>Keine aktiven Projekte.</Empty>}
          </ul>
        </Card>

        <Card title="Fristen & Termine (30 Tage)">
          {deadlines.length ? (
            <ul className="compact-list">
              {deadlines.map((d, i) => (
                <li key={i}>
                  <Link href={d.href}>
                    <Badge tone={d.tone}>{d.date < t ? "überfällig" : fmtShort(d.date)}</Badge>
                    <strong>{d.label}</strong>
                    <span className="muted">{d.detail}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Keine Fristen in den nächsten 30 Tagen.</Empty>
          )}
        </Card>


        <Card title="Aktivitäten">
          <ul className="timeline">
            {data.activity.slice(0, 8).map((a) => (
              <li key={a.id}>
                <span>{a.text}</span>
                <small>
                  {fmt(a.at.slice(0, 10))} {a.at.slice(11, 16)}
                </small>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="quick-links">
        <Link href="/ressourcenplanung" className="quick-link">
          <CalendarRange size={18} /> Einsatzplanung öffnen
        </Link>
        <Link href="/ressourcen" className="quick-link">
          <Truck size={18} /> Fuhrpark & Geräte
        </Link>
      </div>
    </div>
  );
}
