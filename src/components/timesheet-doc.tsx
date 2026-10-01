"use client";

import type { CSSProperties } from "react";
import { fmt, today } from "@/lib/date";
import type { SheetView } from "@/lib/timesheet-excel";
import { absenceSummary, fmtHours, type SheetData, type timesheetSettings } from "@/lib/timesheet";
import { useStore } from "@/lib/store";

type S = ReturnType<typeof timesheetSettings>;

/** One time sheet in the designed layout (title, logo, colour, header facts, columns, signatures). */
export function DesignedSheet({ sd, s }: { sd: SheetData; s: S }) {
  const { data } = useStore();
  const p = sd.project;
  const facts = s.facts.filter((f) => f.on);
  const cols = s.columns.filter((c) => c.on);
  const factValue = (k: string) =>
    ({
      mitarbeiter: sd.employee?.name ?? "–",
      personalnummer: sd.employee?.staffNo || "–",
      firma: sd.leasing ? `${sd.verleiher || "Leasing"} (Leasing)` : sd.firma,
      projekt: `${p.code} · ${p.name}`,
      kunde: p.client || "–",
      ort: p.location || "–",
      bauleitung: sd.bauleitung || "–",
      zeitraum: `${fmt(sd.from)} – ${fmt(sd.to)}`
    })[k] ?? "";
  const cell = (k: string, r: SheetData["rows"][number]) =>
    ({ wochentag: r.weekday, datum: fmt(r.date), beginn: r.start, ende: r.end, pause: `${r.pause} min`, stunden: fmtHours(r.hours), taetigkeit: r.activity })[k] ?? "";
  const sumAt = cols.findIndex((c) => c.key === "stunden");
  return (
    <article className={`doc ts-doc head-${s.headStyle} fs-${s.fontSize} or-${s.orientation}`} style={{ "--ac": s.accent } as CSSProperties}>
      <header className="tsd-head">
        <div className="tsd-brand">
          <img src={s.logo || "/brand/vysner-logo.png"} alt="" />
          <p>
            {data.company.name}
            <br />
            {data.company.address}
          </p>
        </div>
        <div className="tsd-title">
          <h1>{s.title || "Zeitschein"}</h1>
          <strong>{sd.kw}</strong>
          <span>
            {fmt(sd.from)} – {fmt(sd.to)}
          </span>
        </div>
      </header>
      {facts.length > 0 && (
        <dl className="tsd-facts">
          {facts.map((f) => (
            <div key={f.key}>
              <dt>{f.label}</dt>
              <dd>{factValue(f.key)}</dd>
            </div>
          ))}
        </dl>
      )}
      <table className="tsd-table">
        <thead>
          <tr>
            {cols.map((c) => (
              <th key={c.key} className={c.key === "stunden" || c.key === "pause" ? "num" : ""}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sd.rows.map((r) => {
            if (r.absence) {
              // Urlaub / Krank / ZA: day and date, then the reason across the remaining columns
              const lead = cols.findIndex((c) => c.key !== "wochentag" && c.key !== "datum");
              return (
                <tr key={r.id} className={`tsd-abs abs-${r.absence}`}>
                  {cols.slice(0, lead === -1 ? cols.length : lead).map((c) => (
                    <td key={c.key}>{cell(c.key, r)}</td>
                  ))}
                  {lead !== -1 && <td colSpan={cols.length - lead}>{r.activity}</td>}
                </tr>
              );
            }
            return (
              <tr key={r.id}>
                {cols.map((c) => (
                  <td key={c.key} className={c.key === "stunden" || c.key === "pause" ? "num" : c.key === "taetigkeit" ? "wide" : ""}>
                    {cell(c.key, r)}
                  </td>
                ))}
              </tr>
            );
          })}
          {sd.rows.length === 0 && (
            <tr>
              <td colSpan={cols.length}>Keine Zeiten in diesem Zeitraum.</td>
            </tr>
          )}
          {s.showSummary && (
            <tr className="tsd-sum">
              {cols.map((c, i) => (
                <td key={c.key} className={c.key === "stunden" ? "num" : ""}>
                  {i === 0 ? (sumAt === 0 ? `${fmtHours(sd.total)} h` : "Summe") : c.key === "stunden" ? `${fmtHours(sd.total)} h` : ""}
                </td>
              ))}
            </tr>
          )}
        </tbody>
      </table>
      {sd.absences.length > 0 && <p className="tsd-absum">Abwesenheiten: {absenceSummary(sd.absences)}</p>}
      {s.note && <p className="tsd-note">{s.note}</p>}
      <Signatures labels={s.signatures} />
      <footer className="doc-foot">
        <span>{data.company.name}</span>
        <span>Erstellt am {fmt(today())}</span>
      </footer>
    </article>
  );
}

/** Summary of all leased workers of one agency. */
export function AgencySummary({ sheets, s, agency }: { sheets: SheetData[]; s: S; agency: string }) {
  const { data } = useStore();
  const p = sheets[0].project;
  return (
    <article className={`doc ts-doc head-${s.headStyle} fs-${s.fontSize} or-${s.orientation}`} style={{ "--ac": s.accent } as CSSProperties}>
      <header className="tsd-head">
        <div className="tsd-brand">
          <img src={s.logo || "/brand/vysner-logo.png"} alt="" />
          <p>{data.company.name}</p>
        </div>
        <div className="tsd-title">
          <h1>{s.title || "Zeitschein"} – Übersicht</h1>
          <strong>{sheets[0].kw}</strong>
          <span>
            {fmt(sheets[0].from)} – {fmt(sheets[0].to)}
          </span>
        </div>
      </header>
      <dl className="tsd-facts">
        <div>
          <dt>Verleiher</dt>
          <dd>{agency}</dd>
        </div>
        <div>
          <dt>Projekt</dt>
          <dd>
            {p.code} · {p.name}
          </dd>
        </div>
        <div>
          <dt>Kunde</dt>
          <dd>{p.client || "–"}</dd>
        </div>
      </dl>
      <table className="tsd-table">
        <thead>
          <tr>
            <th>Mitarbeiter</th>
            <th>Pers.-Nr.</th>
            <th className="num">Arbeitstage</th>
            <th>Abwesend</th>
            <th className="num">Stunden</th>
          </tr>
        </thead>
        <tbody>
          {sheets.map((sd) => (
            <tr key={sd.employee!.id}>
              <td>{sd.employee!.name}</td>
              <td>{sd.employee!.staffNo || "–"}</td>
              <td className="num">{sd.rows.filter((r) => !r.absence).length}</td>
              <td>{absenceSummary(sd.absences) || "–"}</td>
              <td className="num">{fmtHours(sd.total)}</td>
            </tr>
          ))}
          <tr className="tsd-sum">
            <td colSpan={4}>Summe</td>
            <td className="num">{fmtHours(sheets.reduce((n, sd) => n + sd.total, 0))} h</td>
          </tr>
        </tbody>
      </table>
      <Signatures labels={s.signatures} />
    </article>
  );
}

function Signatures({ labels }: { labels: string[] }) {
  if (!labels.length) return null;
  return (
    <div className="tsd-sign" style={{ gridTemplateColumns: `repeat(${labels.length}, 1fr)` }}>
      {labels.map((l, i) => (
        <div key={i}>
          <span />
          {l}
        </div>
      ))}
    </div>
  );
}

/** The customer's Excel form, filled in – printed as it looks in Excel. */
export function ExcelSheet({ view, landscape }: { view: SheetView; landscape?: boolean }) {
  const total = view.widths.reduce((a, b) => a + b, 0);
  return (
    <article className={`doc ts-excel ${landscape ? "or-quer" : ""}`}>
      <table className="xl" style={{ width: total > 0 ? "100%" : undefined }}>
        <colgroup>
          {view.widths.map((w, i) => (
            <col key={i} style={{ width: `${(w / total) * 100}%` }} />
          ))}
        </colgroup>
        <tbody>
          {view.rows.map((r, i) => (
            <tr key={i} style={{ height: r.height }}>
              {r.cells.map((c, j) =>
                c ? (
                  <td key={j} colSpan={c.colSpan} rowSpan={c.rowSpan} style={c.style as CSSProperties} className={c.spill ? "spill" : undefined}>
                    {c.spill ? <span style={{ width: `${c.spill * 100}%` }}>{c.text}</span> : c.text}
                  </td>
                ) : null
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </article>
  );
}
