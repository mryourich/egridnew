"use client";

import { AlertTriangle, Building2, Camera, CheckCircle2, ClipboardList, Hammer, ImagePlus, Package, Trash2, TrendingUp, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import { useRef, useState, type CSSProperties } from "react";
import { fmt, fmtShort, inRange, today } from "@/lib/date";
import * as L from "@/lib/labels";
import { ago, projectStats } from "@/lib/overview";
import { shortPath } from "@/lib/site";
import { employeeName, isManager, projectTeam, useStore } from "@/lib/store";
import type { Project } from "@/lib/types";
import { Panel, rowName } from "./dashboard";
import { InviteDialog } from "./invite";
import { EmpAvatar } from "./person";
import { downscale } from "./ui";

/** Project start page: client, team and a rough picture of what is going on at the site right now. */
export function ProjectOverview({ project }: { project: Project }) {
  const { data, save, notify } = useStore();
  const manager = isManager(data);
  const [invite, setInvite] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const t = today();
  const s = projectStats(data, project);
  const team = projectTeam(data, project);
  const base = `/projekte/${project.id}`;
  const absent = team.flatMap((e) => data.absences.filter((a) => a.employeeId === e.id && inRange(t, a.start, a.end)).map((a) => ({ e, a })));

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
        title="Heute auf der Baustelle"
        icon={<Hammer size={16} />}
        empty={manager ? <>Für heute nichts eingeplant. <Link href={`${base}/plan`}>Zum Plan</Link></> : "Für heute nichts eingeplant."}
        action={
          <Link href={`${base}/plan`} className="link-btn">
            Plan
          </Link>
        }
      >
        {s.jobsToday.map((j) => (
          <div key={j.id} className="dl-item">
            {data.employees.some((e) => e.id === j.employeeId) ? <EmpAvatar id={j.employeeId} size={28} /> : <i className="dl-bar" style={{ background: j.color }} />}
            <span>
              <strong>{j.title || "Aufgabe"}</strong>
              <small>
                {rowName(data, project, j.employeeId)} · bis {fmtShort(j.end)}
              </small>
            </span>
            <i className="dl-swatch" style={{ background: j.color }} />
          </div>
        ))}
        {absent.map(({ e, a }) => (
          <div key={a.id} className="dl-item dl-absent">
            <EmpAvatar id={e.id} size={28} />
            <span>
              <strong>{e.name}</strong>
              <small className="text-red">
                {L.absenceType[a.type].label} bis {fmtShort(a.end)}
              </small>
            </span>
          </div>
        ))}
      </Panel>

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

      <Panel
        title="Neueste Fotos"
        icon={<Camera size={16} />}
        empty="Noch keine Fotos."
        action={
          <Link href={`${base}/fotos`} className="link-btn">
            Alle
          </Link>
        }
      >
        {s.photos.length ? (
          <div className="ov-photos">
            {s.photos.slice(0, 8).map((ph) => (
              <Link key={ph.id} href={`${base}/fotos`}>
                <img src={ph.dataUrl} alt={ph.caption} />
              </Link>
            ))}
          </div>
        ) : null}
      </Panel>

      <Panel
        title="Material"
        icon={<Package size={16} />}
        empty="Nichts offen oder bestellt."
        action={
          <Link href={`${base}/material`} className="link-btn">
            Alle
          </Link>
        }
      >
        {[...s.materialOrdered, ...s.materialOpen].slice(0, 6).map((m) => (
          <Link key={m.id} href={`${base}/material`} className="dl-item">
            <span className="dl-qty">
              {m.qty} {m.unit}
            </span>
            <span>
              <strong>{m.name}</strong>
              <small>{L.materialStatus[m.status].label}</small>
            </span>
          </Link>
        ))}
      </Panel>

      <Panel title="Letzter Tagesbericht & Aktivität" icon={<ClipboardList size={16} />} empty="Noch nichts passiert." wide>
        {s.lastReport && (
          <Link href={`${base}/berichte`} className="dl-item ov-report">
            <span className="dl-date">{fmtShort(s.lastReport.date)}</span>
            <span>
              <strong>Tagesbericht · {s.lastReport.crew} Personen · {s.lastReport.hours} Std.</strong>
              <small>{s.lastReport.work || "–"}</small>
            </span>
          </Link>
        )}
        {s.activity.slice(0, 6).map((a) => (
          <div key={a.id} className="dl-item dl-act">
            <i className="dl-dot" style={{ background: project.color }} />
            <span>
              <strong>{a.text}</strong>
              <small>{ago(a.at)}</small>
            </span>
          </div>
        ))}
      </Panel>

      {invite && <InviteDialog project={project} onClose={() => setInvite(false)} />}
    </div>
  );
}
