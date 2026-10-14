"use client";

import { Archive, RotateCcw, UserPlus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { fmt, fmtShort, today } from "@/lib/date";
import * as L from "@/lib/labels";
import { projectStats } from "@/lib/overview";
import { shortPath } from "@/lib/site";
import { employeeName, fmtStamp, isManager, projectTeam, useStore } from "@/lib/store";
import type { Project } from "@/lib/types";
import { InviteDialog } from "./invite";
import { EmpAvatar } from "./person";

/** Project start page: what is next, what is broken, who is on it, what happened. */
export function ProjectOverview({ project }: { project: Project }) {
  const { data, save, notify } = useStore();
  const manager = isManager(data);
  const [invite, setInvite] = useState(false);
  const [allLog, setAllLog] = useState(false);
  const t = today();
  const s = projectStats(data, project);
  const team = projectTeam(data, project);
  const base = `/projekte/${project.id}`;
  const next = [...s.overduePoints, ...s.inWork.filter((n) => !s.overduePoints.includes(n)), ...s.duePoints.filter((n) => n.status !== "in_arbeit" && !s.overduePoints.includes(n))].slice(0, 6);

  return (
    <div className="ov2">
      <div className="ov2-main">
        <section className="box">
          <h2>
            Als Nächstes
            <Link href={`${base}/struktur`} className="box-link">
              Struktur
            </Link>
          </h2>
          {next.length === 0 ? (
            <p className="box-empty">Nichts in Arbeit oder fällig.</p>
          ) : (
            <ul className="rows">
              {next.map((n) => {
                const late = !!n.due && n.due < t;
                return (
                  <li key={n.id}>
                    <Link href={`${base}/struktur?punkt=${n.id}`} className="prow">
                      <span className="row-main">
                        <strong>{n.title}</strong>
                        <small>
                          {shortPath(data.siteNodes, n.parentId || n.id)}
                          {n.assigneeId ? ` · ${employeeName(data, n.assigneeId)}` : ""}
                        </small>
                      </span>
                      <span className={`when ${late ? "late" : ""}`}>{late ? "überfällig" : n.status === "in_arbeit" ? "in Arbeit" : fmtShort(n.due)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="box">
          <h2>
            Offene Mängel
            <Link href={`${base}/maengel`} className="box-link">
              Alle {s.openIssues.length || ""}
            </Link>
          </h2>
          {s.openIssues.length === 0 ? (
            <p className="box-empty">Keine offenen Mängel.</p>
          ) : (
            <ul className="rows">
              {s.openIssues.slice(0, 5).map((i) => (
                <li key={i.id}>
                  <Link href={`${base}/maengel`} className="prow">
                    <span className={`sev-dot sev-${i.severity}`} title={L.severity[i.severity].label} />
                    <span className="row-main">
                      <strong>{i.title}</strong>
                      <small>
                        {L.severity[i.severity].label}
                        {i.location ? ` · ${i.location}` : ""}
                        {i.assigneeId ? ` · ${employeeName(data, i.assigneeId)}` : ""}
                      </small>
                    </span>
                    {i.due && <span className={`when ${i.due < t ? "late" : ""}`}>{fmtShort(i.due)}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="box ov-log">
          <h2>Verlauf</h2>
          {s.activity.length === 0 ? (
            <p className="box-empty">Noch nichts passiert.</p>
          ) : (
            <ul className="feed">
              {s.activity.slice(0, allLog ? 1000 : 8).map((a) => (
                <li key={a.id}>
                  <span>{a.text}</span>
                  <small>
                    {a.by ? `${employeeName(data, a.by)} · ` : ""}
                    {fmtStamp(a.at)}
                  </small>
                </li>
              ))}
            </ul>
          )}
          {!allLog && s.activity.length > 8 && (
            <button type="button" className="link-btn log-more" onClick={() => setAllLog(true)}>
              Alle {s.activity.length} Einträge anzeigen
            </button>
          )}
        </section>
      </div>

      <aside className="ov2-side">
        <section className="box">
          <h2>Projekt</h2>
          <dl className="facts">
            <dt>Kunde</dt>
            <dd>{project.client || "–"}</dd>
            <dt>Ort</dt>
            <dd>{project.location || "–"}</dd>
            <dt>Projektleitung</dt>
            <dd>{project.managerId ? employeeName(data, project.managerId) : "–"}</dd>
            <dt>Bauleitung</dt>
            <dd>{project.siteManagerId ? employeeName(data, project.siteManagerId) : "–"}</dd>
            <dt>Zeitraum</dt>
            <dd>
              {project.start ? fmt(project.start) : "–"} – {project.end ? fmt(project.end) : "–"}
              {s.daysLeft !== null && <small className={s.daysLeft < 0 ? "text-red" : "muted"}>{s.daysLeft < 0 ? `${-s.daysLeft} Tage drüber` : `noch ${s.daysLeft} Tage`}</small>}
            </dd>
            <dt>Status</dt>
            <dd>{L.projectStatus[project.status].label}</dd>
          </dl>
          {project.description && <p className="ov-desc">{project.description}</p>}
          {manager &&
            (project.status === "abgeschlossen" ? (
              <button type="button" className="btn btn-sm" onClick={() => save("projects", { ...project, status: "aktiv" }, `${project.name} wieder geöffnet`)}>
                <RotateCcw size={14} /> Wieder öffnen
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => {
                  if (!window.confirm(`„${project.name}“ abschließen? Es verschwindet aus „Meine Projekte“ und bleibt unter Projekte › Abgeschlossene.`)) return;
                  save("projects", { ...project, status: "abgeschlossen" }, `${project.name} abgeschlossen`);
                  notify("Projekt abgeschlossen");
                }}
              >
                <Archive size={14} /> Projekt abschließen
              </button>
            ))}
        </section>

        <section className="box ov-team-box">
          <h2>
            Team <span className="count">{team.length}</span>
            <button type="button" className="box-link" onClick={() => setInvite(true)}>
              <UserPlus size={14} /> {manager ? "Einladen" : "Alle"}
            </button>
          </h2>
          {team.length === 0 ? (
            <p className="box-empty">Noch niemand im Projekt.</p>
          ) : (
            <ul className="team-list">
              {team.map((e) => (
                <li key={e.id}>
                  <EmpAvatar id={e.id} size={28} />
                  <span>
                    <strong>{e.name}</strong>
                    <small>{e.role}</small>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </aside>

      {invite && <InviteDialog project={project} onClose={() => setInvite(false)} />}
    </div>
  );
}
