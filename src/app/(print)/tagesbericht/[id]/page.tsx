"use client";

import { useParams } from "next/navigation";
import { DocFrame, DocSection } from "@/components/doc";
import { fmt, inRange, isoWeek, weekdayLong } from "@/lib/date";
import * as L from "@/lib/labels";
import { childrenOf, nodeProgress, photoName, shortPath } from "@/lib/site";
import { employeeName, projectTeam, useStore } from "@/lib/store";

export default function DailyReportDoc() {
  const { id } = useParams<{ id: string }>();
  const { data } = useStore();
  const report = data.reports.find((r) => r.id === id);
  const project = report && data.projects.find((p) => p.id === report.projectId);
  if (!report || !project) return <p style={{ padding: 40 }}>Tagesbericht nicht gefunden.</p>;

  const d = report.date;
  const no = data.reports.filter((r) => r.projectId === project.id && r.date <= d).length;
  const nodes = data.siteNodes.filter((n) => n.projectId === project.id);
  const jobs = data.jobs.filter((j) => j.projectId === project.id && !j.symbol && inRange(d, j.start, j.end)).sort((a, b) => a.employeeId.localeCompare(b.employeeId));
  const team = [...new Set(jobs.map((j) => j.employeeId))];
  const issues = data.issues.filter((i) => i.projectId === project.id && (i.status !== "erledigt" || i.createdAt === d));
  const photos = [
    ...report.photos.map((src, i) => ({ id: `r${i}`, src, title: `Foto ${i + 1}`, sub: "Tagesbericht" })),
    ...data.photos
      .filter((p) => p.projectId === project.id && p.takenAt.slice(0, 10) === d)
      .map((p) => ({ id: p.id, src: p.dataUrl, title: photoName(data.siteNodes, data.photos, p), sub: `${p.takenAt.slice(11, 16)}${p.caption ? ` · ${p.caption}` : ""}` }))
  ].slice(0, 16);
  const absent = data.absences.filter((a) => projectTeam(data, project).some((e) => e.id === a.employeeId) && inRange(d, a.start, a.end));

  return (
    <DocFrame
      title="Tagesbericht"
      meta={
        <dl className="doc-meta">
          <dt>Nr.</dt>
          <dd>{String(no).padStart(3, "0")}</dd>
          <dt>Datum</dt>
          <dd>
            {weekdayLong(d)}, {fmt(d)}
          </dd>
          <dt>KW</dt>
          <dd>{isoWeek(d)}</dd>
        </dl>
      }
    >
      <div className="doc-project" style={{ borderColor: project.color }}>
        <div>
          <small>Projekt</small>
          <strong>
            {project.code} · {project.name}
          </strong>
          <span>
            {project.client} · {project.location}
          </span>
        </div>
        <div>
          <small>Bauleitung</small>
          <strong>{employeeName(data, project.siteManagerId)}</strong>
        </div>
      </div>

      <div className="doc-kpis">
        <div>
          <small>Aufgaben</small>
          <strong>{jobs.length}</strong>
        </div>
        <div>
          <small>Offene Mängel</small>
          <strong>{issues.filter((i) => i.status !== "erledigt").length}</strong>
        </div>
        <div>
          <small>Personal vor Ort</small>
          <strong>{report.crew}</strong>
        </div>
        <div>
          <small>Arbeitsstunden</small>
          <strong>{report.hours} h</strong>
        </div>
      </div>

      <DocSection title="Ausgeführte Arbeiten">
        <p className="doc-text">{report.work || "–"}</p>
      </DocSection>

      {jobs.length > 0 && (
        <DocSection title="Aufgaben des Tages">
          <table className="doc-table">
            <thead>
              <tr>
                <th>Aufgabe</th>
                <th>Mitarbeiter</th>
                <th>Bereich</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr key={j.id}>
                  <td>
                    <i className="doc-dot" style={{ background: j.color }} /> {j.title}
                  </td>
                  <td>{employeeName(data, j.employeeId)}</td>
                  <td>{j.nodeId ? shortPath(data.siteNodes, j.nodeId) : "–"}</td>
                  <td>{j.done ? "✓ erledigt" : "in Arbeit"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </DocSection>
      )}

      <DocSection title="Personal">
        <p className="doc-text">
          {team.length ? team.map((e) => `${employeeName(data, e)} (${data.employees.find((x) => x.id === e)?.role ?? ""})`).join(" · ") : `${report.crew} Personen`}
          {absent.length > 0 && (
            <>
              <br />
              <em>Abwesend: {absent.map((a) => `${employeeName(data, a.employeeId)} – ${L.absenceType[a.type].label}`).join(", ")}</em>
            </>
          )}
        </p>
      </DocSection>

      {nodes.length > 0 && (
        <DocSection title="Baufortschritt nach Struktur">
          <table className="doc-table doc-progress">
            <tbody>
              {childrenOf(nodes, "").flatMap((area) => [
                <tr key={area.id} className="lvl0">
                  <td>{area.title}</td>
                  <td>
                    <span className="doc-bar">
                      <i style={{ width: `${nodeProgress(nodes, area)}%`, background: project.color }} />
                    </span>
                  </td>
                  <td>{nodeProgress(nodes, area)} %</td>
                </tr>,
                ...childrenOf(nodes, area.id).map((sub) => (
                  <tr key={sub.id} className="lvl1">
                    <td>{sub.title}</td>
                    <td>
                      <span className="doc-bar">
                        <i style={{ width: `${nodeProgress(nodes, sub)}%`, background: project.color }} />
                      </span>
                    </td>
                    <td>{nodeProgress(nodes, sub)} %</td>
                  </tr>
                ))
              ])}
            </tbody>
          </table>
        </DocSection>
      )}

      {(report.incidents || issues.length > 0) && (
        <DocSection title="Besondere Vorkommnisse & Mängel">
          {report.incidents && <p className="doc-text doc-note">{report.incidents}</p>}
          {issues.length > 0 && (
            <table className="doc-table">
              <thead>
                <tr>
                  <th>Mangel</th>
                  <th>Bereich</th>
                  <th>Priorität</th>
                  <th>Status</th>
                  <th>Frist</th>
                </tr>
              </thead>
              <tbody>
                {issues.map((i) => (
                  <tr key={i.id}>
                    <td>{i.title}</td>
                    <td>{i.nodeId ? shortPath(data.siteNodes, i.nodeId) : i.location || "–"}</td>
                    <td>{L.severity[i.severity].label}</td>
                    <td>{L.issueStatus[i.status].label}</td>
                    <td>{fmt(i.due)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </DocSection>
      )}

      {photos.length > 0 && (
        <DocSection title={`Fotos vom ${fmt(d)}`}>
          <div className="doc-photos">
            {photos.map((p) => (
              <figure key={p.id}>
                <img src={p.src} alt={p.title} />
                <figcaption>
                  <strong>{p.title}</strong>
                  <span>{p.sub}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </DocSection>
      )}

      <div className="doc-sign">
        <div>
          <span />
          Bauleitung ({employeeName(data, report.authorId)})
        </div>
        <div>
          <span />
          Auftraggeber
        </div>
      </div>
    </DocFrame>
  );
}
