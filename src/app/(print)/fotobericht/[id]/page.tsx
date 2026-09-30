"use client";

import { useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { DocFrame } from "@/components/doc";
import { fmt, isoWeek, today } from "@/lib/date";
import { shortPath } from "@/lib/site";
import { employeeName, useStore } from "@/lib/store";

function PhotoReport() {
  const { id } = useParams<{ id: string }>();
  const q = useSearchParams();
  const { data } = useStore();
  const project = data.projects.find((p) => p.id === id);
  if (!project) return <p style={{ padding: 40 }}>Projekt nicht gefunden.</p>;
  const ids = (q.get("ids") ?? "").split(",").filter(Boolean);
  const photos = data.photos.filter((p) => p.projectId === project.id && (!ids.length || ids.includes(p.id))).sort((a, b) => a.takenAt.localeCompare(b.takenAt));
  const title = q.get("titel") || "Alle Fotos";

  return (
    <DocFrame
      title="Fotodokumentation"
      meta={
        <dl className="doc-meta">
          <dt>Bereich</dt>
          <dd>{title}</dd>
          <dt>Fotos</dt>
          <dd>{photos.length}</dd>
          <dt>Stand</dt>
          <dd>
            {fmt(today())} · KW {isoWeek(today())}
          </dd>
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
      <div className="doc-photos two">
        {photos.map((p, i) => (
          <figure key={p.id}>
            <img src={p.dataUrl} alt={p.caption} />
            <figcaption>
              <strong>
                {i + 1}. {p.caption}
              </strong>
              <span>{p.nodeId ? shortPath(data.siteNodes, p.nodeId) : "ohne Bereich"}</span>
              <span>
                {fmt(p.takenAt.slice(0, 10))} {p.takenAt.slice(11, 16)} · {employeeName(data, p.authorId)}
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </DocFrame>
  );
}

export default function PhotoReportPage() {
  return (
    <Suspense>
      <PhotoReport />
    </Suspense>
  );
}
