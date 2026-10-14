"use client";

import { AlertTriangle, Archive, RotateCcw, Building2, CheckCircle2, ClipboardList, History, ImagePlus, Trash2, TrendingUp, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import { useRef, useState, type CSSProperties } from "react";
import { fmt, fmtShort, today } from "@/lib/date";
import * as L from "@/lib/labels";
import { projectStats } from "@/lib/overview";
import { shortPath } from "@/lib/site";
import { employeeName, fmtStamp, isManager, projectTeam, useStore } from "@/lib/store";
import type { Project } from "@/lib/types";
import { Panel } from "./dashboard";
import { InviteDialog } from "./invite";
import { EmpAvatar } from "./person";
import { downscale } from "./ui";

/** Project start page: client, team and a rough picture of what is going on at the site right now. */
export function ProjectOverview({ project }: { project: Project }) {
  const { data, save, notify } = useStore();
  const manager = isManager(data);
  const [invite, setInvite] = useState(false);
  const [allLog, setAllLog] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const t = today();
  const s = projectStats(data, project);
  const team = projectTeam(data, project);
  const base = `/projekte/${project.id}`;

  const setClientImage = async (file: File | undefined) => {
    if (!file) return;
    save("projects", { ...project, clientImage: await downscale(file, 800) }, `Kundenbild für ${project.name}`);
    notify("Bild gespeichert");
  };

  return (
    <div className="ov">
      <section className="card ov-client">
        <div className={`ov-client-img ${project.clientImage ? "has" : ""}`}>
          {project.clientImage ? <img src={project.clientImage} alt={project.client || "Kunde"} /> : <Building2 size={34} />}
          {manager && (
            <span className="ov-img-actions">
              <button type="button" className="btn btn-sm" onClick={() => input.current?.click()}>
                <ImagePlus size={14} /> {project.clientImage ? "Ändern" : "Bild vom Kunden"}
              </button>
              {project.clientImage && (
                <button type="button" className="icon-btn" title="Bild entfernen" onClick={() => save("projects", { ...project, clientImage: undefined })}>
                  <Trash2 size={14} />
                </button>
              )}
            </span>
          )}
          <input
            ref={input}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              setClientImage(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
        <dl className="ov-facts">
          <div>
            <dt>Kunde</dt>
            <dd>{project.client || "–"}</dd>
          </div>
          <div>
            <dt>Ort</dt>
            <dd>{project.location || "–"}</dd>
          </div>
          <div>
            <dt>Projektleitung</dt>
            <dd>{project.managerId ? employeeName(data, project.managerId) : "–"}</dd>
          </div>
          <div>
            <dt>Bauleitung</dt>
            <dd>{project.siteManagerId ? employeeName(data, project.siteManagerId) : "–"}</dd>
          </div>
          <div>
            <dt>Zeitraum</dt>
            <dd>
              {project.start ? fmt(project.start) : "–"} – {project.end ? fmt(project.end) : "–"}
              {s.daysLeft !== null && <small className={s.daysLeft < 0 ? "text-red" : "muted"}> · {s.daysLeft < 0 ? `${-s.daysLeft} Tage drüber` : `noch ${s.daysLeft} Tage`}</small>}
            </dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>
              <span className={`badge badge-${L.projectStatus[project.status].tone}`}>{L.projectStatus[project.status].label}</span>
            </dd>
          </div>
        </dl>
        {project.description && <p className="ov-desc">{project.description}</p>}
        {manager && (
          <div className="ov-actions">
            {project.status === "abgeschlossen" ? (
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
            )}
          </div>
        )}
      </section>

      <section className="card ov-progress">
        <header className="card-header">
          <h2>
            <TrendingUp size={16} /> Fortschritt
          </h2>
          <strong className="ov-big">{s.progress} %</strong>
        </header>
        <div className="ov-nums">
          <Link href={`${base}/struktur`}>
            <b>{s.openPoints.length}</b>
            <small>Punkte offen</small>
          </Link>
          <Link href={`${base}/struktur`}>
            <b>{s.inWork.length}</b>
            <small>in Arbeit</small>
          </Link>
          <Link href={`${base}/maengel`} className={s.criticalIssues.length ? "red" : ""}>
            <b>{s.openIssues.length}</b>
            <small>Mängel offen</small>
          </Link>
          <Link href={`${base}/material`}>
            <b>{s.materialOrdered.length}</b>
            <small>Material bestellt</small>
          </Link>
        </div>
        {s.areas.length ? (
          <ul className="ov-areas">
            {s.areas.slice(0, 8).map(({ node, progress }) => (
              <li key={node.id}>
                <span>{node.title}</span>
                <span className="dp-bar" style={{ "--c": project.color } as CSSProperties}>
                  <i style={{ width: `${progress}%` }} />
                </span>
                <b>{progress} %</b>
              </li>
            ))}
          </ul>
        ) : (
          <p className="dl-empty">
            Noch keine Bereiche. <Link href={`${base}/struktur`}>Struktur anlegen</Link>
          </p>
        )}
      </section>

      <Panel
        title="Team"
        icon={<Users size={16} />}
        empty="Noch niemand im Projekt."
        action={
          <button type="button" className="btn btn-sm" onClick={() => setInvite(true)}>
            <UserPlus size={14} /> {manager ? "Einladen" : "Alle"}
          </button>
        }
      >
        <div className="ov-team">
          {team.map((e) => (
            <span key={e.id} className="ov-member" title={e.role}>
              <EmpAvatar id={e.id} size={34} />
              <small>{e.name.split(" ")[0]}</small>
            </span>
          ))}
        </div>
      </Panel>

      <Panel
        title="In Arbeit & fällig"
        icon={<ClipboardList size={16} />}
        empty={<><CheckCircle2 size={15} /> Nichts in Arbeit oder fällig.</>}
        action={
          <Link href={`${base}/struktur`} className="link-btn">
            Struktur
          </Link>
        }
      >
        {[...s.overduePoints, ...s.inWork.filter((n) => !s.overduePoints.includes(n)), ...s.duePoints.filter((n) => n.status !== "in_arbeit")].slice(0, 8).map((n) => (
          <Link key={n.id} href={`${base}/struktur`} className="dl-item">
            <span className={`dl-date ${n.due && n.due < t ? "late" : n.status === "in_arbeit" ? "work" : ""}`}>{n.due && n.due < t ? "überfällig" : n.status === "in_arbeit" ? "in Arbeit" : fmtShort(n.due)}</span>
            <span>
              <strong>{n.title}</strong>
              <small>
                {shortPath(data.siteNodes, n.parentId || n.id)}
                {n.assigneeId ? ` · ${employeeName(data, n.assigneeId)}` : ""}
              </small>
            </span>
          </Link>
        ))}
      </Panel>

      <Panel
        title="Offene Mängel"
        icon={<AlertTriangle size={16} />}
        empty={<><CheckCircle2 size={15} /> Keine offenen Mängel.</>}
        action={
          <Link href={`${base}/maengel`} className="link-btn">
            Alle
          </Link>
        }
      >
        {s.openIssues.slice(0, 6).map((i) => (
          <Link key={i.id} href={`${base}/maengel`} className="dl-item">
            {i.photo ? <img className="dl-thumb" src={i.photo} alt="" /> : <span className={`dl-sev sev-${i.severity}`}>{L.severity[i.severity].label}</span>}
            <span>
              <strong>{i.title}</strong>
              <small>
                {L.severity[i.severity].label}
                {i.location ? ` · ${i.location}` : ""}
                {i.due ? ` · bis ${fmtShort(i.due)}` : ""}
              </small>
            </span>
          </Link>
        ))}
      </Panel>

      <details className="card dash-panel wide ov-log">
        <summary className="card-header">
          <h2>
            <History size={16} /> Protokoll
          </h2>
          <span className="muted small">Wer hat wann was gemacht · {s.activity.length} Einträge</span>
        </summary>
        {s.activity.length ? (
          <table className="log-table">
            <thead>
              <tr>
                <th>Zeitpunkt</th>
                <th>Wer</th>
                <th>Was</th>
              </tr>
            </thead>
            <tbody>
              {s.activity.slice(0, allLog ? 1000 : 15).map((a) => (
                <tr key={a.id}>
                  <td>{fmtStamp(a.at)}</td>
                  <td>{a.by ? employeeName(data, a.by) : "–"}</td>
                  <td>{a.text}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="dl-empty">Noch nichts passiert.</p>
        )}
        {!allLog && s.activity.length > 15 && (
          <button type="button" className="btn btn-sm log-more" onClick={() => setAllLog(true)}>
            Alle {s.activity.length} Einträge anzeigen
          </button>
        )}
      </details>

      {invite && <InviteDialog project={project} onClose={() => setInvite(false)} />}
    </div>
  );
}
