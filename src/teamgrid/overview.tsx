"use client";

import { AlertTriangle, Camera, Pencil, PenLine, UserPlus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { addDays, diffDays, today } from "@/core/date";
import { defectNo, fmtDate, fmtShort, PROJECT_STATUS } from "@/core/format";
import { personName, useStore } from "@/core/store";
import type { Project } from "@/core/types";
import { Avatar, Bar, Button, PageHead } from "@/core/ui";
import { InviteDialog } from "./invite";
import { access, pathLabel, projectFacts } from "./model";
import { dayText } from "./plan-kit";
import { ProjectForm } from "./projects";
import { StickyBoard } from "./sticky";

/** Project start page – only what matters: where it stands, what is due next, who is there today. */
export function Overview({ project: p }: { project: Project }) {
  const { data } = useStore();
  const [editing, setEditing] = useState(false);
  const [inviting, setInviting] = useState(false);
  const f = projectFacts(data, p);
  const { manage, work } = access(data, p);
  const t = today();
  const base = `/projekte/${p.id}`;
  const daysLeft = p.due ? diffDays(t, p.due) : null;

  const next = [
    ...f.open.filter((x) => x.due && x.due <= addDays(t, 14)).map((x) => ({ key: x.id, title: x.title, sub: pathLabel(f.points, x.parentId), due: x.due, href: `${base}/punkte?punkt=${x.id}` })),
    ...f.openDefects.filter((x) => x.due && x.due <= addDays(t, 14)).map((x) => ({ key: x.id, title: x.title, sub: `Mangel ${defectNo(x.no)}`, due: x.due, href: `${base}/maengel?mangel=${x.id}` }))
  ]
    .sort((a, b) => a.due.localeCompare(b.due))
    .slice(0, 6);
  const here = f.team.filter((id) => {
    const d = dayText(data, id, t);
    return [d.am, d.pm].some((s) => s.kind === "job" && s.job.projectId === p.id);
  });
  const pinned = data.notes.filter((n) => n.projectId === p.id && n.pinned);

  return (
    <div className="page">
      <PageHead kicker={[p.number, PROJECT_STATUS[p.status].label].filter(Boolean).join(" · ")} title={p.name} sub={[p.client, p.location, p.managerId && `Projektleitung ${personName(data, p.managerId)}`].filter(Boolean).join(" · ")}>
        {work && (
          <>
            <Link href={`${base}/fotos`} className="b-btn default md">
              <Camera size={15} /> Foto
            </Link>
            <Link href={`${base}/maengel?neu=1`} className="b-btn default md">
              <AlertTriangle size={15} /> Mangel
            </Link>
            <Link href={`${base}/regie?neu=1`} className="b-btn default md">
              <PenLine size={15} /> Regie
            </Link>
          </>
        )}
        {manage && (
          <Button icon={<Pencil size={15} />} onClick={() => setEditing(true)}>
            Bearbeiten
          </Button>
        )}
      </PageHead>

      <div className="kpis">
        <Link href={`${base}/punkte`} className="kpi">
          <span>Fortschritt</span>
          <b>{f.progress} %</b>
          <Bar value={f.progress} />
        </Link>
        <Link href={`${base}/punkte`} className="kpi">
          <span>Offene Punkte</span>
          <b>{f.open.length}</b>
          <small className={f.late.length ? "bad" : ""}>{f.late.length ? `${f.late.length} überfällig` : `von ${f.tasks.length}`}</small>
        </Link>
        <Link href={`${base}/maengel`} className="kpi">
          <span>Offene Mängel</span>
          <b className={f.urgent.length ? "bad" : ""}>{f.openDefects.length}</b>
          <small className={f.urgent.length ? "bad" : ""}>{f.urgent.length ? `${f.urgent.length} dringend` : " "}</small>
        </Link>
        <div className="kpi">
          <span>Fertig bis</span>
          <b className={f.overdue ? "bad" : ""}>{fmtDate(p.due) || "–"}</b>
          <small className={f.overdue ? "bad" : ""}>{daysLeft == null ? " " : daysLeft < 0 ? `${-daysLeft} Tage drüber` : daysLeft === 0 ? "heute" : `noch ${daysLeft} Tage`}</small>
        </div>
      </div>

      <div className="cols">
        <section className="panel">
          <header className="panel-head">
            <h2>Als Nächstes fällig</h2>
            <Link href={`${base}/punkte`} className="link">
              Alle offenen Punkte
            </Link>
          </header>
          {next.length === 0 ? (
            <p className="panel-empty">In den nächsten zwei Wochen ist nichts fällig.</p>
          ) : (
            <table className="table">
              <tbody>
                {next.map((x) => (
                  <tr key={x.key}>
                    <td>
                      <Link href={x.href} className="strong">
                        {x.title}
                      </Link>
                      {x.sub && <small className="sub">{x.sub}</small>}
                    </td>
                    <td className={`num nowrap ${x.due < t ? "bad" : x.due === t ? "warn" : ""}`}>{x.due === t ? "heute" : fmtShort(x.due)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <aside className="col-side">
          <section className="panel">
            <header className="panel-head">
              <h2>Heute vor Ort</h2>
              {manage && (
                <button type="button" className="link" onClick={() => setInviting(true)}>
                  <UserPlus size={14} /> Team
                </button>
              )}
            </header>
            <div className="panel-body here">
              {here.length === 0 ? (
                <span className="muted">Heute ist niemand eingeplant.</span>
              ) : (
                here.map((id) => (
                  <span key={id} className="who">
                    <Avatar id={id} size={24} />
                    {personName(data, id)}
                  </span>
                ))
              )}
            </div>
          </section>
          {pinned.length > 0 && (
            <section className="panel">
              <header className="panel-head">
                <h2>Angeheftet</h2>
                <Link href={`${base}/notizen`} className="link">
                  Alle Notizen
                </Link>
              </header>
              <div className="panel-body">
                <StickyBoard notes={pinned} projectId={p.id} empty="" add={false} />
              </div>
            </section>
          )}
        </aside>
      </div>

      {editing && <ProjectForm project={p} onClose={() => setEditing(false)} />}
      {inviting && <InviteDialog project={p} onClose={() => setInviting(false)} />}
    </div>
  );
}
