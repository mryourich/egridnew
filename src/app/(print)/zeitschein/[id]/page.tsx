"use client";

import { useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { DocPage, DocScreen } from "@/components/doc";
import { fmt, today } from "@/lib/date";
import { fmtHours, sheetData, timesheetSettings } from "@/lib/timesheet";
import { useStore } from "@/lib/store";

/** Time sheets of one project: one page per person; leased workers get a summary per agency. */
function TimesheetDoc() {
  const { id } = useParams<{ id: string }>();
  const q = useSearchParams();
  const { data } = useStore();
  const project = data.projects.find((p) => p.id === id);
  if (!project) return <p style={{ padding: 40 }}>Projekt nicht gefunden.</p>;
  const s = timesheetSettings(data);
  const period = { from: q.get("von") ?? today(), to: q.get("bis") ?? today() };
  const people = (q.get("ma") ?? "").split(",").filter(Boolean);
  const sheets = people.map((emp) => sheetData(data, project, emp, period)).filter((sd) => sd.employee);
  // summary per staffing agency when several leased workers are printed together
  const agencies = [...new Set(sheets.filter((sd) => sd.leasing).map((sd) => sd.verleiher || "Leasing"))];
  const meta = (kw: string) => (
    <dl className="doc-meta">
      <dt>Woche</dt>
      <dd>{kw}</dd>
      <dt>Zeitraum</dt>
      <dd>
        {fmt(period.from)} – {fmt(period.to)}
      </dd>
    </dl>
  );

  return (
    <DocScreen>
      {sheets.length === 0 && <p style={{ padding: 40 }}>Keine Personen gewählt.</p>}
      {sheets.length > 1 &&
        agencies.map((a) => {
          const list = sheets.filter((sd) => sd.leasing && (sd.verleiher || "Leasing") === a);
          if (list.length < 2) return null;
          return (
            <DocPage key={a} title={`${s.title} – Übersicht`} meta={meta(list[0].kw)} logo={s.logo}>
              <div className="doc-project" style={{ borderColor: project.color }}>
                <div>
                  <small>Projekt</small>
                  <strong>
                    {project.code} · {project.name}
                  </strong>
                  <span>{[project.client, project.location].filter(Boolean).join(" · ")}</span>
                </div>
                <div>
                  <small>Verleiher</small>
                  <strong>{a}</strong>
                </div>
              </div>
              <table className="doc-table">
                <thead>
                  <tr>
                    <th>Mitarbeiter</th>
                    <th>Pers.-Nr.</th>
                    <th className="num">Tage</th>
                    <th className="num">Stunden</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((sd) => (
                    <tr key={sd.employee!.id}>
                      <td>{sd.employee!.name}</td>
                      <td>{sd.employee!.staffNo || "–"}</td>
                      <td className="num">{sd.rows.length}</td>
                      <td className="num">{fmtHours(sd.total)}</td>
                    </tr>
                  ))}
                  <tr className="doc-sum">
                    <td colSpan={3}>Summe</td>
                    <td className="num">{fmtHours(list.reduce((n, sd) => n + sd.total, 0))} h</td>
                  </tr>
                </tbody>
              </table>
              <Signatures labels={s.signatures} />
            </DocPage>
          );
        })}
      {sheets.map((sd) => (
        <DocPage key={sd.employee!.id} title={s.title} meta={meta(sd.kw)} logo={s.logo}>
          <div className="doc-project ts-head" style={{ borderColor: project.color }}>
            <div>
              <small>Mitarbeiter</small>
              <strong>{sd.employee!.name}</strong>
              <span>
                {sd.employee!.role}
                {sd.employee!.staffNo ? ` · Pers.-Nr. ${sd.employee!.staffNo}` : ""}
              </span>
            </div>
            <div>
              <small>{sd.leasing ? "Verleiher" : "Firma"}</small>
              <strong>{sd.leasing ? sd.verleiher || "Leasing" : sd.firma}</strong>
              <span>{sd.leasing ? `eingesetzt bei ${sd.firma}` : "Eigenpersonal"}</span>
            </div>
            <div>
              <small>Projekt</small>
              <strong>
                {project.code} · {project.name}
              </strong>
              <span>{[project.client, project.location].filter(Boolean).join(" · ")}</span>
            </div>
          </div>
          <table className="doc-table ts-table">
            <thead>
              <tr>
                <th>Tag</th>
                <th>Datum</th>
                <th>Beginn</th>
                <th>Ende</th>
                {s.showPause && <th className="num">Pause</th>}
                <th className="num">Stunden</th>
                {s.showActivity && <th>Tätigkeit</th>}
              </tr>
            </thead>
            <tbody>
              {sd.rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.weekday}</td>
                  <td>{fmt(r.date)}</td>
                  <td>{r.start}</td>
                  <td>{r.end}</td>
                  {s.showPause && <td className="num">{r.pause} min</td>}
                  <td className="num">{fmtHours(r.hours)}</td>
                  {s.showActivity && <td>{r.activity}</td>}
                </tr>
              ))}
              {sd.rows.length === 0 && (
                <tr>
                  <td colSpan={7}>Keine Zeiten in diesem Zeitraum.</td>
                </tr>
              )}
              <tr className="doc-sum">
                <td colSpan={s.showPause ? 5 : 4}>Summe</td>
                <td className="num">{fmtHours(sd.total)} h</td>
                {s.showActivity && <td />}
              </tr>
            </tbody>
          </table>
          {s.note && <p className="doc-text ts-note">{s.note}</p>}
          <Signatures labels={s.signatures} />
        </DocPage>
      ))}
    </DocScreen>
  );
}

function Signatures({ labels }: { labels: string[] }) {
  return (
    <div className="doc-sign tall ts-sign" style={{ gridTemplateColumns: `repeat(${Math.max(1, labels.length)}, 1fr)` }}>
      {labels.map((l) => (
        <div key={l}>
          <span />
          {l}
        </div>
      ))}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense>
      <TimesheetDoc />
    </Suspense>
  );
}
