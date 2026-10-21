"use client";

import { AlertTriangle, Camera, ChevronRight, ListChecks, PenLine } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useEditor } from "@/components/shell";
import { addDays, fmt, isWeekend, today, weekdayLong, weekdayShort } from "@/lib/date";
import * as L from "@/lib/labels";
import { shortPath } from "@/lib/site";
import { employeeName, useStore } from "@/lib/store";
import type { Issue, Project, SiteNode } from "@/lib/types";
import { activePeople, canPlan, dayText, me, visibleSites } from "./access";
import { Face } from "./kit";

type Task =
  | { kind: "punkt"; id: string; title: string; due: string; site: Project; where: string; node: SiteNode }
  | { kind: "mangel"; id: string; title: string; due: string; site: Project; where: string; issue: Issue };

type Filter = "alle" | "ueberfaellig" | "woche";

/** Start page: my tasks first, then what needs attention – team and releases on the side. */
export function Today() {
  const { data, save, notify } = useStore();
  const openEditor = useEditor();
  const t = today();
  const user = me(data);
  const planner = canPlan(data);
  const sites = visibleSites(data);
  const byId = new Map(sites.map((p) => [p.id, p]));
  const [filter, setFilter] = useState<Filter>("alle");
  const weekEnd = addDays(t, 7);

  // my tasks: assigned points (leaves of the structure) and defects
  const tasks: Task[] = [
    ...data.siteNodes
      .filter((n) => n.assigneeId === user?.id && n.status !== "erledigt" && byId.has(n.projectId) && !data.siteNodes.some((k) => k.parentId === n.id))
      .map((n): Task => ({ kind: "punkt", id: n.id, title: n.title, due: n.due, site: byId.get(n.projectId)!, where: n.parentId ? shortPath(data.siteNodes, n.parentId) : "", node: n })),
    ...data.issues
      .filter((i) => i.assigneeId === user?.id && i.status !== "erledigt" && byId.has(i.projectId))
      .map((i): Task => ({ kind: "mangel", id: i.id, title: i.title, due: i.due, site: byId.get(i.projectId)!, where: i.location, issue: i }))
  ].sort((a, b) => (a.due || "9999").localeCompare(b.due || "9999") || a.title.localeCompare(b.title, "de"));
  const late = tasks.filter((x) => x.due && x.due < t);
  const week = tasks.filter((x) => x.due && x.due <= weekEnd);
  const shown = filter === "ueberfaellig" ? late : filter === "woche" ? week : tasks;

  const openIssues = data.issues
    .filter((i) => i.status !== "erledigt" && byId.has(i.projectId))
    .sort((a, b) => sevRank[a.severity] - sevRank[b.severity] || (a.due || "9").localeCompare(b.due || "9"));
  const regieOpen = data.regie.filter((r) => byId.has(r.projectId) && (!r.signature || !r.approvedAt));
  const toSign = regieOpen.filter((r) => !r.signature);
  const toRelease = regieOpen.filter((r) => r.signature && !r.approvedAt);
  const people = activePeople(data);
  const planned = people.filter((e) => {
    const d = dayText(data, e.id, t);
    return d.am.kind === "job" || d.pm.kind === "job";
  }).length;

  return (
    <div className="v-page">
      <header className="v-head">
        <div>
          <h1>Heute</h1>
          <p>
            {weekdayLong(t)}, {fmt(t)} · {user?.name}
          </p>
        </div>
      </header>

      <div className="v-stats">
        <button type="button" className={filter === "alle" ? "on" : ""} onClick={() => setFilter("alle")}>
          <span>Meine Aufgaben</span>
          <b>{tasks.length}</b>
        </button>
        <button type="button" className={`${filter === "ueberfaellig" ? "on" : ""} ${late.length ? "bad" : ""}`} onClick={() => setFilter("ueberfaellig")}>
          <span>Überfällig</span>
          <b>{late.length}</b>
        </button>
        <Link href={sites[0] ? `/projekte/${sites[0].id}/maengel` : "/projekte"}>
          <span>Offene Mängel</span>
          <b>{openIssues.length}</b>
        </Link>
        {planner ? (
          <Link href="/planung">
            <span>Heute eingeteilt</span>
            <b>
              {planned}
              <small> / {people.length}</small>
            </b>
          </Link>
        ) : (
          <div>
            <span>Regie offen</span>
            <b>{toSign.length}</b>
          </div>
        )}
      </div>

      <div className={`v-today ${planner ? "" : "worker"}`}>
        <div className="v-today-main">
          <section className="v-panel">
            <header>
              <h2>
                <ListChecks size={16} /> Meine Aufgaben
              </h2>
              <div className="v-seg">
                {(
                  [
                    ["alle", `Alle ${tasks.length}`],
                    ["ueberfaellig", `Überfällig ${late.length}`],
                    ["woche", `7 Tage ${week.length}`]
                  ] as [Filter, string][]
                ).map(([k, l]) => (
                  <button key={k} type="button" className={filter === k ? "on" : ""} onClick={() => setFilter(k)}>
                    {l}
                  </button>
                ))}
              </div>
            </header>
            {shown.length === 0 ? (
              <p className="v-panel-empty">{tasks.length ? "Nichts in diesem Filter." : "Dir ist gerade nichts zugewiesen."}</p>
            ) : (
              <table className="v-table">
                <thead>
                  <tr>
                    <th className="w-check" />
                    <th>Aufgabe</th>
                    <th>Baustelle</th>
                    <th className="w-due">Fällig</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((x) => {
                    const overdue = !!x.due && x.due < t;
                    return (
                      <tr key={`${x.kind}-${x.id}`}>
                        <td className="w-check">
                          {x.kind === "punkt" ? (
                            <input
                              type="checkbox"
                              className="v-check"
                              aria-label={`${x.title} erledigt`}
                              onChange={() => {
                                save("siteNodes", { ...x.node, status: "erledigt" }, `„${x.title}“ erledigt`);
                                notify("Erledigt ✓");
                              }}
                            />
                          ) : (
                            <AlertTriangle size={16} className="v-warn-ic" />
                          )}
                        </td>
                        <td>
                          {x.kind === "punkt" ? (
                            <Link href={`/projekte/${x.site.id}/struktur?punkt=${x.id}`} className="v-cell-main">
                              <strong>{x.title}</strong>
                              {x.where && <small>{x.where}</small>}
                            </Link>
                          ) : (
                            <button type="button" className="v-cell-main" onClick={() => openEditor({ kind: "issue", item: x.issue })}>
                              <strong>
                                <em className={`v-sev s-${x.issue.severity}`}>{L.severity[x.issue.severity].label}</em> {x.title}
                              </strong>
                              <small>Mangel{x.where ? ` · ${x.where}` : ""}</small>
                            </button>
                          )}
                        </td>
                        <td className="v-muted">
                          <Link href={`/projekte/${x.site.id}`}>{x.site.name}</Link>
                        </td>
                        <td className={`w-due ${overdue ? "late" : ""}`}>{x.due ? fmt(x.due).slice(0, 6) : "–"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>

          {planner && (
            <section className="v-panel">
              <header>
                <h2>
                  <AlertTriangle size={16} /> Offene Mängel
                </h2>
                <span className="v-muted">{openIssues.length} auf allen Baustellen</span>
              </header>
              {openIssues.length === 0 ? (
                <p className="v-panel-empty">Keine offenen Mängel.</p>
              ) : (
                <table className="v-table">
                  <thead>
                    <tr>
                      <th>Mangel</th>
                      <th>Baustelle</th>
                      <th>Zuständig</th>
                      <th className="w-due">Frist</th>
                    </tr>
                  </thead>
                  <tbody>
                    {openIssues.slice(0, 8).map((i) => (
                      <tr key={i.id}>
                        <td>
                          <button type="button" className="v-cell-main" onClick={() => openEditor({ kind: "issue", item: i })}>
                            <strong>
                              <em className={`v-sev s-${i.severity}`}>{L.severity[i.severity].label}</em> {i.title}
                            </strong>
                          </button>
                        </td>
                        <td className="v-muted">
                          <Link href={`/projekte/${i.projectId}/maengel`}>{byId.get(i.projectId)?.name}</Link>
                        </td>
                        <td className="v-muted">{i.assigneeId ? employeeName(data, i.assigneeId) : "–"}</td>
                        <td className={`w-due ${i.due && i.due < t ? "late" : ""}`}>{i.due ? fmt(i.due).slice(0, 6) : "–"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          )}
        </div>

        <aside className="v-today-side">
          {planner ? <TeamToday /> : <MyDay />}

          {planner && (toSign.length > 0 || toRelease.length > 0) && (
            <section className="v-panel">
              <header>
                <h2>
                  <PenLine size={16} /> Regiescheine
                </h2>
              </header>
              <ul className="v-rows">
                {[...toRelease, ...toSign].slice(0, 6).map((r) => (
                  <li key={r.id}>
                    <Link href={`/projekte/${r.projectId}/regie`} className="v-row-link">
                      <span>
                        <strong>
                          Nr. {String(r.no).padStart(2, "0")} · {byId.get(r.projectId)?.name}
                        </strong>
                        <small>{r.description.split("\n")[0]}</small>
                      </span>
                      <em className={r.signature ? "tag-ok" : "tag-warn"}>{r.signature ? "freigeben" : "unterschreiben"}</em>
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

const sevRank: Record<string, number> = { kritisch: 0, hoch: 1, mittel: 2, niedrig: 3 };

/** Office and leaders: every person, one line. */
function TeamToday() {
  const { data } = useStore();
  const t = today();
  const rows = activePeople(data).map((e) => ({ e, d: dayText(data, e.id, t) }));
  const weekend = isWeekend(t);
  return (
    <section className="v-panel">
      <header>
        <h2>Team heute</h2>
        <Link href="/planung" className="v-link">
          Planung <ChevronRight size={15} />
        </Link>
      </header>
      <ul className="v-rows">
        {rows.map(({ e, d }) => {
          const free = d.am.kind === "free" && d.pm.kind === "free";
          const away = d.am.kind === "absence";
          return (
            <li key={e.id} className="v-person">
              <Face id={e.id} size={26} />
              <span>
                <strong>{e.name}</strong>
                <small className={free ? "is-free" : away ? "is-away" : ""}>{weekend ? "Wochenende" : d.text}</small>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Workers: my site today with the three things I do there, and my week. */
function MyDay() {
  const { data } = useStore();
  const openEditor = useEditor();
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
    if (box) box.lines.push(line);
    else boxes.push({ project: s.project, lines: line ? [line] : [] });
  }
  const other = halves.find(({ s }) => s.kind === "absence" || s.kind === "holiday");
  const week: string[] = [];
  for (let day = addDays(t, 1); week.length < 4; day = addDays(day, 1)) if (!isWeekend(day)) week.push(day);

  return (
    <>
      <section className="v-panel v-myday">
        <header>
          <h2>Mein Tag</h2>
        </header>
        <div className="v-panel-body">
          {boxes.length === 0 && <p className="v-myday-text">{other ? d.text : "Für heute ist nichts eingeteilt."}</p>}
          {boxes.map(({ project: p, lines }) => (
            <div key={p.id} className="v-myday-site">
              <Link href={`/projekte/${p.id}`} className="v-myday-name">
                <i style={{ background: p.color }} />
                {p.name}
                <ChevronRight size={16} />
              </Link>
              {lines.length > 0 && (
                <ul className="v-myday-lines">
                  {lines.map((l) => (
                    <li key={l}>{l}</li>
                  ))}
                </ul>
              )}
              <div className="v-quick">
                <Link href={`/projekte/${p.id}/fotos`} className="v-btn">
                  <Camera size={17} /> Foto
                </Link>
                <button type="button" className="v-btn" onClick={() => openEditor({ kind: "issue", item: { projectId: p.id } })}>
                  <AlertTriangle size={17} /> Mangel
                </button>
                <Link href={`/projekte/${p.id}/regie?neu=1`} className="v-btn primary">
                  <PenLine size={17} /> Regie
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="v-panel">
        <header>
          <h2>Die nächsten Tage</h2>
        </header>
        <ul className="v-rows">
          {week.map((day) => (
            <li key={day} className="v-person">
              <span className="v-day">{weekdayShort(day)}</span>
              <span>
                <small>{dayText(data, user.id, day).text}</small>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
