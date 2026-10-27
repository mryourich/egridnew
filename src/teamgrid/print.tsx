"use client";

import { Printer } from "lucide-react";
import { today } from "@/core/date";
import { defectNo, fmtDate, fmtShort, fmtStamp, PRIORITY, PROJECT_STATUS, WORK_STATUS } from "@/core/format";
import { canSee } from "@/core/roles";
import { personName, StoreProvider, useStore } from "@/core/store";
import type { Data, OpenPoint, Project } from "@/core/types";
import { childrenOf, pathLabel, projectFacts, tasksUnder } from "./model";
import "./print.css";

export function PrintPage({ kind, id }: { kind: string; id: string }) {
  return (
    <StoreProvider>
      <Doc kind={kind} id={id} />
    </StoreProvider>
  );
}

function Doc({ kind, id }: { kind: string; id: string }) {
  const { data } = useStore();
  const p = data.projects.find((x) => x.id === id);
  if (!p || !canSee(data, p)) return <p className="pr-missing">Projekt nicht gefunden.</p>;
  const title = kind === "maengel" ? "Mängelbericht" : kind === "punkte" ? "Offene Punkte" : "Statusbericht";
  return (
    <div className="pr">
      <div className="pr-bar">
        <button type="button" onClick={() => window.print()}>
          <Printer size={16} /> Drucken / als PDF speichern
        </button>
      </div>
      <article className="pr-page">
        <header className="pr-head">
          <div>
            <img src="/brand/vysner-logo.png" alt="VYSNER" />
            <span>{data.workspace.name}</span>
            {data.workspace.address && <span>{data.workspace.address}</span>}
          </div>
          <div className="pr-title">
            <h1>{title}</h1>
            <span>Stand {fmtDate(today())}</span>
          </div>
        </header>
        <table className="pr-meta">
          <tbody>
            <tr>
              <th>Projekt</th>
              <td>
                {p.name} {p.number && `(${p.number})`}
              </td>
              <th>Auftraggeber</th>
              <td>{p.client || "–"}</td>
            </tr>
            <tr>
              <th>Ort</th>
              <td>{p.location || "–"}</td>
              <th>Projektleitung</th>
              <td>{personName(data, p.managerId) || "–"}</td>
            </tr>
            <tr>
              <th>Status</th>
              <td>{PROJECT_STATUS[p.status].label}</td>
              <th>Fertig bis</th>
              <td>{fmtDate(p.due) || "–"}</td>
            </tr>
          </tbody>
        </table>
        {kind === "maengel" ? <DefectList data={data} p={p} /> : kind === "punkte" ? <PointList data={data} p={p} /> : <Status data={data} p={p} />}
        <footer className="pr-foot">Erstellt mit VYSNER TeamGrid · {fmtStamp(new Date().toISOString())}</footer>
      </article>
    </div>
  );
}

function Status({ data, p }: { data: Data; p: Project }) {
  const f = projectFacts(data, p);
  return (
    <>
      <div className="pr-kpis">
        <div>
          <b>{f.progress} %</b>
          <span>Fortschritt</span>
        </div>
        <div>
          <b>{f.open.length}</b>
          <span>offene Punkte</span>
        </div>
        <div>
          <b>{f.late.length}</b>
          <span>davon überfällig</span>
        </div>
        <div>
          <b>{f.openDefects.length}</b>
          <span>offene Mängel</span>
        </div>
      </div>
      <h2>Fortschritt nach Bereichen</h2>
      <table className="pr-table">
        <thead>
          <tr>
            <th>Bereich</th>
            <th className="num">Erledigt</th>
            <th className="num">Gesamt</th>
            <th className="num">%</th>
          </tr>
        </thead>
        <tbody>
          {childrenOf(f.points, "").map((a) => {
            const l = tasksUnder(f.points, a.id);
            const done = l.filter((x) => x.status === "done").length;
            return (
              <tr key={a.id}>
                <td>{a.title}</td>
                <td className="num">{done}</td>
                <td className="num">{l.length}</td>
                <td className="num">{l.length ? Math.round((done / l.length) * 100) : 0}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {f.urgent.length > 0 && (
        <>
          <h2>Mängel mit Priorität hoch</h2>
          <DefectRows data={data} p={p} only="high" />
        </>
      )}
      {f.late.length > 0 && (
        <>
          <h2>Überfällige Punkte</h2>
          <PointRows points={f.points} list={f.late} data={data} />
        </>
      )}
    </>
  );
}

function DefectList({ data, p }: { data: Data; p: Project }) {
  return (
    <>
      <h2>Offene Mängel</h2>
      <DefectRows data={data} p={p} />
      <div className="pr-photos">
        {data.defects
          .filter((d) => d.projectId === p.id && d.status !== "done")
          .flatMap((d) => d.attachments.filter((a) => a.kind === "photo").map((a) => ({ d, a })))
          .map(({ d, a }) => (
            <figure key={a.id}>
              <img src={a.url} alt="" />
              <figcaption>
                {defectNo(d.no)} · {d.title}
              </figcaption>
            </figure>
          ))}
      </div>
    </>
  );
}

function DefectRows({ data, p, only }: { data: Data; p: Project; only?: "high" }) {
  const list = data.defects.filter((d) => d.projectId === p.id && d.status !== "done" && (!only || d.priority === only)).sort((a, b) => a.no - b.no);
  if (!list.length) return <p>Keine offenen Mängel.</p>;
  return (
    <table className="pr-table">
      <thead>
        <tr>
          <th>Nr.</th>
          <th>Mangel</th>
          <th>Ort</th>
          <th>Priorität</th>
          <th>Status</th>
          <th>Zuständig</th>
          <th>Frist</th>
        </tr>
      </thead>
      <tbody>
        {list.map((d) => (
          <tr key={d.id}>
            <td>{defectNo(d.no)}</td>
            <td>
              <strong>{d.title}</strong>
              {d.description && <small>{d.description}</small>}
            </td>
            <td>{d.location || "–"}</td>
            <td>{PRIORITY[d.priority].label}</td>
            <td>{WORK_STATUS[d.status].label}</td>
            <td>{personName(data, d.ownerId) || "–"}</td>
            <td>{fmtShort(d.due) || "–"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PointList({ data, p }: { data: Data; p: Project }) {
  const points = data.points.filter((x) => x.projectId === p.id);
  return (
    <>
      {childrenOf(points, "").map((a) => {
        const open = tasksUnder(points, a.id).filter((x) => x.status !== "done");
        return (
          <section key={a.id}>
            <h2>
              {a.title} <small>({open.length} offen)</small>
            </h2>
            {open.length ? <PointRows points={points} list={open} data={data} /> : <p>Alles erledigt.</p>}
          </section>
        );
      })}
    </>
  );
}

function PointRows({ points, list, data }: { points: OpenPoint[]; list: OpenPoint[]; data: Data }) {
  return (
    <table className="pr-table">
      <thead>
        <tr>
          <th className="pr-box" />
          <th>Punkt</th>
          <th>Status</th>
          <th>Zugewiesen</th>
          <th>Fällig</th>
        </tr>
      </thead>
      <tbody>
        {list.map((x) => (
          <tr key={x.id}>
            <td className="pr-box">☐</td>
            <td>
              <strong>{x.title}</strong>
              <small>{pathLabel(points, x.parentId)}</small>
            </td>
            <td>{WORK_STATUS[x.status].label}</td>
            <td>{x.assigneeIds.map((id) => personName(data, id)).join(", ") || "–"}</td>
            <td>{fmtShort(x.due) || "–"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
