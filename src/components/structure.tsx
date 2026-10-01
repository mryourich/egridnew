"use client";

import { AlertTriangle, ChevronDown, Copy, ChevronRight, Folder, FolderOpen, Pencil, Plus, Trash2, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { fmt, fmtShort, today } from "@/lib/date";
import * as L from "@/lib/labels";
import { childrenOf, isArea, nodeStatus, pathOf, pointsUnder } from "@/lib/site";
import { canDelete, employeeName, isManager, projectTeam, uid, useStore } from "@/lib/store";
import type { NodeStatus, Project, SiteNode } from "@/lib/types";
import { NODE_LABELS, Trail } from "./trail";
import { IssueButton } from "./issue-sheet";
import { EmpAvatar } from "./person";
import { useEditor } from "./shell";
import { PhotoAddButton, Thumbs } from "./site";
import { Empty, Portal, SearchInput } from "./ui";

type Menu = { x: number; y: number; node: SiteNode };

/** Assigns a point and logs it, so the person finds it under "Meine Aufgaben" on the start page. */
function assignPoint(save: ReturnType<typeof useStore>["save"], data: ReturnType<typeof useStore>["data"], node: SiteNode, id: string) {
  save("siteNodes", { ...node, assigneeId: id }, id ? `${node.title} → ${employeeName(data, id)} zugewiesen` : `${node.title}: Zuweisung entfernt`);
}

/** Open points: area tree on the left, checkable points on the right – everything inline, details in a side panel. */
export function SiteStructure({ project }: { project: Project }) {
  const { data, save, remove, notify } = useStore();
  const manager = isManager(data);
  const nodes = useMemo(() => data.siteNodes.filter((n) => n.projectId === project.id), [data.siteNodes, project.id]);
  const [area, setArea] = useState("all");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [openPoint, setOpenPoint] = useState("");
  const [adding, setAdding] = useState<string | null>(null);
  const [renaming, setRenaming] = useState("");
  const [menu, setMenu] = useState<Menu | null>(null);
  const [query, setQuery] = useState("");
  // ?punkt=<id> opens a point directly (e.g. from "Meine Aufgaben")
  const punkt = useSearchParams().get("punkt");
  useEffect(() => {
    const n = punkt && nodes.find((x) => x.id === punkt);
    if (!n) return;
    setOpenPoint(n.id);
    if (n.parentId) setArea(n.parentId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [punkt]);

  const selected = nodes.find((n) => n.id === area);
  const scope = selected ? pointsUnder(nodes, selected.id) : nodes.filter((n) => !isArea(nodes, n));
  const q = query.trim().toLowerCase();
  const visible = scope.filter((n) => !q || `${n.title} ${n.description}`.toLowerCase().includes(q));
  const open = visible.filter((n) => n.status !== "erledigt");
  const done = visible.filter((n) => n.status === "erledigt");
  const scopeIds = new Set(scope.map((n) => n.id));
  const openIssues = data.issues.filter((i) => i.projectId === project.id && i.status !== "erledigt" && (!selected || (i.nodeId && (scopeIds.has(i.nodeId) || pathOf(nodes, i.nodeId).some((p) => p.id === selected.id)))));
  const doneCount = scope.filter((n) => n.status === "erledigt").length;
  const pct = scope.length ? Math.round((doneCount / scope.length) * 100) : 0;

  // Groups: the area itself plus every sub-area that holds points directly.
  const groups = useMemo(() => {
    const roots = selected ? [selected] : childrenOf(nodes, "").filter((n) => isArea(nodes, n));
    const out: SiteNode[] = [];
    const walk = (n: SiteNode) => {
      out.push(n);
      for (const k of childrenOf(nodes, n.id)) if (isArea(nodes, k)) walk(k);
    };
    roots.forEach(walk);
    return out;
  }, [nodes, selected]);
  const looseRoots = !selected ? childrenOf(nodes, "").filter((n) => !isArea(nodes, n)) : [];
  // groups that actually show (pure container areas are skipped) – numbered 1, 2, 3 …
  const shownGroups = groups.filter((g) => {
    const own = childrenOf(nodes, g.id).filter((n) => !isArea(nodes, n) && n.status !== "erledigt");
    return !(childrenOf(nodes, g.id).some((k) => isArea(nodes, k)) && own.length === 0 && g !== selected);
  });

  const toggle = (id: string) =>
    setCollapsed((c) => {
      const n = new Set(c);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const addArea = (parentId: string, title: string) => {
    const id = uid("n");
    save("siteNodes", { id, projectId: project.id, parentId, title, description: "", status: "offen", assigneeId: "", due: "", order: Date.now(), kind: "area" }, `Bereich ${title} angelegt`);
    if (parentId) setCollapsed((c) => new Set([...c].filter((x) => x !== parentId)));
    return id;
  };

  const addPoint = (parentId: string, title: string) =>
    save("siteNodes", { id: uid("n"), projectId: project.id, parentId, title, description: "", status: "offen", assigneeId: "", due: "", order: Date.now(), kind: "point" }, `Punkt ${title} angelegt`);

  const setStatus = (n: SiteNode, status: NodeStatus) => {
    save("siteNodes", { ...n, status }, `${n.title}: ${nodeStatus[status].label}`);
    if (status === "erledigt") notify(`„${n.title}“ erledigt ✓`);
  };

  const countPoints = (id: string) => pointsUnder(nodes, id).length;

  /** Copies an area with all sub-areas and points (as open, unassigned) right below the original. */
  const duplicate = (src: SiteNode) => {
    const base = Date.now();
    let n = 0;
    const copy = (node: SiteNode, parentId: string, top: boolean): string => {
      const id = uid("n");
      save(
        "siteNodes",
        {
          id,
          projectId: project.id,
          parentId,
          title: top ? `${node.title} (Kopie)` : node.title,
          description: node.description,
          status: "offen",
          assigneeId: "",
          due: "",
          order: top ? node.order + 0.5 : base + n++,
          kind: node.kind ?? (isArea(nodes, node) ? "area" : "point")
        },
        top ? `Bereich ${node.title} dupliziert` : undefined
      );
      for (const k of childrenOf(nodes, node.id)) copy(k, id, false);
      return id;
    };
    const id = copy(src, src.parentId, true);
    setArea(id);
    setRenaming(id);
    notify(`„${src.title}“ dupliziert – ${countPoints(src.id)} Punkte`);
  };

  const areaTree = (parentId: string, depth: number): React.ReactNode =>
    childrenOf(nodes, parentId)
      .filter((n) => isArea(nodes, n))
      .map((n) => {
        const subs = childrenOf(nodes, n.id).filter((k) => isArea(nodes, k));
        const isOpen = !collapsed.has(n.id);
        return (
          <li key={n.id}>
            <div
              className={`at-row ${area === n.id ? "on" : ""}`}
              style={{ paddingLeft: 6 + depth * 16 } as CSSProperties}
              onClick={() => setArea(n.id)}
              onDoubleClick={() => manager && setRenaming(n.id)}
              onContextMenu={(e) => {
                if (!manager) return;
                e.preventDefault();
                setMenu({ x: e.clientX, y: e.clientY, node: n });
              }}
            >
              <button
                type="button"
                className="at-toggle"
                aria-label={isOpen ? "Zuklappen" : "Aufklappen"}
                style={{ visibility: subs.length ? "visible" : "hidden" }}
                onClick={(e) => {
                  e.stopPropagation();
                  toggle(n.id);
                }}
              >
                {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
              {area === n.id ? <FolderOpen size={15} className="at-icon" /> : <Folder size={15} className="at-icon" />}
              {renaming === n.id ? (
                <InlineInput
                  initial={n.title}
                  onDone={(v) => {
                    if (v && v !== n.title) save("siteNodes", { ...n, title: v });
                    setRenaming("");
                  }}
                />
              ) : (
                <span className="at-title">
                  {n.title}
                  <small>
                    {pointsUnder(nodes, n.id).filter((x) => x.status === "erledigt").length}/{countPoints(n.id)}
                  </small>
                  <span className="bar at-bar">
                    <i style={{ width: `${countPoints(n.id) ? (pointsUnder(nodes, n.id).filter((x) => x.status === "erledigt").length / countPoints(n.id)) * 100 : 0}%` }} />
                  </span>
                </span>
              )}
              {manager && (
                <button
                  type="button"
                  className="at-add"
                  title="Unterbereich hinzufügen"
                  onClick={(e) => {
                    e.stopPropagation();
                    setAdding(n.id);
                  }}
                >
                  <Plus size={14} />
                </button>
              )}
            </div>
            {adding === n.id && (
              <div className="at-new" style={{ paddingLeft: 28 + depth * 16 }}>
                <InlineInput
                  placeholder="Unterbereich + Enter"
                  keepOpen
                  onDone={(v) => {
                    if (v) addArea(n.id, v);
                    else setAdding(null);
                  }}
                />
              </div>
            )}
            {isOpen && subs.length > 0 && <ul>{areaTree(n.id, depth + 1)}</ul>}
          </li>
        );
      });

  const point = nodes.find((n) => n.id === openPoint);

  return (
    <div className="op">
      <aside className="op-areas card">
        <header>
          <span>Bereiche</span>
          {manager && (
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => setAdding("")}>
              <Plus size={14} /> Bereich
            </button>
          )}
        </header>
        <ul className="area-tree">
          <li>
            <div className={`at-row at-all ${area === "all" ? "on" : ""}`} onClick={() => setArea("all")}>
              <span className="at-title">
                Alle Punkte <small>{nodes.filter((n) => !isArea(nodes, n)).length}</small>
              </span>
            </div>
          </li>
          {adding === "" && (
            <li className="at-new">
              <InlineInput
                placeholder="Neuer Bereich + Enter"
                keepOpen
                onDone={(v) => {
                  if (v) setArea(addArea("", v));
                  else setAdding(null);
                }}
              />
            </li>
          )}
          {areaTree("", 0)}
        </ul>
        {!nodes.some((n) => isArea(nodes, n)) && <p className="muted small op-hint">Lege links einen Bereich an, z. B. „Erdgeschoß“ oder „Querschlag 56“. Punkte kommen rechts dazu.</p>}
      </aside>

      <section className="op-main">
        <header className="op-head">
          <div>
            <span className="op-kicker">Checkliste</span>
            <h2>{selected ? selected.title : "Alle Punkte"}</h2>
            {selected && pathOf(nodes, selected.id).length > 1 && (
              <small className="muted">
                {pathOf(nodes, selected.id)
                  .slice(0, -1)
                  .map((p) => p.title)
                  .join(" › ")}
              </small>
            )}
          </div>
          <SearchInput value={query} onChange={setQuery} placeholder="Punkt suchen…" />
        </header>

        <div className="op-kpis">
          <div className="op-kpi op-total">
            <span className="ring" style={{ "--p": pct } as CSSProperties}>
              <i>{pct}%</i>
            </span>
            <span>
              <strong>
                {doneCount} / {scope.length}
              </strong>
              <small>Punkte erledigt</small>
            </span>
          </div>
          <div className="op-kpi">
            <i className="kdot" style={{ background: "#1463ff" }} />
            <span>
              <strong>{scope.filter((n) => n.status === "offen").length}</strong>
              <small>Offen</small>
            </span>
          </div>
          <div className="op-kpi">
            <i className="kdot" style={{ background: "#f59e0b" }} />
            <span>
              <strong>{scope.filter((n) => n.status === "in_arbeit").length}</strong>
              <small>In Arbeit</small>
            </span>
          </div>
          <div className="op-kpi">
            <i className="kdot" style={{ background: "#ef4444" }} />
            <span>
              <strong>{openIssues.length}</strong>
              <small>Mängel</small>
            </span>
          </div>
          <div className="op-kpi">
            <i className="kdot" style={{ background: "#ef4444" }} />
            <span>
              <strong>{scope.filter((n) => n.status !== "erledigt" && n.due && n.due < today()).length}</strong>
              <small>Überfällig</small>
            </span>
          </div>
        </div>

        <div className="card card-flush op-list">
          <div className="op-row op-th">
            <span />
            <span>Punkt</span>
            <span>Status</span>
            <span>Verantwortlich</span>
            <span>Fällig am</span>
            <span>Mängel</span>
            <span>Fotos</span>
          </div>
          {groups.length === 0 && looseRoots.length === 0 && <Empty>{manager ? "Noch keine Bereiche – links „+ Bereich“." : "Noch keine Punkte."}</Empty>}
          {looseRoots.filter((n) => n.status !== "erledigt" && (!q || n.title.toLowerCase().includes(q))).map((n) => (
            <PointRow key={n.id} node={n} project={project} onOpen={setOpenPoint} onStatus={setStatus} />
          ))}
          {groups.map((g) => {
            const own = childrenOf(nodes, g.id).filter((n) => !isArea(nodes, n) && open.includes(n));
            const all = childrenOf(nodes, g.id).filter((n) => !isArea(nodes, n));
            const fin = all.filter((n) => n.status === "erledigt").length;
            const container = childrenOf(nodes, g.id).some((k) => isArea(nodes, k));
            // pure container areas only show up when they hold points or are selected themselves
            if (container && own.length === 0 && g !== selected) return null;
            const showHead = groups.length > 1;
            return (
              <div key={g.id} className="op-group">
                {showHead && (
                  <button type="button" className="op-group-head" onClick={() => setArea(g.id)}>
                    <span
                      className="og-title"
                      title={pathOf(nodes, g.id)
                        .map((p) => p.title)
                        .join(" › ")}
                    >
                      {shownGroups.indexOf(g) + 1}. {g.title}
                    </span>
                    <small>
                      {fin}/{all.length} erledigt
                    </small>
                    <span className="bar og-bar">
                      <i style={{ width: `${all.length ? (fin / all.length) * 100 : 0}%` }} />
                    </span>
                  </button>
                )}
                {own.map((n) => (
                  <PointRow key={n.id} node={n} project={project} onOpen={setOpenPoint} onStatus={setStatus} />
                ))}
                {manager && <AddPointRow onAdd={(title) => addPoint(g.id, title)} />}
              </div>
            );
          })}
          <div className="op-foot">
            {open.length} offene von {visible.length} Punkten
          </div>
        </div>

        {done.length > 0 && (
          <details className="card card-flush op-done">
            <summary>
              <ChevronRight size={15} /> Erledigte Punkte ({done.length})
            </summary>
            {done.map((n) => (
              <PointRow key={n.id} node={n} project={project} onOpen={setOpenPoint} onStatus={setStatus} />
            ))}
          </details>
        )}
      </section>

      {point && <PointPanel node={point} nodes={nodes} project={project} onClose={() => setOpenPoint("")} onStatus={setStatus} />}

      {menu && (
        <Portal>
          <div className="ctx-backdrop" onMouseDown={() => setMenu(null)} onContextMenu={(e) => (e.preventDefault(), setMenu(null))} />
          <div className="ctx-menu" style={{ left: menu.x, top: menu.y }}>
            <button type="button" onClick={() => (setRenaming(menu.node.id), setMenu(null))}>
              <Pencil size={14} /> Umbenennen
            </button>
            <button type="button" onClick={() => (setAdding(menu.node.id), setMenu(null))}>
              <Plus size={14} /> Unterbereich
            </button>
            <button type="button" onClick={() => (duplicate(menu.node), setMenu(null))}>
              <Copy size={14} /> Duplizieren
            </button>
            {canDelete(data) && (
              <button
                type="button"
                className="danger"
                onClick={() => {
                  setMenu(null);
                  if (!window.confirm(`Bereich „${menu.node.title}“ mit allen Punkten, Fotos und Unterbereichen löschen?`)) return;
                  remove("siteNodes", menu.node.id, `Bereich ${menu.node.title} gelöscht`);
                  if (area === menu.node.id) setArea("all");
                }}
              >
                <Trash2 size={14} /> Löschen
              </button>
            )}
          </div>
        </Portal>
      )}
    </div>
  );
}

function InlineInput({ initial = "", placeholder, keepOpen, onDone }: { initial?: string; placeholder?: string; keepOpen?: boolean; onDone: (v: string) => void }) {
  const [v, setV] = useState(initial);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);
  return (
    <input
      ref={ref}
      className="inline-input"
      value={v}
      placeholder={placeholder}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => onDone(keepOpen ? "" : v.trim())}
      onKeyDown={(e) => {
        if (e.key === "Escape") onDone(keepOpen ? "" : initial);
        if (e.key === "Enter") {
          onDone(v.trim());
          if (keepOpen) setV("");
        }
      }}
    />
  );
}

function AddPointRow({ onAdd }: { onAdd: (title: string) => void }) {
  const [editing, setEditing] = useState(false);
  if (!editing)
    return (
      <button type="button" className="op-add" onClick={() => setEditing(true)}>
        <Plus size={14} /> Punkt hinzufügen
      </button>
    );
  return (
    <div className="op-add editing">
      <Plus size={14} />
      <InlineInput
        placeholder="Punkt eingeben + Enter (Esc beendet)"
        keepOpen
        onDone={(v) => {
          if (v) onAdd(v);
          else setEditing(false);
        }}
      />
    </div>
  );
}

function PointRow({ node, project, onOpen, onStatus }: { node: SiteNode; project: Project; onOpen: (id: string) => void; onStatus: (n: SiteNode, s: NodeStatus) => void }) {
  const { data, save } = useStore();
  const team = projectTeam(data, project);
  const photos = data.photos.filter((p) => p.nodeId === node.id).sort((a, b) => b.takenAt.localeCompare(a.takenAt));
  const issues = data.issues.filter((i) => i.nodeId === node.id && i.status !== "erledigt").length;
  const overdue = !!node.due && node.due < today() && node.status !== "erledigt";
  const assign = (id: string) => assignPoint(save, data, node, id);
  const next: Record<NodeStatus, NodeStatus> = { offen: "in_arbeit", in_arbeit: "erledigt", erledigt: "offen" };
  const pill = node.status === "erledigt" ? ["green", "Erledigt"] : overdue ? ["red", "Überfällig"] : node.status === "in_arbeit" ? ["blue", "In Arbeit"] : ["gray", "Offen"];
  const who = node.assigneeId ? data.employees.find((e) => e.id === node.assigneeId) : undefined;
  return (
    <div className={`op-row ${node.status === "erledigt" ? "done" : ""}`} onClick={() => onOpen(node.id)}>
      <span onClick={(e) => e.stopPropagation()}>
        <input type="checkbox" className="tree-check" checked={node.status === "erledigt"} onChange={(e) => onStatus(node, e.target.checked ? "erledigt" : "offen")} aria-label="Erledigt" />
      </span>
      <span className="op-title">
        <strong>{node.title}</strong>
        {node.status === "erledigt" && <Trail item={node} labels={NODE_LABELS} compact />}
      </span>
      <span className="op-status" onClick={(e) => e.stopPropagation()}>
        <button type="button" className={`pill pill-${pill[0]}`} title="Klick = nächster Status" onClick={() => onStatus(node, next[node.status])}>
          {pill[1]}
        </button>
      </span>
      <span className="op-assignee" onClick={(e) => e.stopPropagation()}>
        {node.assigneeId ? <EmpAvatar id={node.assigneeId} size={24} /> : <span className="avatar nz">–</span>}
        <span className="op-who">{who?.name ?? "Nicht zugewiesen"}</span>
        <select value={node.assigneeId} onChange={(e) => assign(e.target.value)} aria-label="Zugewiesen">
          <option value="">Nicht zugewiesen</option>
          {team.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
      </span>
      <span className={`op-due ${overdue ? "late" : ""}`}>{node.due ? fmt(node.due) : "–"}</span>
      <span className="op-defect" onClick={(e) => e.stopPropagation()}>
        {issues > 0 ? <em className="op-issues">{issues}</em> : <span className="op-zero">0</span>}
        <IssueButton projectId={project.id} nodeId={node.id} location={node.title} className="icon-btn op-defect-btn" label="Mangel" iconOnly />
      </span>
      <span className="op-attach" onClick={(e) => e.stopPropagation()}>
        {photos[0] && <img className="op-thumb" src={photos[0].dataUrl} alt="" />}
        {photos.length > 1 && <em>+{photos.length - 1}</em>}
        <PhotoAddButton projectId={project.id} nodeId={node.id} className="icon-btn" label="" />
      </span>
    </div>
  );
}

/** Side panel for one point; a click next to it closes it. */
function PointPanel({ node, nodes, project, onClose, onStatus }: { node: SiteNode; nodes: SiteNode[]; project: Project; onClose: () => void; onStatus: (n: SiteNode, s: NodeStatus) => void }) {
  const { data, save, remove, notify } = useStore();
  const openEditor = useEditor();
  const team = projectTeam(data, project);
  const photos = data.photos.filter((p) => p.nodeId === node.id).sort((a, b) => a.takenAt.localeCompare(b.takenAt));
  const issues = data.issues.filter((i) => i.nodeId === node.id);
  const jobs = data.jobs.filter((j) => j.nodeId === node.id).sort((a, b) => a.start.localeCompare(b.start));
  const path = pathOf(nodes, node.id).slice(0, -1);
  const set = (patch: Partial<SiteNode>) => save("siteNodes", { ...node, ...patch });

  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === "Escape" && !document.querySelector(".modal, .lightbox-backdrop, .sheet-backdrop") && onClose();
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);

  return (
    <Portal>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="drawer" aria-label={node.title}>
        <header className="drawer-head">
          <nav className="node-path">
            {path.map((p) => (
              <span key={p.id}>{p.title}</span>
            ))}
          </nav>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Schließen">
            <X size={18} />
          </button>
        </header>
        <div className="drawer-body">
          <input className="drawer-title" value={node.title} onChange={(e) => set({ title: e.target.value })} aria-label="Bezeichnung" />
          <div className="status-switch" role="group" aria-label="Status">
            {(Object.keys(nodeStatus) as NodeStatus[]).map((st) => (
              <button key={st} type="button" className={node.status === st ? `on tone-${nodeStatus[st].tone}` : ""} onClick={() => onStatus(node, st)}>
                {nodeStatus[st].label}
              </button>
            ))}
          </div>
          <div className="inline-fields">
            <label>
              <span>Zuständig</span>
              <select value={node.assigneeId} onChange={(e) => assignPoint(save, data, node, e.target.value)}>
                <option value="">Nicht zugewiesen</option>
                {team.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Fällig</span>
              <input type="date" value={node.due} onChange={(e) => set({ due: e.target.value })} />
            </label>
            <label className="full">
              <span>Beschreibung</span>
              <textarea rows={3} value={node.description} placeholder="Notizen, Hinweise…" onChange={(e) => set({ description: e.target.value })} />
            </label>
          </div>

          <section className="detail-section">
            <header>
              <h3>
                Fotos <span className="tab-count">{photos.length}</span>
              </h3>
              <PhotoAddButton projectId={project.id} nodeId={node.id} className="btn btn-sm btn-primary" label="Foto" />
            </header>
            {photos.length ? <Thumbs photos={photos} /> : <p className="muted small">Noch keine Fotos. Am Handy öffnet „Foto“ direkt die Kamera.</p>}
          </section>

          <section className="detail-section">
            <header>
              <h3>
                Mängel <span className="tab-count">{issues.filter((i) => i.status !== "erledigt").length}</span>
              </h3>
              <IssueButton projectId={project.id} nodeId={node.id} location={node.title} className="btn btn-sm" />
            </header>
            {issues.length ? (
              <ul className="compact-list">
                {issues.map((i) => (
                  <li key={i.id}>
                    <button type="button" onClick={() => openEditor({ kind: "issue", item: i })}>
                      <span className={`badge badge-${L.issueStatus[i.status].tone}`}>{L.issueStatus[i.status].label}</span>
                      <strong>{i.title}</strong>
                      <span className="muted">{fmtShort(i.due)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted small">
                <AlertTriangle size={12} /> Keine Mängel.
              </p>
            )}
          </section>

          {jobs.length > 0 && (
            <section className="detail-section">
              <header>
                <h3>
                  Aufgaben im Plan <span className="tab-count">{jobs.length}</span>
                </h3>
              </header>
              <ul className="sub-list">
                {jobs.map((j) => (
                  <li key={j.id}>
                    <span className="job-dot" style={{ background: j.color }} />
                    <span className={`job-line ${j.done ? "done" : ""}`}>
                      {j.title}
                      <small>
                        {employeeName(data, j.employeeId)} · {fmtShort(j.start)}
                        {j.end !== j.start ? `–${fmtShort(j.end)}` : ""}
                      </small>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="detail-section">
            <header>
              <h3>Verlauf</h3>
            </header>
            <Trail item={node} labels={NODE_LABELS} />
            {!node.createdTs && !node.history?.length && <p className="muted small">Noch keine Einträge.</p>}
          </section>

          {canDelete(data) && (
            <footer className="drawer-foot">
              <button
                type="button"
                className="btn btn-sm btn-danger-ghost"
                onClick={() => {
                  if (!window.confirm(`„${node.title}“ löschen?`)) return;
                  remove("siteNodes", node.id, `${node.title} gelöscht`);
                  notify("Gelöscht");
                  onClose();
                }}
              >
                <Trash2 size={13} /> Punkt löschen
              </button>
            </footer>
          )}
        </div>
      </aside>
    </Portal>
  );
}
