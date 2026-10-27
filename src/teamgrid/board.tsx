"use client";

import { AlertTriangle, ClipboardList } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { today } from "@/core/date";
import { defectNo, fmtShort } from "@/core/format";
import { canWork, scopedPeople } from "@/core/roles";
import { now, personName, useStore } from "@/core/store";
import type { WorkStatus } from "@/core/types";
import { Avatar, PageHead, Seg } from "@/core/ui";
import { pathLabel, visibleProjects } from "./model";

type Card = { key: string; kind: "punkt" | "mangel"; id: string; title: string; sub: string; projectId: string; status: WorkStatus; due: string; who: string[]; href: string };
const COLS: { key: WorkStatus; label: string }[] = [
  { key: "open", label: "Offen" },
  { key: "in_progress", label: "In Arbeit" },
  { key: "done", label: "Erledigt" }
];

/** Tasks board over all projects: open points and defects as cards – drag to change the status. */
export function TaskBoard() {
  const { data, save, notify } = useStore();
  const [scope, setScope] = useState<"mine" | "team">("mine");
  const [project, setProject] = useState("");
  const [drag, setDrag] = useState("");
  const [over, setOver] = useState<WorkStatus | "">("");
  const projects = visibleProjects(data);
  const ids = new Set(projects.map((p) => p.id));
  const team = new Set(scopedPeople(data).map((p) => p.id));
  const mine = (who: string[]) => (scope === "mine" ? who.includes(data.meId) : who.some((w) => team.has(w)) || !who.length);
  const recent = (s: WorkStatus, at?: string) => s !== "done" || (!!at && at.slice(0, 10) >= new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10));
  const cards: Card[] = [
    ...data.points
      .filter((x) => x.type === "task" && ids.has(x.projectId) && (!project || x.projectId === project) && mine(x.assigneeIds) && recent(x.status, x.doneAt))
      .map((x): Card => ({ key: x.id, kind: "punkt", id: x.id, title: x.title, sub: pathLabel(data.points, x.parentId), projectId: x.projectId, status: x.status, due: x.due, who: x.assigneeIds, href: `/projekte/${x.projectId}/punkte?punkt=${x.id}` })),
    ...data.defects
      .filter((d) => ids.has(d.projectId) && (!project || d.projectId === project) && mine(d.ownerId ? [d.ownerId] : []) && recent(d.status, d.closedAt))
      .map((d): Card => ({ key: d.id, kind: "mangel", id: d.id, title: d.title, sub: `${defectNo(d.no)}${d.location ? ` · ${d.location}` : ""}`, projectId: d.projectId, status: d.status, due: d.due, who: d.ownerId ? [d.ownerId] : [], href: `/projekte/${d.projectId}/maengel?mangel=${d.id}` }))
  ];
  const t = today();

  const move = (key: string, status: WorkStatus) => {
    setDrag("");
    setOver("");
    const c = cards.find((x) => x.key === key);
    if (!c || c.status === status) return;
    const p = data.projects.find((x) => x.id === c.projectId);
    if (!p || !canWork(data, p)) return notify("In diesem Projekt kannst du nichts ändern.");
    if (c.kind === "punkt") {
      const x = data.points.find((y) => y.id === c.id)!;
      if (status === "done" && p.settings.photoRequired && !x.attachments.some((a) => a.kind === "photo")) return notify("Dieses Projekt verlangt ein Foto zum Abschließen – im Punkt hinzufügen.");
      save("points", { ...x, status, doneBy: status === "done" ? data.meId : undefined, doneAt: status === "done" ? now() : undefined }, status === "done" ? `„${x.title}“ erledigt` : undefined);
    } else {
      const d = data.defects.find((y) => y.id === c.id)!;
      if (status === "done" && p.settings.defectApproval && p.managerId !== data.meId && p.createdBy !== data.meId) return notify("Mängel schließt in diesem Projekt die Projektleitung.");
      save("defects", { ...d, status, closedBy: status === "done" ? data.meId : undefined, closedAt: status === "done" ? now() : undefined }, status === "done" ? `Mangel ${defectNo(d.no)} behoben` : undefined);
    }
  };

  return (
    <>
      <PageHead kicker="Aufgaben" title="Dashboard" sub="Alle Punkte und Mängel als Board – Karte in die nächste Spalte ziehen ändert den Status.">
        <Seg value={scope} onChange={setScope} options={[{ value: "mine", label: "Meine" }, { value: "team", label: "Mein Team" }]} />
        <select className="select-sm" value={project} onChange={(e) => setProject(e.target.value)} aria-label="Projekt">
          <option value="">Alle Projekte</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </PageHead>
      <div className="board three">
        {COLS.map((col) => {
          const list = cards.filter((c) => c.status === col.key).sort((a, b) => (a.due || "9").localeCompare(b.due || "9"));
          return (
            <section key={col.key} className={`board-col st-${col.key} ${over === col.key ? "over" : ""}`} onDragOver={(e) => drag && (e.preventDefault(), setOver(col.key))} onDragLeave={() => over === col.key && setOver("")} onDrop={(e) => (e.preventDefault(), move(drag, col.key))}>
              <header>
                <strong>{col.label}</strong>
                <em>{list.length}</em>
                {col.key === "done" && <small>letzte 7 Tage</small>}
              </header>
              {list.map((c) => {
                const p = data.projects.find((x) => x.id === c.projectId);
                return (
                  <article
                    key={c.key}
                    className={`board-card ${drag === c.key ? "dragging" : ""}`}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", c.title);
                      setTimeout(() => setDrag(c.key));
                    }}
                    onDragEnd={() => (setDrag(""), setOver(""))}
                  >
                    <span className="board-kind">
                      {c.kind === "mangel" ? <AlertTriangle size={13} /> : <ClipboardList size={13} />}
                      <i style={{ background: p?.color }} />
                      {p?.name}
                    </span>
                    <Link href={c.href}>
                      <strong>{c.title}</strong>
                    </Link>
                    {c.sub && <small>{c.sub}</small>}
                    <div className="board-meta">
                      {c.due && <span className={c.status !== "done" && c.due < t ? "bad" : ""}>{c.due === t ? "heute" : fmtShort(c.due)}</span>}
                      <span className="grow" />
                      {c.who.slice(0, 3).map((w) => (
                        <Avatar key={w} id={w} size={20} />
                      ))}
                      {!c.who.length && <span className="muted">{personName(data, "") || "offen"}</span>}
                    </div>
                  </article>
                );
              })}
              {!list.length && <p className="board-empty">Nichts hier.</p>}
            </section>
          );
        })}
      </div>
    </>
  );
}
