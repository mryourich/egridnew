"use client";

import { useParams } from "next/navigation";
import { DocFrame, DocSection } from "@/components/doc";
import { fmt, isoWeek, weekdayLong } from "@/lib/date";
import { employeeName, useStore } from "@/lib/store";

export default function RegieDoc() {
  const { id } = useParams<{ id: string }>();
  const { data } = useStore();
  const r = data.regie.find((x) => x.id === id);
  const project = r && data.projects.find((p) => p.id === r.projectId);
  if (!r || !project) return <p style={{ padding: 40 }}>Regieschein nicht gefunden.</p>;
  const hours = r.workers.reduce((s, w) => s + w.hours, 0);

  return (
    <DocFrame
      title="Regieschein"
      meta={
        <dl className="doc-meta">
          <dt>Nr.</dt>
          <dd>{String(r.no).padStart(2, "0")}</dd>
          <dt>Datum</dt>
          <dd>
            {weekdayLong(r.date)}, {fmt(r.date)}
          </dd>
          <dt>KW</dt>
          <dd>{isoWeek(r.date)}</dd>
        </dl>
      }
    >
      <div className="doc-project" style={{ borderColor: project.color }}>
        <div>
          <small>Projekt</small>
          <strong>
            {project.code} · {project.name}
          </strong>
          <span>{[project.client, project.location].filter(Boolean).join(" · ")}</span>
        </div>
        <div>
          <small>Beauftragt von</small>
          <strong>{r.orderedBy || "–"}</strong>
        </div>
      </div>

      <DocSection title="Ausgeführte Zusatzarbeit">
        <p className="doc-text">{r.description}</p>
      </DocSection>

      <DocSection title="Personal">
        <table className="doc-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Funktion</th>
              <th className="num">Stunden</th>
            </tr>
          </thead>
          <tbody>
            {r.workers.map((w) => (
              <tr key={w.employeeId}>
                <td>{employeeName(data, w.employeeId)}</td>
                <td>{data.employees.find((e) => e.id === w.employeeId)?.role}</td>
                <td className="num">{w.hours}</td>
              </tr>
            ))}
            <tr className="doc-sum">
              <td colSpan={2}>Summe</td>
              <td className="num">{hours} h</td>
            </tr>
          </tbody>
        </table>
      </DocSection>

      {r.materials.length > 0 && (
        <DocSection title="Material">
          <table className="doc-table">
            <thead>
              <tr>
                <th>Art.-Nr.</th>
                <th>Material</th>
                <th className="num">Menge</th>
                <th>Einheit</th>
              </tr>
            </thead>
            <tbody>
              {r.materials.map((m, i) => (
                <tr key={i}>
                  <td>{m.artNo || "–"}</td>
                  <td>{m.name}</td>
                  <td className="num">{m.qty}</td>
                  <td>{m.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </DocSection>
      )}

      {(r.photos ?? []).length > 0 && (
        <DocSection title="Fotos">
          <div className="doc-photos">
            {r.photos!.map((src, i) => (
              <figure key={i}>
                <img src={src} alt="" />
                <figcaption>
                  <strong>Foto {i + 1}</strong>
                  <span>Regieschein Nr. {String(r.no).padStart(2, "0")}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </DocSection>
      )}

      <div className="doc-sign tall">
        <div>
          <span />
          {employeeName(data, r.authorId)} ({data.company.name})
        </div>
        <div>
          <span>{r.signature && <img className="doc-signature" src={r.signature} alt="Unterschrift" />}</span>
          Auftraggeber{r.signedBy ? `: ${r.signedBy}` : ""}
        </div>
      </div>
    </DocFrame>
  );
}
