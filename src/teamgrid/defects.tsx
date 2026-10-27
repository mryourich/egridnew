"use client";

import { Camera, FileDown, Plus, Trash2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { addDays, today } from "@/core/date";
import { defectNo, fmtShort, fmtStamp, PRIORITY, WORK_STATUS } from "@/core/format";
import { byRole, teamOf } from "@/core/roles";
import { now, personName, uid, useStore } from "@/core/store";
import type { Data, Defect, OpenPoint, Priority, Project, WorkStatus } from "@/core/types";
import { Button, Empty, Field, Menu, Modal, PageHead, People, SearchBox, Seg, Tag } from "@/core/ui";
import { Attachments } from "./attachments";
import { access, pathLabel } from "./model";

type Filter = "offen" | "done" | "alle";

/** A fresh defect – optionally from an open point. */
export function newDefect(data: Data, p: Project, from?: OpenPoint): Defect {
  const points = data.points.filter((x) => x.projectId === p.id);
  return {
    id: "",
    projectId: p.id,
    no: 0,
    openPointId: from?.id ?? "",
    title: from ? `Mangel: ${from.title}` : "",
    description: "",
    location: from ? pathLabel(points, from.parentId) : "",
    ownerId: from?.assigneeIds[0] ?? "",
    priority: "medium",
    status: "open",
    due: addDays(today(), 7),
    attachments: [],
    createdBy: data.meId,
    createdAt: ""
  };
}

/** All defects of a project: report, assign, fix, close. */
export function Defects({ project: p }: { project: Project }) {
  const { data, remove } = useStore();
  const params = useSearchParams();
  const { work, manage } = access(data, p);
  const [filter, setFilter] = useState<Filter>("offen");
  const [prio, setPrio] = useState<Priority | "">("");
  const [owner, setOwner] = useState("");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Defect | null>(null);
  const all = data.defects.filter((d) => d.projectId === p.id);
  const wanted = params.get("mangel");
  useEffect(() => {
    const d = wanted && data.defects.find((x) => x.id === wanted);
    if (d) setEditing(d);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wanted]);

  const t = today();
  const term = q.trim().toLowerCase();
  const list = all
    .filter((d) => (filter === "alle" || (filter === "done" ? d.status === "done" : d.status !== "done")) && (!prio || d.priority === prio) && (!owner || d.ownerId === owner) && (!term || `${d.title} ${d.description} ${d.location} ${defectNo(d.no)}`.toLowerCase().includes(term)))
    .sort((a, b) => Number(a.status === "done") - Number(b.status === "done") || ["high", "medium", "low"].indexOf(a.priority) - ["high", "medium", "low"].indexOf(b.priority) || (a.due || "9").localeCompare(b.due || "9"));
  const owners = [...new Set(all.map((d) => d.ownerId).filter(Boolean))];

  return (
    <div className="page">
      <PageHead kicker="Mängel" title="Mängel" sub={`${all.filter((d) => d.status !== "done").length} offen · ${all.filter((d) => d.status === "done").length} behoben`}>
        <a href={`/druck/maengel/${p.id}`} target="_blank" rel="noreferrer" className="b-btn default md">
          <FileDown size={15} /> Mängelbericht
        </a>
        {work && (
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => setEditing(newDefect(data, p))}>
            Mangel erfassen
          </Button>
        )}
      </PageHead>

      <div className="toolbar">
        <SearchBox value={q} onChange={setQ} placeholder="Mangel, Ort, Nummer…" />
        <Seg<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: "offen", label: <>Offen <small>{all.filter((d) => d.status !== "done").length}</small></> },
            { value: "done", label: <>Behoben <small>{all.filter((d) => d.status === "done").length}</small></> },
            { value: "alle", label: <>Alle <small>{all.length}</small></> }
          ]}
        />
        <select className="select-sm" value={prio} onChange={(e) => setPrio(e.target.value as Priority | "")} aria-label="Priorität">
          <option value="">Alle Prioritäten</option>
          {(["high", "medium", "low"] as Priority[]).map((x) => (
            <option key={x} value={x}>
              {PRIORITY[x].label}
            </option>
          ))}
        </select>
        <select className="select-sm" value={owner} onChange={(e) => setOwner(e.target.value)} aria-label="Zuständig">
          <option value="">Alle Zuständigen</option>
          {owners.map((id) => (
            <option key={id} value={id}>
              {personName(data, id)}
            </option>
          ))}
        </select>
      </div>

      {list.length === 0 ? (
        <Empty title={all.length ? "Kein Mangel in dieser Ansicht." : "Noch keine Mängel."} action={work && !all.length ? <Button variant="primary" icon={<Plus size={15} />} onClick={() => setEditing(newDefect(data, p))}>Ersten Mangel erfassen</Button> : undefined}>
          {!all.length && "Mängel erfasst man hier oder direkt bei einem offenen Punkt – mit Foto, Ort und Frist."}
        </Empty>
      ) : (
        <div className="panel">
          <table className="table rows-click">
            <thead>
              <tr>
                <th className="w-no">Nr.</th>
                <th>Mangel</th>
                <th>Priorität</th>
                <th>Status</th>
                <th className="hide-sm">Zuständig</th>
                <th className="hide-sm">Frist</th>
                <th className="num hide-md">Fotos</th>
                <th className="w-menu" />
              </tr>
            </thead>
            <tbody>
              {list.map((d) => (
                <tr key={d.id} onClick={() => setEditing(d)} className={d.status === "done" ? "done" : ""}>
                  <td className="w-no mono">{defectNo(d.no)}</td>
                  <td>
                    <strong>{d.title}</strong>
                    {d.location && <small className="sub">{d.location}</small>}
                  </td>
                  <td>
                    <Tag tone={PRIORITY[d.priority].tone}>{PRIORITY[d.priority].label}</Tag>
                  </td>
                  <td>
                    <Tag tone={WORK_STATUS[d.status].tone} dot>
                      {WORK_STATUS[d.status].label}
                    </Tag>
                  </td>
                  <td className="hide-sm">
                    <People ids={d.ownerId ? [d.ownerId] : []} />
                  </td>
                  <td className={`hide-sm nowrap ${d.status !== "done" && d.due && d.due < t ? "bad" : ""}`}>{d.due ? fmtShort(d.due) : "–"}</td>
                  <td className="num hide-md">{d.attachments.filter((a) => a.kind === "photo").length || <span className="muted">–</span>}</td>
                  <td className="w-menu" onClick={(e) => e.stopPropagation()}>
                    <Menu items={[{ label: "Löschen", icon: <Trash2 size={14} />, danger: true, disabled: !manage, onClick: () => window.confirm(`${defectNo(d.no)} „${d.title}“ löschen?`) && remove("defects", d.id, `Mangel ${defectNo(d.no)} gelöscht`) }]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && <DefectEditor project={p} defect={editing.id ? (data.defects.find((x) => x.id === editing.id) ?? editing) : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

/** Report or work on one defect. */
export function DefectEditor({ project: p, defect, onClose }: { project: Project; defect: Defect; onClose: () => void }) {
  const { data, save, notify } = useStore();
  const { work, manage } = access(data, p);
  const isNew = !defect.id;
  const [v, setV] = useState(defect);
  const set = <K extends keyof Defect>(k: K, value: Defect[K]) => setV((x) => ({ ...x, [k]: value }));
  const points = data.points.filter((x) => x.projectId === p.id);
  const team = teamOf(p)
    .map((id) => data.people.find((x) => x.id === id))
    .filter((x): x is NonNullable<typeof x> => !!x && x.active)
    .sort(byRole);
  // with "approval" on, the project management closes defects – the others report them fixed
  const mayClose = manage || !p.settings.defectApproval;
  const statusOptions = (Object.keys(WORK_STATUS) as WorkStatus[]).filter((s) => s !== "done" || mayClose || v.status === "done");

  const submit = () => {
    if (!v.title.trim()) return;
    const no = isNew ? Math.max(0, ...data.defects.filter((d) => d.projectId === p.id).map((d) => d.no)) + 1 : v.no;
    const closing = v.status === "done" && defect.status !== "done";
    const item: Defect = { ...v, id: v.id || uid(), no, title: v.title.trim(), closedBy: closing ? data.meId : v.status === "done" ? v.closedBy : undefined, closedAt: closing ? now() : v.status === "done" ? v.closedAt : undefined };
    save("defects", item, isNew ? `Mangel ${defectNo(no)} „${item.title}“ gemeldet` : closing ? `Mangel ${defectNo(no)} behoben` : `Mangel ${defectNo(no)} geändert`);
    notify(isNew ? `${defectNo(no)} gemeldet` : "Gespeichert");
    onClose();
  };

  return (
    <Modal
      kicker={isNew ? (v.openPointId ? "Mangel aus offenem Punkt" : "Neuer Mangel") : `${defectNo(v.no)} · ${p.name}`}
      title={isNew ? "Mangel erfassen" : v.title}
      onClose={onClose}
      wide
      footer={
        <>
          {!isNew && v.status !== "done" && mayClose && (
            <Button onClick={() => setV((x) => ({ ...x, status: "done" }))} disabled={!work}>
              Als behoben markieren
            </Button>
          )}
          <span className="grow" />
          <Button variant="ghost" onClick={onClose}>
            Abbrechen
          </Button>
          <Button variant="primary" onClick={submit} disabled={!work || !v.title.trim()}>
            {isNew ? "Mangel melden" : "Speichern"}
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Titel *" className="span-2">
          <input autoFocus={isNew} value={v.title} onChange={(e) => set("title", e.target.value)} placeholder="z. B. Konsole lose an Achse 14" disabled={!work} />
        </Field>
        <Field label="Beschreibung" className="span-2">
          <textarea rows={3} value={v.description} onChange={(e) => set("description", e.target.value)} disabled={!work} placeholder="Was ist falsch, was ist zu tun?" />
        </Field>
        <Field label="Ort">
          <input value={v.location} onChange={(e) => set("location", e.target.value)} placeholder="Geschoß, Raum, Achse" disabled={!work} />
        </Field>
        <Field label="Offener Punkt">
          <select value={v.openPointId} onChange={(e) => set("openPointId", e.target.value)} disabled={!work}>
            <option value="">– keiner –</option>
            {points
              .filter((x) => x.type === "task")
              .map((x) => (
                <option key={x.id} value={x.id}>
                  {pathLabel(points, x.id)}
                </option>
              ))}
          </select>
        </Field>
        <Field label="Priorität">
          <select value={v.priority} onChange={(e) => set("priority", e.target.value as Priority)} disabled={!work}>
            {(["high", "medium", "low"] as Priority[]).map((x) => (
              <option key={x} value={x}>
                {PRIORITY[x].label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Status" hint={!mayClose ? "Behoben setzt die Projektleitung." : undefined}>
          <select value={v.status} onChange={(e) => set("status", e.target.value as WorkStatus)} disabled={!work}>
            {statusOptions.map((s) => (
              <option key={s} value={s}>
                {s === "done" ? "Behoben" : WORK_STATUS[s].label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Zuständig">
          <select value={v.ownerId} onChange={(e) => set("ownerId", e.target.value)} disabled={!work}>
            <option value="">– offen –</option>
            {team.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Frist">
          <input type="date" value={v.due} onChange={(e) => set("due", e.target.value)} disabled={!work} />
        </Field>
        <div className="b-field span-2">
          <span className="b-label">
            <Camera size={13} /> Fotos und Dateien
          </span>
          <Attachments value={v.attachments} editable={work} onChange={(attachments) => set("attachments", attachments)} />
        </div>
        {!isNew && (
          <p className="trail span-2">
            Gemeldet von {personName(data, v.createdBy) || "–"} am {fmtStamp(v.createdAt)}
            {v.updatedAt && ` · geändert von ${personName(data, v.updatedBy ?? "")} am ${fmtStamp(v.updatedAt)}`}
            {v.closedAt && ` · behoben am ${fmtStamp(v.closedAt)}`}
          </p>
        )}
      </div>
    </Modal>
  );
}
