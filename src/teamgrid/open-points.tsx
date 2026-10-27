"use client";

import { AlertTriangle, Camera, Check, ChevronDown, ClipboardList, Copy, Download, FileCheck2, FileText, Filter, FolderKanban, Image as ImageIcon, Pencil, Plus, Search, Trash2, Upload, UsersRound, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type CSSProperties, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";
import { addDays, today } from "@/core/date";
import { download, readAttachment } from "@/core/files";
import { defectNo, fmtWhen, initials } from "@/core/format";
import { byRole, teamOf } from "@/core/roles";
import { now, personName, uid, useStore } from "@/core/store";
import type { Attachment, Defect, OpenPoint, PointType, Priority, Project, WorkStatus } from "@/core/types";
import { access, childrenOf, pathLabel, pathOf } from "./model";

/* eGrid "Open Points": areas › sections › subsections in the left menu, the points of the chosen part as a table. */

const TYPE: Record<PointType, { child?: PointType; createLabel: string; label: string }> = {
  area: { child: "section", createLabel: "Unterbereich", label: "Bereich" },
  section: { child: "subsection", createLabel: "Abschnitt", label: "Unterbereich" },
  subsection: { child: "task", createLabel: "Punkt", label: "Abschnitt" },
  task: { createLabel: "Punkt", label: "Punkt" }
};
const STATUS_LABEL: Record<WorkStatus, string> = { open: "Offen", in_progress: "In Arbeit", done: "Erledigt" };
const PRIO_LABEL: Record<Priority, string> = { high: "Hoch", medium: "Mittel", low: "Niedrig" };
const EXPANDED_KEY = "vysner:op-collapsed";
const CLIP_KEY = "vysner:op-clip";

/** Ids of a point and everything below it. */
function branchIds(points: OpenPoint[], id: string) {
  const ids = new Set([id]);
  for (let grew = true; grew; ) {
    grew = false;
    for (const p of points) if (!ids.has(p.id) && ids.has(p.parentId)) (ids.add(p.id), (grew = true));
  }
  return ids;
}

/** Points (leaves of type task) below a node. */
function tasksBelow(points: OpenPoint[], id: string): OpenPoint[] {
  return childrenOf(points, id).flatMap((x) => (x.type === "task" ? [x] : tasksBelow(points, x.id)));
}

/** The selected part from the address (?bereich=), or the first area. */
function useScope(points: OpenPoint[]) {
  const params = useSearchParams();
  const wanted = params.get("bereich") ?? "";
  const roots = childrenOf(points, "").filter((x) => x.type !== "task");
  const scope = points.find((x) => x.id === wanted && x.type !== "task") ?? roots[0];
  return scope;
}

function useNavigate() {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  return (patch: Record<string, string | null>) => {
    const q = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) q.set(k, v);
      else q.delete(k);
    }
    const s = q.toString();
    router.replace(`${path}${s ? `?${s}` : ""}`, { scroll: false });
  };
}

/** Copy, paste, duplicate a branch of the structure. */
function useStructureActions(project: Project) {
  const { data, save, remove, notify } = useStore();
  const points = data.points.filter((x) => x.projectId === project.id);

  const cloneBranch = (sourceId: string, parentId: string, suffix: string) => {
    const ids = branchIds(points, sourceId);
    const map = new Map([...ids].map((id) => [id, uid()]));
    const maxOrder = Math.max(0, ...points.map((x) => x.order));
    let n = 0;
    for (const x of points.filter((y) => ids.has(y.id))) {
      save("points", {
        ...x,
        id: map.get(x.id)!,
        parentId: x.id === sourceId ? parentId : map.get(x.parentId) ?? x.parentId,
        title: x.id === sourceId ? `${x.title}${suffix}` : x.title,
        status: x.type === "task" ? "open" : x.status,
        doneBy: undefined,
        doneAt: undefined,
        order: maxOrder + ++n,
        attachments: x.attachments.map((a) => ({ ...a, id: uid() })),
        createdBy: data.meId,
        createdAt: now(),
        updatedBy: undefined,
        updatedAt: undefined
      });
    }
    return map.get(sourceId)!;
  };

  return {
    copy(id: string) {
      try {
        window.sessionStorage.setItem(CLIP_KEY, id);
      } catch {
        // without storage nothing can be pasted later
      }
      const x = points.find((y) => y.id === id);
      navigator.clipboard?.writeText(pathLabel(points, id)).catch(() => undefined);
      notify(`Kopiert: ${x?.title ?? ""}`);
    },
    clip() {
      try {
        return window.sessionStorage.getItem(CLIP_KEY) ?? "";
      } catch {
        return "";
      }
    },
    paste(targetId: string) {
      const source = data.points.find((y) => y.id === this.clip());
      const target = points.find((y) => y.id === targetId);
      if (!source || !target) return notify("Bitte zuerst einen Open Point kopieren.");
      // the first place on the way up where this kind of entry fits
      const path = pathOf(points, targetId).reverse();
      const parent = source.type === "area" ? null : [target, ...path].find((x) => TYPE[x.type].child === source.type || (source.type === "task" && x.type !== "task"));
      if (source.type !== "area" && !parent) return notify("An dieser Stelle kann dieser Open Point nicht eingefügt werden.");
      cloneBranch(source.id, parent?.id ?? "", " Kopie");
      notify("Open Point eingefügt");
    },
    duplicate(id: string) {
      const x = points.find((y) => y.id === id);
      if (!x) return;
      cloneBranch(id, x.parentId, " Kopie");
      notify(`${x.title} dupliziert`);
    },
    remove(id: string) {
      const x = points.find((y) => y.id === id);
      if (!x) return false;
      const count = branchIds(points, id).size - 1;
      if (!window.confirm(`Soll „${x.title}“${count ? ` und ${count} Untereinträge` : ""} wirklich gelöscht werden?`)) return false;
      remove("points", id, `„${x.title}“ gelöscht`);
      return true;
    }
  };
}

/* ------------------------------------------------------------------ the page */

export function OpenPoints({ project }: { project: Project }) {
  const { data, save, notify } = useStore();
  const params = useSearchParams();
  const go = useNavigate();
  const { work, manage } = access(data, project);
  const points = data.points.filter((x) => x.projectId === project.id);
  const scope = useScope(points);
  const [query, setQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [onlyMine, setOnlyMine] = useState(false);
  const [defectFor, setDefectFor] = useState("");
  const [preview, setPreview] = useState<Attachment | null>(null);
  const editing = points.find((x) => x.id === params.get("punkt"));

  // a point from a link: show its part of the structure
  useEffect(() => {
    if (editing && editing.type === "task" && editing.parentId && params.get("bereich") !== editing.parentId) go({ bereich: editing.parentId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing?.id]);

  const projectDefects = data.defects.filter((d) => d.projectId === project.id);
  const withDefect = new Set(projectDefects.filter((d) => d.status !== "done" && d.openPointId).map((d) => d.openPointId));
  const tasks = points.filter((x) => x.type === "task");
  const scopeTasks = scope ? tasksBelow(points, scope.id) : tasks;
  const term = query.trim().toLowerCase();
  const filtered = scopeTasks.filter(
    (x) =>
      (!onlyMine || x.assigneeIds.includes(data.meId)) &&
      (!term ||
        [pathLabel(points, x.id), x.description, STATUS_LABEL[x.status], ...x.assigneeIds.map((id) => personName(data, id)), ...x.attachments.map((a) => a.name)]
          .join(" ")
          .toLowerCase()
          .includes(term))
  );
  const active = filtered.filter((x) => x.status !== "done");
  const completed = filtered.filter((x) => x.status === "done");
  const doneCount = tasks.filter((x) => x.status === "done").length;
  const pct = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;

  const setStatus = (x: OpenPoint, status: WorkStatus) => {
    if (status === x.status) return;
    if (status === "done" && project.settings.photoRequired && !x.attachments.some((a) => a.kind === "photo")) {
      notify("Für dieses Projekt braucht ein erledigter Punkt ein Foto.");
      go({ punkt: x.id });
      return;
    }
    save("points", { ...x, status, doneBy: status === "done" ? data.meId : undefined, doneAt: status === "done" ? now() : undefined }, status === "done" ? `„${x.title}“ erledigt` : undefined);
  };
  const addPoint = (title: string) => {
    if (!scope) return notify("Bitte zuerst links einen Bereich anlegen.");
    const order = Math.max(0, ...points.map((x) => x.order)) + 1;
    save("points", { id: uid(), projectId: project.id, parentId: scope.id, type: "task", title, description: "", status: "open", assigneeIds: [], due: "", order, attachments: [], createdBy: data.meId, createdAt: now() }, `Punkt „${title}“ angelegt`);
  };

  return (
    <div className="progress-page">
      <header className="progress-compact-header">
        <div>
          <span>Open Points</span>
          <h2>{scope ? scope.title : "Open Points"}</h2>
          <p>{scope ? pathLabel(points, scope.parentId) || project.name : project.name}</p>
        </div>
        <div className="progress-compact-actions">
          <button aria-expanded={showSearch} aria-label="Suche öffnen" title="Suche" type="button" onClick={() => setShowSearch((v) => !v)}>
            <Search size={16} />
          </button>
          <button aria-label="Nur meine" title={onlyMine ? "Alle Punkte zeigen" : "Nur meine Punkte"} type="button" className={onlyMine ? "on" : ""} onClick={() => setOnlyMine((v) => !v)}>
            <Filter size={16} />
          </button>
          <a aria-label="Liste drucken" title="Offene-Punkte-Liste als PDF" href={`/druck/punkte/${project.id}`} target="_blank" rel="noreferrer">
            <FileText size={16} />
          </a>
        </div>
      </header>

      {showSearch && (
        <label className="progress-inline-search">
          <Search size={17} />
          <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Suche in Bereich, Punkt, Person, Anhang ..." />
        </label>
      )}

      <div className="progress-workspace">
        <section className="progress-compact-stats">
          <div className="progress-mini-progress">
            <CircularProgress value={pct} />
            <div>
              <span>Gesamt</span>
              <strong>
                {doneCount}/{tasks.length}
              </strong>
            </div>
          </div>
          <MiniStat label="Offen" tone="blue" value={tasks.filter((x) => x.status === "open").length} />
          <MiniStat label="In Arbeit" tone="amber" value={tasks.filter((x) => x.status === "in_progress").length} />
          <MiniStat label="Mangel" tone="red" value={tasks.filter((x) => withDefect.has(x.id)).length} />
          <MiniStat label="Erledigt" tone="green" value={doneCount} />
        </section>

        <PointTable
          items={active}
          total={scopeTasks.length}
          withDefect={withDefect}
          work={work}
          manage={manage}
          onAdd={manage && scope ? addPoint : undefined}
          onEdit={(id) => go({ punkt: id })}
          onDefect={setDefectFor}
          onPreview={setPreview}
          onStatus={setStatus}
          empty={!scope ? "Noch keine Bereiche – links mit „+ Bereich“ anlegen." : undefined}
        />

        <section className="completed-table-panel">
          <button className="completed-progress-toggle table-style" type="button" onClick={() => setShowDone((v) => !v)}>
            <ChevronDown size={16} className={showDone ? "open" : ""} />
            <span>Erledigte Punkte ({completed.length})</span>
          </button>
          {showDone && <PointTable items={completed} total={scopeTasks.length} withDefect={withDefect} work={work} manage={manage} variant="completed" onEdit={(id) => go({ punkt: id })} onDefect={setDefectFor} onPreview={setPreview} onStatus={setStatus} />}
        </section>
      </div>

      {editing && <PointEditor project={project} item={editing} onClose={() => go({ punkt: null })} onDefect={setDefectFor} onPreview={setPreview} />}
      {defectFor && <DefectFromPoint project={project} pointId={defectFor} onClose={() => setDefectFor("")} onPreview={setPreview} />}
      {preview && <AttachmentPreview a={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}

function MiniStat({ label, tone, value }: { label: string; tone: string; value: number }) {
  return (
    <article className={`progress-mini-stat ${tone}`}>
      <span />
      <small>{label}</small>
      <strong>{value}</strong>
    </article>
  );
}

function CircularProgress({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="circular-progress" style={{ "--progress-angle": `${v * 3.6}deg` } as CSSProperties} aria-label={`${v} Prozent`}>
      <span>{v}%</span>
    </div>
  );
}

function PointTable({
  items,
  total,
  withDefect,
  work,
  manage,
  variant = "active",
  empty,
  onAdd,
  onEdit,
  onDefect,
  onPreview,
  onStatus
}: {
  items: OpenPoint[];
  total: number;
  withDefect: Set<string>;
  work: boolean;
  manage: boolean;
  variant?: "active" | "completed";
  empty?: string;
  onAdd?: (title: string) => void;
  onEdit: (id: string) => void;
  onDefect: (id: string) => void;
  onPreview: (a: Attachment) => void;
  onStatus: (x: OpenPoint, s: WorkStatus) => void;
}) {
  const [adding, setAdding] = useState(false);
  if (!items.length && !onAdd)
    return (
      <section className="progress-table-card empty">
        <div className="progress-empty table-empty">
          <ClipboardList size={18} />
          <strong>{empty ?? `Keine ${variant === "completed" ? "erledigten" : "offenen"} Punkte in dieser Auswahl.`}</strong>
          <small>Wähle links einen anderen Bereich.</small>
        </div>
      </section>
    );

  return (
    <section className="progress-table-card">
      <div className="progress-table-scroll">
        <div className="progress-table-grid progress-table-header">
          <span />
          <span>Titel</span>
          <span>Status</span>
          <span>Zugewiesen</span>
          <span>Anhänge</span>
          <span>Mangel</span>
          <span />
        </div>
        {items.map((x) => (
          <PointRow key={x.id} item={x} hasDefect={withDefect.has(x.id)} work={work} manage={manage} onEdit={onEdit} onDefect={onDefect} onPreview={onPreview} onStatus={onStatus} />
        ))}
        {!items.length && (
          <div className="progress-empty table-empty inline">
            <strong>{empty ?? "Keine offenen Punkte in dieser Auswahl."}</strong>
          </div>
        )}
        {onAdd &&
          (adding ? (
            <div className="progress-table-grid progress-add-row editing">
              <span />
              <AddInput
                onAdd={onAdd}
                onClose={() => setAdding(false)}
              />
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
          ) : (
            <button className="progress-table-grid progress-add-row" type="button" onClick={() => setAdding(true)}>
              <span />
              <span className="progress-add-row-label">
                <Plus size={14} />
                Punkt hinzufügen
              </span>
              <span />
              <span />
              <span />
              <span />
              <span />
            </button>
          ))}
      </div>
      <div className="progress-table-footer">
        <span>
          {items.length} von {total} Punkten sichtbar
        </span>
      </div>
    </section>
  );
}

/** Type a point, Enter adds it and keeps the line open for the next; clicking elsewhere saves and closes. */
function AddInput({ onAdd, onClose }: { onAdd: (title: string) => void; onClose: () => void }) {
  const [v, setV] = useState("");
  return (
    <input
      autoFocus
      className="progress-add-input"
      value={v}
      placeholder="Neuer Punkt – Enter speichert, nächster Punkt folgt"
      onChange={(e) => setV(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && v.trim()) (onAdd(v.trim()), setV(""));
        if (e.key === "Escape") onClose();
      }}
      onBlur={() => {
        if (v.trim()) onAdd(v.trim());
        onClose();
      }}
    />
  );
}

function PointRow({ item, hasDefect, work, manage, onEdit, onDefect, onPreview, onStatus }: { item: OpenPoint; hasDefect: boolean; work: boolean; manage: boolean; onEdit: (id: string) => void; onDefect: (id: string) => void; onPreview: (a: Attachment) => void; onStatus: (x: OpenPoint, s: WorkStatus) => void }) {
  const { data, save } = useStore();
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(item.title);
  const statusClass = item.status === "done" ? "done" : item.status === "in_progress" ? "in-progress" : "open";
  const who = item.assigneeIds.map((id) => personName(data, id)).filter(Boolean);
  const commit = () => {
    const t = draft.trim();
    if (t && t !== item.title) save("points", { ...item, title: t });
    else setDraft(item.title);
    setRenaming(false);
  };
  const late = item.status !== "done" && item.due && item.due < today();

  return (
    <div className={`progress-table-grid progress-table-row ${item.status === "done" ? "done" : ""}`}>
      <div className="progress-table-check">
        <input checked={item.status === "done"} disabled={!work} aria-label={`${item.title} erledigt`} onChange={() => onStatus(item, item.status === "done" ? "open" : "done")} type="checkbox" />
      </div>

      <div className="progress-table-title">
        <span className="row-handle" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
        </span>
        {renaming ? (
          <input
            autoFocus
            className="progress-table-title-input"
            style={{ width: `${Math.max(10, draft.length + 2)}ch` }}
            value={draft}
            onBlur={commit}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") (setDraft(item.title), setRenaming(false));
            }}
          />
        ) : (
          <button className="progress-table-title-button" type="button" onClick={() => (manage ? setRenaming(true) : onEdit(item.id))}>
            {item.title}
            {item.due && <em className={`op-due ${late ? "late" : ""}`}>{late ? "überfällig" : `bis ${item.due.slice(8, 10)}.${item.due.slice(5, 7)}.`}</em>}
          </button>
        )}
      </div>

      <div className={`progress-status-control ${statusClass}`}>
        <span />
        <select value={item.status} disabled={!work} onChange={(e) => onStatus(item, e.target.value as WorkStatus)}>
          {(Object.keys(STATUS_LABEL) as WorkStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>

      <div className="progress-assignee" title={who.join(", ")}>
        <span className="assignee-avatar">{who.length ? initials(who[0]) : "?"}</span>
        <span>
          {who[0] ?? "Nicht zugewiesen"}
          {who.length > 1 && <em> +{who.length - 1}</em>}
        </span>
      </div>

      <div className="progress-attachment-cell">
        {item.attachments.length ? (
          <button type="button" onClick={() => onPreview(item.attachments[0])}>
            <FileCheck2 size={14} />
            {item.attachments.length}
          </button>
        ) : (
          <span>-</span>
        )}
      </div>

      <div className="progress-defect-cell">
        <button aria-label={hasDefect ? "Offenen Mangel bearbeiten" : "Mangel erstellen"} className={hasDefect ? "active" : ""} type="button" disabled={!work} onClick={() => onDefect(item.id)}>
          {hasDefect ? <AlertTriangle size={16} /> : "Mangel erstellen"}
        </button>
      </div>

      <button className="progress-row-menu" type="button" aria-label={`${item.title} bearbeiten`} onClick={() => onEdit(item.id)}>
        ...
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ editor */

function PointEditor({ project, item, onClose, onDefect, onPreview }: { project: Project; item: OpenPoint; onClose: () => void; onDefect: (id: string) => void; onPreview: (a: Attachment) => void }) {
  const { data, save, notify } = useStore();
  const { work, manage } = access(data, project);
  const actions = useStructureActions(project);
  const team = teamOf(project)
    .map((id) => data.people.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => !!p && p.active)
    .sort(byRole);
  const openDefects = data.defects.filter((d) => d.openPointId === item.id && d.status !== "done").length;
  const set = (patch: Partial<OpenPoint>, activity?: string) => save("points", { ...item, ...patch }, activity);
  const attach = async (files: FileList | null) => {
    if (!files?.length) return;
    const added: Attachment[] = [];
    for (const f of Array.from(files)) {
      try {
        added.push(await readAttachment(f, data.meId));
      } catch (e) {
        notify(e instanceof Error ? e.message : "Datei konnte nicht gelesen werden.");
      }
    }
    if (added.length) (set({ attachments: [...added, ...item.attachments] }, added.length > 1 ? `${added.length} Anhänge zu „${item.title}“` : `Anhang zu „${item.title}“`), notify(added.some((a) => a.kind === "photo") ? "Foto hinzugefügt" : "Datei hinzugefügt"));
  };
  const setStatus = (status: WorkStatus) => {
    if (status === "done" && project.settings.photoRequired && !item.attachments.some((a) => a.kind === "photo")) return notify("Zuerst ein Foto hinzufügen – das Projekt verlangt ein Foto zum Abschließen.");
    set({ status, doneBy: status === "done" ? data.meId : undefined, doneAt: status === "done" ? now() : undefined }, status === "done" ? `„${item.title}“ erledigt` : undefined);
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section className="modal-panel progress-modal-panel" role="dialog" aria-modal="true">
        <button className="modal-close" type="button" onClick={onClose} aria-label="Schließen">
          <X size={16} />
        </button>
        <span>{TYPE[item.type].label}</span>
        <h2>Eintrag bearbeiten</h2>
        <p className="op-path">{pathLabel(data.points, item.parentId) || project.name}</p>

        <div className="progress-editor-grid">
          <label className="editor-field">
            <span>Titel</span>
            <input key={item.title} defaultValue={item.title} disabled={!manage} onBlur={(e) => e.target.value.trim() && e.target.value.trim() !== item.title && set({ title: e.target.value.trim() })} />
          </label>

          <label className="editor-field">
            <span>Beschreibung / Details</span>
            <textarea key={item.description} defaultValue={item.description} disabled={!work} onBlur={(e) => e.target.value !== item.description && set({ description: e.target.value })} placeholder="Details, Hinweise oder nächste Schritte..." />
          </label>

          {item.type === "task" && (
            <div className="editor-status-row">
              <label className="editor-field">
                <span>Status</span>
                <select value={item.status} disabled={!work} onChange={(e) => setStatus(e.target.value as WorkStatus)}>
                  {(Object.keys(STATUS_LABEL) as WorkStatus[]).map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="editor-field">
                <span>Fällig</span>
                <input type="date" value={item.due} disabled={!manage} onChange={(e) => set({ due: e.target.value })} />
              </label>
              <label className="editor-checkline">
                <input checked={item.status === "done"} disabled={!work} onChange={() => setStatus(item.status === "done" ? "open" : "done")} type="checkbox" />
                Erledigt
              </label>
            </div>
          )}

          <div className="editor-section">
            <span>Benutzer zuweisen</span>
            <div className="assignee-grid">
              {team.map((p) => {
                const on = item.assigneeIds.includes(p.id);
                return (
                  <button className={on ? "selected" : ""} key={p.id} type="button" disabled={!manage} onClick={() => set({ assigneeIds: on ? item.assigneeIds.filter((x) => x !== p.id) : [...item.assigneeIds, p.id] })}>
                    <UsersRound size={13} />
                    {p.name}
                  </button>
                );
              })}
              {!team.length && <small className="empty-attachments">Noch niemand im Projektteam.</small>}
            </div>
          </div>

          <div className="editor-section">
            <span>
              Anhänge{project.settings.photoRequired && item.type === "task" ? " · Foto zum Abschließen nötig" : ""}
            </span>
            {work && (
              <div className="attachment-actions">
                <label className="upload-action">
                  <ImageIcon size={14} />
                  Foto hinzufügen
                  <input accept="image/*" multiple type="file" onChange={(e) => (attach(e.currentTarget.files), (e.currentTarget.value = ""))} />
                </label>
                <label className="upload-action">
                  <Camera size={14} />
                  Kamera
                  <input accept="image/*" capture="environment" type="file" onChange={(e) => (attach(e.currentTarget.files), (e.currentTarget.value = ""))} />
                </label>
                <label className="upload-action">
                  <Upload size={14} />
                  Datei hinzufügen
                  <input type="file" multiple onChange={(e) => (attach(e.currentTarget.files), (e.currentTarget.value = ""))} />
                </label>
              </div>
            )}
            <AttachmentList list={item.attachments} onPreview={onPreview} onRemove={work ? (id) => set({ attachments: item.attachments.filter((a) => a.id !== id) }) : undefined} />
          </div>

          <p className="op-trail">
            Angelegt von {personName(data, item.createdBy) || "–"} · {fmtWhen(item.createdAt)}
            {item.doneAt && ` · erledigt von ${personName(data, item.doneBy ?? "")} ${fmtWhen(item.doneAt)}`}
          </p>
        </div>

        <div className="modal-actions progress-modal-actions">
          {manage && (
            <button className="danger-action" type="button" onClick={() => actions.remove(item.id) && onClose()}>
              <Trash2 size={15} />
              Löschen
            </button>
          )}
          {item.type === "task" && work && (
            <button className={`secondary-action defect-action ${openDefects ? "has-open-defect" : ""}`} type="button" onClick={() => onDefect(item.id)}>
              <AlertTriangle size={15} />
              {openDefects ? "Mangel" : "Mangel erstellen"}
            </button>
          )}
          <button className="primary-action" type="button" onClick={onClose}>
            Fertig
          </button>
        </div>
      </section>
    </div>
  );
}

function AttachmentList({ list, onPreview, onRemove }: { list: Attachment[]; onPreview: (a: Attachment) => void; onRemove?: (id: string) => void }) {
  if (!list.length) return <small className="empty-attachments">Noch keine Anhänge.</small>;
  return (
    <div className="attachment-list">
      {list.map((a) => (
        <div className="attachment-item-wrap" key={a.id}>
          <button className="attachment-item" type="button" onClick={() => onPreview(a)}>
            <span className="attachment-thumb">{a.kind === "photo" ? <img src={a.url} alt={a.name} /> : <FileText size={13} />}</span>
            <strong>{a.name}</strong>
            <small>
              {a.kind === "photo" ? "Foto" : "Datei"} - {fmtWhen(a.addedAt)}
            </small>
          </button>
          {onRemove && (
            <button className="attachment-remove" type="button" aria-label="Anhang entfernen" onClick={() => window.confirm(`„${a.name}“ entfernen?`) && onRemove(a.id)}>
              <X size={13} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

/** eGrid defect dialog: a defect straight from an open point. */
function DefectFromPoint({ project, pointId, onClose, onPreview }: { project: Project; pointId: string; onClose: () => void; onPreview: (a: Attachment) => void }) {
  const { data, save, notify } = useStore();
  const { manage } = access(data, project);
  const points = data.points.filter((x) => x.projectId === project.id);
  const point = points.find((x) => x.id === pointId);
  const existing = data.defects.find((d) => d.openPointId === pointId && d.status !== "done");
  const team = teamOf(project)
    .map((id) => data.people.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => !!p && p.active)
    .sort(byRole);
  const [v, setV] = useState<Defect>(
    existing ?? {
      id: "",
      projectId: project.id,
      no: 0,
      openPointId: pointId,
      title: `Mangel: ${point?.title ?? ""}`,
      description: point?.description ?? "",
      location: pathLabel(points, point?.parentId ?? ""),
      ownerId: point?.assigneeIds[0] ?? data.meId,
      priority: "medium",
      status: "open",
      due: addDays(today(), 7),
      attachments: [],
      createdBy: data.meId,
      createdAt: ""
    }
  );
  const set = (patch: Partial<Defect>) => setV((x) => ({ ...x, ...patch }));
  // with approval on, only the project management closes defects
  const mayClose = manage || !project.settings.defectApproval;
  const attach = async (files: FileList | null) => {
    if (!files?.length) return;
    const added: Attachment[] = [];
    for (const f of Array.from(files)) {
      try {
        added.push(await readAttachment(f, data.meId));
      } catch (e) {
        notify(e instanceof Error ? e.message : "Datei konnte nicht gelesen werden.");
      }
    }
    setV((x) => ({ ...x, attachments: [...added, ...x.attachments] }));
  };
  const submit = () => {
    if (!v.title.trim()) return notify("Bitte einen Mangeltitel eingeben.");
    const isNew = !v.id;
    const no = isNew ? Math.max(0, ...data.defects.filter((d) => d.projectId === project.id).map((d) => d.no)) + 1 : v.no;
    const closing = v.status === "done" && existing?.status !== "done";
    save("defects", { ...v, id: v.id || uid(), no, title: v.title.trim(), createdAt: v.createdAt || now(), closedBy: closing ? data.meId : v.closedBy, closedAt: closing ? now() : v.closedAt }, isNew ? `Mangel ${defectNo(no)} „${v.title.trim()}“ gemeldet` : `Mangel ${defectNo(no)} geändert`);
    notify(isNew ? `${defectNo(no)} mit „${point?.title}“ verknüpft` : "Mangel aktualisiert");
    onClose();
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section className="modal-panel progress-modal-panel defect-modal-panel" role="dialog" aria-modal="true">
        <button className="modal-close" type="button" onClick={onClose} aria-label="Schließen">
          <X size={16} />
        </button>
        <span>{existing ? defectNo(existing.no) : "Mangel aus Open Point"}</span>
        <h2>Mangel bearbeiten</h2>
        <p>{pathLabel(points, pointId)}</p>

        <div className="progress-editor-grid">
          <label className="editor-field">
            <span>Titel</span>
            <input autoFocus value={v.title} onChange={(e) => set({ title: e.target.value })} />
          </label>
          <label className="editor-field">
            <span>Beschreibung</span>
            <textarea value={v.description} onChange={(e) => set({ description: e.target.value })} />
          </label>
          <div className="editor-status-row four">
            <label className="editor-field">
              <span>Status</span>
              <select value={v.status} onChange={(e) => set({ status: e.target.value as WorkStatus })}>
                {(Object.keys(STATUS_LABEL) as WorkStatus[])
                  .filter((s) => s !== "done" || mayClose || v.status === "done")
                  .map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </option>
                  ))}
              </select>
            </label>
            <label className="editor-field">
              <span>Priorität</span>
              <select value={v.priority} onChange={(e) => set({ priority: e.target.value as Priority })}>
                {(Object.keys(PRIO_LABEL) as Priority[]).map((p) => (
                  <option key={p} value={p}>
                    {PRIO_LABEL[p]}
                  </option>
                ))}
              </select>
            </label>
            <label className="editor-field">
              <span>Zuständig</span>
              <select value={v.ownerId} onChange={(e) => set({ ownerId: e.target.value })}>
                <option value="">– offen –</option>
                {team.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="editor-field">
              <span>Frist</span>
              <input type="date" value={v.due} onChange={(e) => set({ due: e.target.value })} />
            </label>
          </div>

          <div className="editor-section">
            <span>Foto und Dateien</span>
            <div className="attachment-actions">
              <label className="upload-action">
                <ImageIcon size={14} />
                Foto hinzufügen
                <input accept="image/*" multiple type="file" onChange={(e) => (attach(e.currentTarget.files), (e.currentTarget.value = ""))} />
              </label>
              <label className="upload-action">
                <Camera size={14} />
                Kamera
                <input accept="image/*" capture="environment" type="file" onChange={(e) => (attach(e.currentTarget.files), (e.currentTarget.value = ""))} />
              </label>
              <label className="upload-action">
                <Upload size={14} />
                Datei hinzufügen
                <input type="file" multiple onChange={(e) => (attach(e.currentTarget.files), (e.currentTarget.value = ""))} />
              </label>
            </div>
            <AttachmentList list={v.attachments} onPreview={onPreview} onRemove={(id) => set({ attachments: v.attachments.filter((a) => a.id !== id) })} />
          </div>
        </div>

        <div className="modal-actions progress-modal-actions">
          <button className="secondary-action" type="button" onClick={onClose}>
            Abbrechen
          </button>
          <button className="primary-action" type="button" onClick={submit}>
            Mangel speichern
          </button>
        </div>
      </section>
    </div>
  );
}

export function AttachmentPreview({ a, onClose }: { a: Attachment; onClose: () => void }) {
  const pdf = a.mime === "application/pdf";
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section className="modal-panel attachment-preview-panel" role="dialog" aria-modal="true">
        <button className="modal-close" type="button" onClick={onClose} aria-label="Schließen">
          <X size={16} />
        </button>
        <span>{a.kind === "photo" ? "Foto" : "Datei"}</span>
        <h2>{a.name}</h2>
        <div className="attachment-preview-stage">
          {a.kind === "photo" ? (
            <img src={a.url} alt={a.name} />
          ) : pdf ? (
            <iframe src={a.url} title={a.name} />
          ) : (
            <div className="file-preview-placeholder">
              <FileText size={28} />
              <strong>{a.name}</strong>
              <small>Vorschau für diesen Dateityp ist eingeschränkt.</small>
            </div>
          )}
        </div>
        <div className="modal-actions">
          <button className="secondary-action" type="button" onClick={() => download(a)}>
            <Download size={15} /> Herunterladen
          </button>
          <button className="primary-action" type="button" onClick={onClose}>
            Schließen
          </button>
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ left menu: the structure */

/** eGrid "Open Points Menü" in the sidebar: areas, sections, subsections – create inline, right click for more. */
export function ProgressSidebar({ project }: { project: Project }) {
  const { data, save } = useStore();
  const go = useNavigate();
  const { manage } = access(data, project);
  const actions = useStructureActions(project);
  const points = data.points.filter((x) => x.projectId === project.id);
  const scope = useScope(points);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [draftParent, setDraftParent] = useState<string | null | undefined>(undefined);
  const [draft, setDraft] = useState("");
  const [menu, setMenu] = useState<{ item: OpenPoint; x: number; y: number } | null>(null);

  useEffect(() => {
    try {
      setCollapsed(JSON.parse(window.sessionStorage.getItem(EXPANDED_KEY) ?? "{}"));
    } catch {
      // all open
    }
  }, []);
  const toggle = (id: string) =>
    setCollapsed((c) => {
      const next = { ...c, [id]: !c[id] };
      try {
        window.sessionStorage.setItem(EXPANDED_KEY, JSON.stringify(next));
      } catch {
        // only for this page view
      }
      return next;
    });
  const kids = (id: string) => childrenOf(points, id).filter((x) => x.type !== "task");
  const activePath = new Set(scope ? pathOf(points, scope.id).map((x) => x.id) : []);

  const create = (parentId: string | null, title: string) => {
    const parent = parentId ? points.find((x) => x.id === parentId) : undefined;
    const type: PointType = parent ? TYPE[parent.type].child ?? "task" : "area";
    const id = uid();
    save("points", { id, projectId: project.id, parentId: parentId ?? "", type, title, description: "", status: "open", assigneeIds: [], due: "", order: Math.max(0, ...points.map((x) => x.order)) + 1, attachments: [], createdBy: data.meId, createdAt: now() }, `${TYPE[type].label} „${title}“ angelegt`);
    if (parentId) setCollapsed((c) => ({ ...c, [parentId]: false }));
    go({ bereich: id, punkt: null });
  };
  const submitDraft = () => {
    const t = draft.trim();
    if (t && draftParent !== undefined) create(draftParent, t);
    setDraftParent(undefined);
    setDraft("");
  };
  const openMenu = (item: OpenPoint, e: ReactMouseEvent) => {
    e.preventDefault();
    go({ bereich: item.id });
    setMenu({ item, x: Math.max(8, Math.min(e.clientX, window.innerWidth - 204)), y: Math.max(8, Math.min(e.clientY, window.innerHeight - 200)) });
  };
  const run = (fn: (id: string) => void) => {
    if (!menu) return;
    const id = menu.item.id;
    setMenu(null);
    fn(id);
  };

  const renderDraft = (parentId: string | null, depth: number, label: string) =>
    draftParent === parentId ? (
      <form className={`progress-menu-draft level-${depth}`} onSubmit={(e) => (e.preventDefault(), submitDraft())}>
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={submitDraft}
          onKeyDown={(e) => e.key === "Escape" && (setDraftParent(undefined), setDraft(""))}
          placeholder={`${label} benennen`}
        />
        <button type="submit" aria-label="Speichern" disabled={!draft.trim()} onMouseDown={(e) => e.preventDefault()}>
          <Check size={13} />
        </button>
        <button type="button" aria-label="Abbrechen" onMouseDown={(e) => e.preventDefault()} onClick={() => (setDraftParent(undefined), setDraft(""))}>
          <X size={13} />
        </button>
      </form>
    ) : null;

  const renderItem = (item: OpenPoint, depth: number): ReactNode => {
    const children = kids(item.id);
    const open = !collapsed[item.id] || (activePath.has(item.id) && item.id !== scope?.id);
    const childType = TYPE[item.type].child;
    const count = tasksBelow(points, item.id);
    const done = count.filter((x) => x.status === "done").length;
    return (
      <div className="progress-menu-branch" key={item.id}>
        <div className={`progress-menu-row level-${depth} ${scope?.id === item.id ? "active" : ""}`} onContextMenu={(e) => openMenu(item, e)}>
          <button className={`progress-menu-expand ${open ? "open" : ""}`} disabled={!children.length} type="button" aria-label={children.length ? `${item.title} ${open ? "zuklappen" : "aufklappen"}` : "Keine Unterbereiche"} onClick={() => children.length && toggle(item.id)}>
            {children.length ? <ChevronDown size={14} /> : null}
          </button>
          <button className="progress-menu-main" type="button" onClick={() => go({ bereich: item.id, punkt: null })}>
            <span>{item.type === "area" ? <FolderKanban size={14} /> : item.type === "section" ? <FileText size={14} /> : <ClipboardList size={14} />}</span>
            <span>
              <strong>{item.title}</strong>
              <small>
                {count.length} Punkte{count.length ? ` · ${done} erledigt` : ""}
              </small>
            </span>
          </button>
          <div className="progress-menu-actions">
            {manage && childType && childType !== "task" && (
              <button className="progress-menu-add" type="button" aria-label={`${TYPE[item.type].createLabel} erstellen`} title={`${TYPE[item.type].createLabel} erstellen`} onClick={() => (setDraftParent(item.id), setDraft(""))}>
                <Plus size={13} />
              </button>
            )}
          </div>
        </div>
        {renderDraft(item.id, Math.min(depth + 1, 2), TYPE[item.type].createLabel)}
        {children.length > 0 && open ? children.map((c) => renderItem(c, Math.min(depth + 1, 2))) : null}
      </div>
    );
  };

  const roots = kids("");
  return (
    <aside className="progress-structure-menu sidebar-progress-structure" aria-label="Open Points Menü">
      <div className="progress-structure-head">
        <div>
          <span>Open Points Menü</span>
          <strong>Bereiche</strong>
        </div>
        {manage && (
          <button type="button" onClick={() => (setDraftParent(null), setDraft(""))}>
            <Plus size={14} />
            Bereich
          </button>
        )}
      </div>
      <div className="progress-menu-list">
        {renderDraft(null, 0, "Bereich")}
        {roots.map((x) => renderItem(x, 0))}
        {!roots.length && draftParent === undefined && (
          <div className="progress-menu-empty">
            <FolderKanban size={16} />
            <span>Noch keine Bereiche.</span>
          </div>
        )}
      </div>
      {menu && (
        <>
          <div className="progress-context-backdrop" onClick={() => setMenu(null)} onContextMenu={(e) => (e.preventDefault(), setMenu(null))} />
          <div className="progress-context-menu" style={{ left: menu.x, top: menu.y }}>
            <button type="button" onClick={() => run((id) => go({ bereich: id, punkt: id }))}>
              <Pencil size={14} />
              Bearbeiten
            </button>
            <button type="button" onClick={() => run(actions.copy)}>
              <Copy size={14} />
              Kopieren
            </button>
            {manage && (
              <>
                <button type="button" disabled={!actions.clip()} onClick={() => run((id) => actions.paste(id))}>
                  <ClipboardList size={14} />
                  Einfügen
                </button>
                <button type="button" onClick={() => run(actions.duplicate)}>
                  <Copy size={14} />
                  Duplizieren
                </button>
                <span className="progress-context-divider" />
                <button className="danger" type="button" onClick={() => run((id) => actions.remove(id) && go({ bereich: null }))}>
                  <Trash2 size={14} />
                  Löschen
                </button>
              </>
            )}
          </div>
        </>
      )}
    </aside>
  );
}
