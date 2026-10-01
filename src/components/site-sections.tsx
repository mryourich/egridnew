"use client";

import { AlertTriangle, Camera, CheckCircle2, FileText, Minus, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { fmt, inRange, isoWeek, today, weekdayShort } from "@/lib/date";
import * as L from "@/lib/labels";
import { shortPath } from "@/lib/site";
import { employeeName, isManager, projectTeam, roleLabel, roleOf, useStore } from "@/lib/store";
import type { IssueStatus, Project, RegieReport } from "@/lib/types";
import { RegieList, RegieSheet } from "./regie";
import { ISSUE_LABELS, Trail } from "./trail";
import { IssueButton } from "./issue-sheet";
import { useEditor } from "./shell";
import { EmpAvatar } from "./person";
import { Badge, Empty, SearchInput, Segmented } from "./ui";

const of = <T extends { projectId: string }>(list: T[], id: string) => list.filter((x) => x.projectId === id);

/* ---------------------------------------------------------------- Mängel */

export function DefectsSection({ projectId }: { projectId: string }) {
  const { data, save } = useStore();
  const openEditor = useEditor();
  const [status, setStatus] = useState<IssueStatus | "open" | "all">("open");
  const [query, setQuery] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const t = today();

  const list = useMemo(() => {
    const q = query.toLowerCase();
    const rank = { kritisch: 0, hoch: 1, mittel: 2, niedrig: 3 };
    return data.issues
      .filter((i) => i.projectId === projectId)
      .filter((i) => (status === "all" ? true : status === "open" ? i.status !== "erledigt" : i.status === status))
      .filter((i) => !q || `${i.title} ${i.location} ${i.description}`.toLowerCase().includes(q))
      .sort((a, b) => rank[a.severity] - rank[b.severity] || (a.due || "9").localeCompare(b.due || "9"));
  }, [data.issues, projectId, status, query]);

  const nextStatus: Record<IssueStatus, IssueStatus> = { offen: "in_arbeit", in_arbeit: "erledigt", erledigt: "offen" };

  return (
    <div className="stack">
      <div className="toolbar">
        <Segmented
          options={[
            { value: "open", label: "Offen" },
            { value: "erledigt", label: "Erledigt" },
            { value: "all", label: "Alle" }
          ]}
          value={status as "open" | "erledigt" | "all"}
          onChange={setStatus}
        />
        <SearchInput value={query} onChange={setQuery} />
        <span className="spacer" />
        <a className="btn" href={`/maengelbericht/${projectId}`} target="_blank" rel="noreferrer">
          <FileText size={15} /> Mängelbericht
        </a>
        <IssueButton projectId={projectId} className="btn btn-primary" label="Mangel melden" />
      </div>
      {list.length === 0 ? (
        <Empty>
          <CheckCircle2 size={18} /> Keine Einträge.
        </Empty>
      ) : (
        <div className="issue-list">
          {list.map((i) => {
            const overdue = i.status !== "erledigt" && i.due && i.due < t;
            return (
              <article key={i.id} className={`issue sev-${i.severity}`} onClick={() => openEditor({ kind: "issue", item: i })}>
                {i.photo ? (
                  <button
                    type="button"
                    className="issue-photo"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPhoto(i.photo);
                    }}
                  >
                    <img src={i.photo} alt="" />
                  </button>
                ) : (
                  <span className="issue-photo placeholder">
                    <Camera size={16} />
                  </span>
                )}
                <div className="issue-main">
                  <div className="row-inline">
                    {i.kind !== "mangel" && <Badge tone={L.issueKind[i.kind].tone}>{L.issueKind[i.kind].label}</Badge>}
                    <Badge tone={L.severity[i.severity].tone}>{L.severity[i.severity].label}</Badge>
                    <strong>{i.title}</strong>
                  </div>
                  <small className="muted">
                    {i.nodeId ? shortPath(data.siteNodes, i.nodeId) : i.location || "ohne Ort"} · {i.assigneeId ? employeeName(data, i.assigneeId) : "nicht zugewiesen"} ·{" "}
                    <span className={overdue ? "text-red" : ""}>Frist {fmt(i.due)}</span>
                  </small>
                  <Trail item={i} labels={ISSUE_LABELS} created="Gemeldet" compact />
                  {i.description && <p>{i.description}</p>}
                  {i.status === "erledigt" && (i.fixPhoto || i.fixNote || i.fixedAt) && (
                    <p className="issue-fix">
                      {i.fixPhoto && (
                        <button
                          type="button"
                          className="issue-fix-photo"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPhoto(i.fixPhoto!);
                          }}
                        >
                          <img src={i.fixPhoto} alt="Nach Behebung" />
                        </button>
                      )}
                      <span>
                        <CheckCircle2 size={13} /> Behoben{i.fixedAt ? ` am ${fmt(i.fixedAt)}` : ""}
                        {i.fixedBy ? ` von ${employeeName(data, i.fixedBy)}` : ""}
                        {i.fixNote ? ` – ${i.fixNote}` : ""}
                      </span>
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  className={`status-btn tone-${L.issueStatus[i.status].tone}`}
                  title={i.status === "in_arbeit" ? "Als behoben melden" : "Status weiterschalten"}
                  onClick={(e) => {
                    e.stopPropagation();
                    const s = nextStatus[i.status];
                    // finishing asks for the proof photo in the card
                    if (s === "erledigt") return openEditor({ kind: "issue", item: { ...i, status: "erledigt" } });
                    save("issues", { ...i, status: s }, `${L.issueKind[i.kind].label} „${i.title}“: ${L.issueStatus[s].label}`);
                  }}
                >
                  {L.issueStatus[i.status].label}
                </button>
              </article>
            );
          })}
        </div>
      )}
      {photo && (
        <div className="modal-backdrop" onClick={() => setPhoto(null)}>
          <img className="lightbox" src={photo} alt="" />
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- Tagesberichte */

export function ReportsSection({ project }: { project: Project }) {
  const { data } = useStore();
  const openEditor = useEditor();
  const [kind, setKind] = useState<"tag" | "regie">("tag");
  const [regie, setRegie] = useState<Partial<RegieReport> | null>(null);
  const list = of(data.reports, project.id).sort((a, b) => b.date.localeCompare(a.date));
  const regieCount = data.regie.filter((r) => r.projectId === project.id).length;

  return (
    <div className="stack">
      <div className="toolbar">
        <Segmented
          options={[
            { value: "tag", label: `Tagesberichte (${list.length})` },
            { value: "regie", label: `Regiescheine (${regieCount})` }
          ]}
          value={kind}
          onChange={setKind}
        />
        <span className="spacer" />
        <button className="btn" type="button" onClick={() => (setKind("regie"), setRegie({ projectId: project.id }))}>
          <Plus size={16} /> Regieschein
        </button>
        <button className="btn btn-primary" type="button" onClick={() => openEditor({ kind: "report", item: { projectId: project.id } })}>
          <Plus size={16} /> Tagesbericht
        </button>
      </div>
      {regie && <RegieSheet regie={regie} onClose={() => setRegie(null)} />}
      {kind === "regie" ? (
        <RegieList project={project} onOpen={setRegie} />
      ) : list.length === 0 ? (
        <Empty>Noch keine Tagesberichte.</Empty>
      ) : (
        <div className="report-list">
          {list.map((r) => (
            <article key={r.id} className="card report-card">
              <div className="rc-date">
                <span>{weekdayShort(r.date)}</span>
                <strong>{r.date.slice(8)}</strong>
                <small>KW {isoWeek(r.date)}</small>
              </div>
              <div className="rc-body">
                <div className="rc-meta">
                  <strong>{fmt(r.date)}</strong>
                  <span className="chip-static">{r.crew} Personen</span>
                  <span className="chip-static">{r.hours} h</span>
                  <span className="muted small">von {employeeName(data, r.authorId)}</span>
                </div>
                <p className="prose">{r.work}</p>
                {r.incidents && (
                  <p className="report-incident">
                    <AlertTriangle size={14} /> {r.incidents}
                  </p>
                )}
                {r.photos.length > 0 && (
                  <div className="rc-photos">
                    {r.photos.map((src, i) => (
                      <img key={i} src={src} alt="" />
                    ))}
                  </div>
                )}
              </div>
              <div className="rc-actions">
                <a className="btn btn-sm btn-primary" href={`/tagesbericht/${r.id}`} target="_blank" rel="noreferrer">
                  <FileText size={14} /> PDF
                </a>
                <button className="btn btn-sm" type="button" onClick={() => openEditor({ kind: "report", item: r })}>
                  Bearbeiten
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
