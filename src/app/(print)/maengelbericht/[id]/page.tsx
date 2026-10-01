"use client";

import { useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { DocFrame, DocSection } from "@/components/doc";
import { fmt, isoWeek, today } from "@/lib/date";
import * as L from "@/lib/labels";
import { pathLabel } from "@/lib/site";
import { employeeName, useStore } from "@/lib/store";
import type { Issue } from "@/lib/types";

const RANK = { kritisch: 0, hoch: 1, mittel: 2, niedrig: 3 };

function DefectReport() {
  const { id } = useParams<{ id: string }>();
  const q = useSearchParams();
  const { data } = useStore();
  const project = data.projects.find((p) => p.id === id);
  if (!project) return <p style={{ padding: 40 }}>Baustelle nicht gefunden.</p>;
  const t = today();
  const onlyOpen = q.get("nur") === "offen";
  const all = data.issues.filter((i) => i.projectId === project.id);
  const open = all.filter((i) => i.status !== "erledigt").sort((a, b) => RANK[a.severity] - RANK[b.severity] || (a.due || "9").localeCompare(b.due || "9"));
  const fixed = all.filter((i) => i.status === "erledigt").sort((a, b) => (b.fixedAt ?? "").localeCompare(a.fixedAt ?? ""));
  const overdue = open.filter((i) => i.due && i.due < t).length;

  const item = (i: Issue, n: number) => (
    <article key={i.id} className={`doc-defect sev-${i.severity}`}>
      <header>
        <strong>
          {n}. {i.title}
        </strong>
        <span className={`doc-badge tone-${L.issueStatus[i.status].tone}`}>{i.status === "erledigt" ? "Behoben" : L.issueStatus[i.status].label}</span>
      </header>
      <dl>
        <dt>Bereich</dt>
        <dd>{i.nodeId ? pathLabel(data.siteNodes, i.nodeId) : i.location || "–"}</dd>
        <dt>Priorität</dt>
        <dd>{L.severity[i.severity].label}</dd>
        <dt>Zuständig</dt>
        <dd>{i.assigneeId ? employeeName(data, i.assigneeId) : "–"}</dd>
        <dt>Gemeldet</dt>
        <dd>{fmt(i.createdAt)}</dd>
        <dt>Frist</dt>
        <dd className={i.status !== "erledigt" && i.due && i.due < t ? "late" : ""}>{fmt(i.due)}</dd>
        {i.status === "erledigt" && (
          <>
            <dt>Behoben</dt>
            <dd>
              {fmt(i.fixedAt)}
              {i.fixedBy ? ` · ${employeeName(data, i.fixedBy)}` : ""}
            </dd>
          </>
        )}
      </dl>
      {i.description && <p>{i.description}</p>}
      {i.fixNote && <p className="doc-fixnote">Behebung: {i.fixNote}</p>}
      {(i.photo || i.fixPhoto) && (
        <div className="doc-beforeafter">
          {i.photo && (
            <figure>
              <img src={i.photo} alt="" />
              <figcaption>Vorher</figcaption>
            </figure>
          )}
          {i.fixPhoto && (
            <figure>
              <img src={i.fixPhoto} alt="" />
              <figcaption>Nachher</figcaption>
            </figure>
          )}
        </div>
      )}
    </article>
  );

  return (
    <DocFrame
      title="Mängelbericht"
      meta={
        <dl className="doc-meta">
          <dt>Stand</dt>
          <dd>
            {fmt(t)} · KW {isoWeek(t)}
          </dd>
          <dt>Umfang</dt>
          <dd>{onlyOpen ? "nur offene Mängel" : "alle Mängel"}</dd>
        </dl>
      }
    >
      <div className="doc-project" style={{ borderColor: project.color }}>
        <div>
          <small>Baustelle</small>
          <strong>
            {project.code} · {project.name}
          </strong>
          <span>{[project.client, project.location].filter(Boolean).join(" · ")}</span>
        </div>
        <div>
          <small>Bauleitung</small>
          <strong>{employeeName(data, project.siteManagerId)}</strong>
        </div>
      </div>

      <div className="doc-kpis">
        <div>
          <small>Gesamt</small>
          <strong>{all.length}</strong>
        </div>
        <div>
          <small>Offen</small>
          <strong>{open.length}</strong>
        </div>
        <div>
          <small>Überfällig</small>
          <strong>{overdue}</strong>
        </div>
        <div>
          <small>Behoben</small>
          <strong>{fixed.length}</strong>
        </div>
      </div>

      <DocSection title={`Offene Mängel (${open.length})`}>{open.length ? open.map((i, n) => item(i, n + 1)) : <p className="doc-text">Keine offenen Mängel.</p>}</DocSection>
      {!onlyOpen && fixed.length > 0 && <DocSection title={`Behobene Mängel (${fixed.length})`}>{fixed.map((i, n) => item(i, open.length + n + 1))}</DocSection>}
    </DocFrame>
  );
}

export default function DefectReportPage() {
  return (
    <Suspense>
      <DefectReport />
    </Suspense>
  );
}
