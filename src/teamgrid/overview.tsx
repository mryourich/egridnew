"use client";

import { Pencil, Pin } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { addDays, diffDays, today } from "@/core/date";
import { defectNo, fmtDate, fmtShort, fmtWhen, PRIORITY, PROJECT_STATUS } from "@/core/format";
import { ROLLE_LABEL } from "@/core/roles";
import { personName, useStore } from "@/core/store";
import type { Project } from "@/core/types";
import { Avatar, Bar, Button, PageHead, People, Tag } from "@/core/ui";
import { access, childrenOf, pathLabel, projectFacts, tasksUnder } from "./model";
import { ProjectForm } from "./projects";

/** Project cockpit: where it stands, what is due, who works on it. */
export function Overview({ project: p }: { project: Project }) {
  const { data } = useStore();
  const [editing, setEditing] = useState(false);
  const f = projectFacts(data, p);
  const { manage } = access(data, p);
  const t = today();
  const week = addDays(t, 7);
  const base = `/projekte/${p.id}`;
  const daysLeft = p.due ? diffDays(t, p.due) : null;
  const areas = childrenOf(f.points, "");

  const due = [
    ...f.open.filter((x) => x.due && x.due <= week).map((x) => ({ key: x.id, kind: "Punkt", title: x.title, sub: pathLabel(f.points, x.parentId), due: x.due, who: x.assigneeIds, href: `${base}/punkte?punkt=${x.id}` })),
    ...f.openDefects.filter((x) => x.due && x.due <= week).map((x) => ({ key: x.id, kind: defectNo(x.no), title: x.title, sub: x.location, due: x.due, who: x.ownerId ? [x.ownerId] : [], href: `${base}/maengel?mangel=${x.id}` })),
    ...f.todos.filter((x) => !x.done && x.due && x.due <= week).map((x) => ({ key: x.id, kind: "Aufgabe", title: x.title, sub: "", due: x.due, who: x.ownerId ? [x.ownerId] : [], href: `${base}/aufgaben` }))
  ].sort((a, b) => a.due.localeCompare(b.due));

  const activity = data.activity.filter((a) => a.projectId === p.id).slice(0, 8);
  const pinned = data.notes.filter((n) => n.projectId === p.id && n.pinned);

  return (
    <div className="page">
      <PageHead
        kicker={[p.number, PROJECT_STATUS[p.status].label].filter(Boolean).join(" · ")}
        title={p.name}
        sub={[p.client, p.location, p.managerId && `Projektleitung ${personName(data, p.managerId)}`].filter(Boolean).join(" · ")}
      >
        <Link href={`${base}/berichte`} className="b-btn default md">
          Bericht erstellen
        </Link>
        {manage && (
          <Button icon={<Pencil size={15} />} onClick={() => setEditing(true)}>
            Bearbeiten
          </Button>
        )}
      </PageHead>

      <div className="kpis">
        <div className="kpi">
          <span>Fortschritt</span>
          <b>{f.progress} %</b>
          <Bar value={f.progress} />
        </div>
        <Link href={`${base}/punkte`} className="kpi">
          <span>Offene Punkte</span>
          <b>{f.open.length}</b>
          <small className={f.late.length ? "bad" : ""}>{f.late.length ? `${f.late.length} überfällig` : `von ${f.tasks.length} gesamt`}</small>
        </Link>
        <Link href={`${base}/maengel`} className="kpi">
          <span>Offene Mängel</span>
          <b className={f.urgent.length ? "bad" : ""}>{f.openDefects.length}</b>
          <small className={f.urgent.length ? "bad" : ""}>{f.urgent.length ? `${f.urgent.length} mit Priorität hoch` : `${f.defects.length - f.openDefects.length} behoben`}</small>
        </Link>
        <Link href={`${base}/aufgaben`} className="kpi">
          <span>Aufgaben</span>
          <b>{f.todos.filter((x) => !x.done).length}</b>
          <small>{f.todos.filter((x) => x.done).length} erledigt</small>
        </Link>
        <div className="kpi">
          <span>Fertig bis</span>
          <b className={f.overdue ? "bad" : ""}>{fmtDate(p.due) || "–"}</b>
          <small className={f.overdue ? "bad" : ""}>{daysLeft == null ? "kein Termin" : daysLeft < 0 ? `${-daysLeft} Tage überfällig` : daysLeft === 0 ? "heute" : `noch ${daysLeft} Tage`}</small>
        </div>
      </div>

      <div className="cols">
        <div className="col-main">
          <section className="panel">
            <header className="panel-head">
              <h2>Fortschritt nach Bereichen</h2>
              <Link href={`${base}/punkte`} className="link">
                Offene Punkte öffnen
              </Link>
            </header>
            {areas.length === 0 ? (
              <p className="panel-empty">Noch keine Bereiche. {manage && <Link href={`${base}/punkte`}>Struktur anlegen</Link>}</p>
            ) : (
              <table className="table">
                <tbody>
                  {areas.map((a) => {
                    const list = tasksUnder(f.points, a.id);
                    const done = list.filter((x) => x.status === "done").length;
                    const pct = list.length ? Math.round((done / list.length) * 100) : 0;
                    return (
                      <tr key={a.id}>
                        <td>
                          <Link href={`${base}/punkte?bereich=${a.id}`} className="strong">
                            {a.title}
                          </Link>
                        </td>
                        <td className="w-progress">
                          <span className="progress-cell">
                            <Bar value={pct} />
                            <b>{pct} %</b>
                          </span>
                        </td>
                        <td className="num muted">
                          {done} / {list.length}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>

          <section className="panel">
            <header className="panel-head">
              <h2>Fällig in den nächsten 7 Tagen</h2>
              <span className="muted">{due.length}</span>
            </header>
            {due.length === 0 ? (
              <p className="panel-empty">Nichts fällig – gut so.</p>
            ) : (
              <table className="table">
                <tbody>
                  {due.map((x) => (
                    <tr key={x.key}>
                      <td className="w-kind">
                        <span className="muted">{x.kind}</span>
                      </td>
                      <td>
                        <Link href={x.href} className="strong">
                          {x.title}
                        </Link>
                        {x.sub && <small className="sub">{x.sub}</small>}
                      </td>
                      <td className="hide-sm">
                        <People ids={x.who} max={2} />
                      </td>
                      <td className={`num ${x.due < t ? "bad" : x.due === t ? "warn" : ""}`}>{x.due === t ? "heute" : fmtShort(x.due)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {f.urgent.length > 0 && (
            <section className="panel">
              <header className="panel-head">
                <h2>Dringende Mängel</h2>
              </header>
              <table className="table">
                <tbody>
                  {f.urgent.map((d) => (
                    <tr key={d.id}>
                      <td className="w-kind">
                        <Tag tone={PRIORITY[d.priority].tone}>{defectNo(d.no)}</Tag>
                      </td>
                      <td>
                        <Link href={`${base}/maengel?mangel=${d.id}`} className="strong">
                          {d.title}
                        </Link>
                        {d.location && <small className="sub">{d.location}</small>}
                      </td>
                      <td className="hide-sm">
                        <People ids={d.ownerId ? [d.ownerId] : []} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </div>

        <aside className="col-side">
          <section className="panel">
            <header className="panel-head">
              <h2>Projektteam</h2>
              {manage && (
                <Link href={`${base}/einstellungen`} className="link">
                  Einladen
                </Link>
              )}
            </header>
            <ul className="list">
              {f.team.map((id) => {
                const person = data.people.find((x) => x.id === id);
                if (!person) return null;
                return (
                  <li key={id}>
                    <Avatar id={id} size={28} />
                    <span>
                      <strong>{person.name}</strong>
                      <small>{id === p.managerId ? "Projektleitung" : person.title || ROLLE_LABEL[person.rolle]}</small>
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>

          {pinned.length > 0 && (
            <section className="panel">
              <header className="panel-head">
                <h2>
                  <Pin size={14} /> Angeheftet
                </h2>
              </header>
              {pinned.map((n) => (
                <p key={n.id} className="pinned">
                  {n.text}
                  <small>
                    {personName(data, n.createdBy)} · {fmtWhen(n.createdAt)}
                  </small>
                </p>
              ))}
            </section>
          )}

          <section className="panel">
            <header className="panel-head">
              <h2>Letzte Aktivität</h2>
            </header>
            {activity.length === 0 ? (
              <p className="panel-empty">Noch nichts passiert.</p>
            ) : (
              <ul className="feed">
                {activity.map((a) => (
                  <li key={a.id}>
                    <Avatar id={a.by} size={22} />
                    <span>
                      <b>{personName(data, a.by) || "Jemand"}</b> {a.text}
                      <small>{fmtWhen(a.at)}</small>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>

      {editing && <ProjectForm project={p} onClose={() => setEditing(false)} />}
    </div>
  );
}
