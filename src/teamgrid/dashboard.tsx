"use client";

import { AlertTriangle, Camera, ChevronRight, ListChecks, Network, PenLine, StickyNote } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { addDays, fmt, isWeekend, today, weekdayLong, weekdayShort } from "@/core/date";
import { defectNo, fmtShort, PRIORITY } from "@/core/format";
import { byRole, isField, levelView, me, ROLLE_LABEL, scopedPeople, subtree } from "@/core/roles";
import { personName, useStore } from "@/core/store";
import type { Project } from "@/core/types";
import { Seg, Tag } from "@/core/ui";
import { pathLabel, visibleProjects } from "./model";
import { dayText, plannedOn } from "./plan-kit";
import { StickyBoard } from "./sticky";

type Filter = "alle" | "spaet" | "woche";
type Row = { key: string; kind: "Punkt" | "Mangel" | "Aufgabe"; title: string; sub: string; due: string; project: Project; href: string; tick?: () => void };

const PRIO_RANK = { high: 0, medium: 1, low: 2 };

/** Start page: my tasks, open defects, my area, sticky notes – only what matters today. */
export function Dashboard() {
  const { data, save, notify } = useStore();
  const t = today();
  const user = me(data);
  const field = isField(data);
  const projects = visibleProjects(data);
  const byId = new Map(projects.map((p) => [p.id, p]));
  const [filter, setFilter] = useState<Filter>("alle");
  const weekEnd = addDays(t, 7);

  const rows: Row[] = [
    ...data.points
      .filter((x) => x.type === "task" && x.status !== "done" && x.assigneeIds.includes(data.meId) && byId.has(x.projectId))
      .map((x): Row => ({ key: x.id, kind: "Punkt", title: x.title, sub: pathLabel(data.points, x.parentId), due: x.due, project: byId.get(x.projectId)!, href: `/projekte/${x.projectId}/punkte?punkt=${x.id}`, tick: () => (save("points", { ...x, status: "done", doneBy: data.meId, doneAt: new Date().toISOString() }, `„${x.title}“ erledigt`), notify("Erledigt ✓")) })),
    ...data.defects
      .filter((d) => d.status !== "done" && d.ownerId === data.meId && byId.has(d.projectId))
      .map((d): Row => ({ key: d.id, kind: "Mangel", title: d.title, sub: [defectNo(d.no), d.location].filter(Boolean).join(" · "), due: d.due, project: byId.get(d.projectId)!, href: `/projekte/${d.projectId}/maengel?mangel=${d.id}` })),
    ...data.tasks
      .filter((x) => !x.done && x.ownerId === data.meId && byId.has(x.projectId))
      .map((x): Row => ({ key: x.id, kind: "Aufgabe", title: x.title, sub: "", due: x.due, project: byId.get(x.projectId)!, href: `/projekte/${x.projectId}/aufgaben`, tick: () => (save("tasks", { ...x, done: true, doneAt: new Date().toISOString() }, `Aufgabe „${x.title}“ erledigt`), notify("Erledigt ✓")) }))
  ].sort((a, b) => (a.due || "9999").localeCompare(b.due || "9999") || a.title.localeCompare(b.title, "de"));
  const late = rows.filter((x) => x.due && x.due < t);
  const week = rows.filter((x) => x.due && x.due <= weekEnd);
  const shown = filter === "spaet" ? late : filter === "woche" ? week : rows;

  const openDefects = data.defects.filter((d) => d.status !== "done" && byId.has(d.projectId)).sort((a, b) => PRIO_RANK[a.priority] - PRIO_RANK[b.priority] || (a.due || "9").localeCompare(b.due || "9"));
  const regie = data.regie.filter((r) => byId.has(r.projectId) && (!r.signature || !r.approvedAt));
  const toSign = regie.filter((r) => !r.signature);
  const toRelease = regie.filter((r) => r.signature && !r.approvedAt);
  const people = scopedPeople(data);
  const planned = people.filter((e) => plannedOn(data, e.id, t)).length;
  const notes = data.notes.filter((n) => (n.projectId ? byId.has(n.projectId) && (n.pinned || n.createdBy === data.meId) : n.createdBy === data.meId));

  return (
    <div className="page">
      <header className="b-head">
        <div>
          <span className="b-kicker">{data.workspace.name}</span>
          <h1>Dashboard</h1>
          <p>
            {weekdayLong(t)}, {fmt(t)} · {user?.name}
          </p>
        </div>
      </header>

      <div className="kpis dash-kpis">
        <button type="button" className={`kpi ${filter === "alle" ? "on" : ""}`} onClick={() => setFilter("alle")}>
          <span>Meine Aufgaben</span>
          <b>{rows.length}</b>
        </button>
        <button type="button" className={`kpi ${filter === "spaet" ? "on" : ""}`} onClick={() => setFilter("spaet")}>
          <span>Überfällig</span>
          <b className={late.length ? "bad" : ""}>{late.length}</b>
        </button>
        <a href="#maengel" className="kpi">
          <span>Offene Mängel</span>
          <b>{openDefects.length}</b>
        </a>
        {field ? (
          <div className="kpi">
            <span>Regie offen</span>
            <b>{toSign.length}</b>
          </div>
        ) : (
          <Link href="/planung" className="kpi">
            <span>Heute eingeteilt</span>
            <b>
              {planned}
              <small> / {people.length}</small>
            </b>
          </Link>
        )}
      </div>

      <div className="cols dash-cols">
        <div className="col-main">
          {field && <MyDay />}
          <MyArea />
          <section className="panel">
            <header className="panel-head">
              <h2>
                <ListChecks size={16} /> Meine Aufgaben
              </h2>
              <Seg<Filter>
                value={filter}
                onChange={setFilter}
                options={[
                  { value: "alle", label: <>Alle <small>{rows.length}</small></> },
                  { value: "spaet", label: <>Überfällig <small>{late.length}</small></> },
                  { value: "woche", label: <>7 Tage <small>{week.length}</small></> }
                ]}
              />
            </header>
            {shown.length === 0 ? (
              <p className="panel-empty">{rows.length ? "Nichts in diesem Filter." : "Dir ist gerade nichts zugewiesen."}</p>
            ) : (
              <table className="table">
                <tbody>
                  {shown.map((x) => (
                    <tr key={x.key}>
                      <td className="w-check">{x.tick ? <input type="checkbox" className="check" aria-label={`${x.title} erledigt`} onChange={x.tick} /> : <AlertTriangle size={15} className="warn-ic" />}</td>
                      <td>
                        <Link href={x.href} className="strong">
                          {x.title}
                        </Link>
                        <small className="sub">{[x.kind, x.sub].filter(Boolean).join(" · ")}</small>
                      </td>
                      <td className="hide-sm">
                        <Link href={`/projekte/${x.project.id}`} className="proj-link">
                          <i style={{ background: x.project.color }} />
                          <span>{x.project.name}</span>
                        </Link>
                      </td>
                      <td className={`num nowrap ${x.due && x.due < t ? "bad" : ""}`}>{x.due ? (x.due === t ? "heute" : fmtShort(x.due)) : "–"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="panel" id="maengel">
            <header className="panel-head">
              <h2>
                <AlertTriangle size={16} /> Offene Mängel
              </h2>
              <span className="muted">{openDefects.length} in deinen Projekten</span>
            </header>
            {openDefects.length === 0 ? (
              <p className="panel-empty">Keine offenen Mängel.</p>
            ) : (
              <table className="table">
                <tbody>
                  {openDefects.slice(0, 8).map((d) => (
                    <tr key={d.id}>
                      <td className="w-no mono muted">{defectNo(d.no)}</td>
                      <td>
                        <Link href={`/projekte/${d.projectId}/maengel?mangel=${d.id}`} className="strong">
                          {d.title}
                        </Link>
                        <small className="sub">{[byId.get(d.projectId)?.name, d.location].filter(Boolean).join(" · ")}</small>
                      </td>
                      <td className="hide-sm">
                        <Tag tone={PRIORITY[d.priority].tone}>{PRIORITY[d.priority].label}</Tag>
                      </td>
                      <td className="hide-md muted">{personName(data, d.ownerId) || "–"}</td>
                      <td className={`num nowrap ${d.due && d.due < t ? "bad" : ""}`}>{d.due ? fmtShort(d.due) : "–"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </div>

        <aside className="col-side">
          <section className="panel">
            <header className="panel-head">
              <h2>
                <StickyNote size={16} /> Notizen
              </h2>
              <span className="muted">Klick daneben speichert</span>
            </header>
            <div className="panel-body">
              <StickyBoard notes={notes} projectId="" showProject empty="Ersten Notizzettel schreiben – z. B. „Kran für Donnerstag bestellen“" />
            </div>
          </section>

          {(toSign.length > 0 || toRelease.length > 0) && (
            <section className="panel">
              <header className="panel-head">
                <h2>
                  <PenLine size={16} /> Regiescheine
                </h2>
              </header>
              <ul className="side-list">
                {[...toRelease, ...toSign].slice(0, 6).map((r) => (
                  <li key={r.id}>
                    <Link href={`/projekte/${r.projectId}/regie?regie=${r.id}`}>
                      <span>
                        <strong>
                          Nr. {String(r.no).padStart(2, "0")} · {byId.get(r.projectId)?.name}
                        </strong>
                        <small>{r.description.split("\n")[0]}</small>
                      </span>
                      <Tag tone={r.signature ? "green" : "amber"}>{r.signature ? "freigeben" : "unterschreiben"}</Tag>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

/** Leaders: one line per person directly below – with the numbers of their whole branch. */
function MyArea() {
  const { data } = useStore();
  const lv = levelView(data);
  if (!lv || !lv.direct.length) return null;
  const t = today();
  const rows = lv.direct
    .map((id) => data.people.find((e) => e.id === id && e.active))
    .filter((e): e is NonNullable<typeof e> => !!e)
    .sort(byRole)
    .map((e) => {
      const ids = [...subtree(data, e.id)].filter((id) => data.people.some((x) => x.id === id && x.active));
      const set = new Set(ids);
      const planned = ids.filter((id) => plannedOn(data, id, t)).length;
      const away = data.absences.filter((a) => set.has(a.employeeId) && a.start <= t && a.end >= t).length;
      const open = data.defects.filter((d) => d.status !== "done" && set.has(d.ownerId));
      const late = open.filter((d) => d.due && d.due < t).length;
      return { e, size: ids.length, planned, away, defects: open.length, late };
    });
  return (
    <section className="panel">
      <header className="panel-head">
        <h2>
          <Network size={16} /> Mein Bereich
        </h2>
        <Link href="/planung" className="link">
          Planung <ChevronRight size={14} />
        </Link>
      </header>
      <table className="table">
        <thead>
          <tr>
            <th>Direkt unter mir</th>
            <th className="num">Leute</th>
            <th>Heute eingeteilt</th>
            <th className="num">Abwesend</th>
            <th className="num">Offene Mängel</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.e.id}>
              <td>
                <strong>{r.e.name}</strong>
                <small className="sub">{ROLLE_LABEL[r.e.rolle]}</small>
              </td>
              <td className="num">{r.size}</td>
              <td className="nowrap">
                <span className="load-cell">
                  <i style={{ width: `${(r.planned / Math.max(1, r.size - r.away)) * 100}%` }} />
                </span>
                {r.planned} / {r.size - r.away}
              </td>
              <td className={`num ${r.away ? "warn" : "muted"}`}>{r.away || "–"}</td>
              <td className={`num ${r.late ? "bad" : ""}`}>
                {r.defects || "–"}
                {r.late > 0 && <small className="sub bad">{r.late} überfällig</small>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

/** Workers: my project today with the three things I do there, and the next days. */
function MyDay() {
  const { data } = useStore();
  const t = today();
  const user = me(data);
  if (!user) return null;
  const d = dayText(data, user.id, t);
  const halves = d.split ? [{ s: d.am, part: "Vormittag" }, { s: d.pm, part: "Nachmittag" }] : [{ s: d.am, part: "" }];
  const boxes: { project: Project; lines: string[] }[] = [];
  for (const { s, part } of halves) {
    if (s.kind !== "job" || !s.project) continue;
    const line = [part, s.job.title].filter(Boolean).join(": ");
    const box = boxes.find((b) => b.project.id === s.project!.id);
    if (box) {
      if (line) box.lines.push(line);
    } else boxes.push({ project: s.project, lines: line ? [line] : [] });
  }
  const other = halves.some(({ s }) => s.kind === "absence" || s.kind === "holiday");
  const week: string[] = [];
  for (let day = addDays(t, 1); week.length < 4; day = addDays(day, 1)) if (!isWeekend(day)) week.push(day);

  return (
    <section className="panel myday">
      <header className="panel-head">
        <h2>Mein Tag</h2>
      </header>
      <div className="panel-body">
        {boxes.length === 0 && <p className="myday-text">{other ? d.text : "Für heute ist nichts eingeteilt."}</p>}
        {boxes.map(({ project: p, lines }) => (
          <div key={p.id} className="myday-site">
            <Link href={`/projekte/${p.id}`} className="myday-name">
              <i style={{ background: p.color }} />
              {p.name}
              <ChevronRight size={16} />
            </Link>
            {lines.length > 0 && (
              <ul className="myday-lines">
                {lines.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            )}
            <div className="myday-quick">
              <Link href={`/projekte/${p.id}/fotos`} className="b-btn default md">
                <Camera size={16} /> Foto
              </Link>
              <Link href={`/projekte/${p.id}/maengel?neu=1`} className="b-btn default md">
                <AlertTriangle size={16} /> Mangel
              </Link>
              <Link href={`/projekte/${p.id}/regie?neu=1`} className="b-btn primary md">
                <PenLine size={16} /> Regie
              </Link>
            </div>
          </div>
        ))}
        <ul className="myday-week">
          {week.map((day) => (
            <li key={day}>
              <span>{weekdayShort(day)}</span>
              {dayText(data, user.id, day).text}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
