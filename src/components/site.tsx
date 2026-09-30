"use client";

import { AlertTriangle, Camera, ChevronDown, ChevronLeft, ChevronRight, Download, ImagePlus, Pencil, Plus, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { fmt, fmtShort, today } from "@/lib/date";
import * as L from "@/lib/labels";
import { childrenOf, depthOf, levelName, nodeProgress, nodeStatus, pathLabel, pathOf, subtreeIds } from "@/lib/site";
import { employeeName, uid, useStore } from "@/lib/store";
import type { NodeStatus, Photo, Project, SiteNode } from "@/lib/types";
import { useEditor } from "./shell";
import { Avatar, Badge, downscale, Empty, Progress, SearchInput } from "./ui";

/* ---------------------------------------------------------------- Foto hinzufügen */

export function PhotoAddButton({ projectId, nodeId, label = "Foto", className = "btn" }: { projectId: string; nodeId: string; label?: string; className?: string }) {
  const { save, notify } = useStore();
  const input = useRef<HTMLInputElement>(null);

  const add = async (files: FileList | null) => {
    if (!files?.length) return;
    const list = Array.from(files);
    for (const file of list) {
      const dataUrl = await downscale(file, 1024);
      const now = new Date();
      const takenAt = `${today()}T${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      save("photos", { id: uid("f"), projectId, nodeId, dataUrl, caption: file.name.replace(/\.[^.]+$/, ""), takenAt, authorId: "e2" }, "Foto hinzugefügt");
    }
    notify(list.length > 1 ? `${list.length} Fotos gespeichert` : "Foto gespeichert");
    if (input.current) input.current.value = "";
  };

  return (
    <>
      <button type="button" className={className} onClick={() => input.current?.click()}>
        <Camera size={15} /> {label}
      </button>
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => add(e.target.files)} />
    </>
  );
}

/* ---------------------------------------------------------------- Lightbox */

export function PhotoLightbox({ photos, index, onClose }: { photos: Photo[]; index: number; onClose: () => void }) {
  const { data, save, remove } = useStore();
  const [i, setI] = useState(index);
  const photo = photos[i];

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setI((x) => Math.max(0, x - 1));
      if (e.key === "ArrowRight") setI((x) => Math.min(photos.length - 1, x + 1));
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [photos.length, onClose]);

  useEffect(() => {
    if (!photo) onClose();
  }, [photo, onClose]);
  if (!photo) return null;

  return (
    <div className="lightbox-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <button type="button" className="lb-close" onClick={onClose} aria-label="Schließen">
        <X size={22} />
      </button>
      {i > 0 && (
        <button type="button" className="lb-nav lb-prev" onClick={() => setI(i - 1)} aria-label="Vorheriges Foto">
          <ChevronLeft size={28} />
        </button>
      )}
      <figure className="lb-figure">
        <img src={photo.dataUrl} alt={photo.caption} />
        <figcaption>
          <input
            className="lb-caption"
            value={photo.caption}
            placeholder="Beschreibung…"
            onChange={(e) => save("photos", { ...photo, caption: e.target.value })}
          />
          <small>
            {photo.nodeId ? pathLabel(data.siteNodes, photo.nodeId) : "Ohne Bereich"} · {fmt(photo.takenAt.slice(0, 10))} {photo.takenAt.slice(11, 16)} · {employeeName(data, photo.authorId)} · {i + 1}/{photos.length}
          </small>
          <span className="lb-actions">
            <a className="btn btn-sm" href={photo.dataUrl} download={`${photo.caption || "foto"}.jpg`}>
              <Download size={14} /> Laden
            </a>
            <button
              type="button"
              className="btn btn-sm btn-danger-ghost"
              onClick={() => {
                if (!window.confirm("Foto löschen?")) return;
                remove("photos", photo.id, "Foto gelöscht");
                if (i >= photos.length - 1) setI(Math.max(0, i - 1));
              }}
            >
              <Trash2 size={14} /> Löschen
            </button>
          </span>
        </figcaption>
      </figure>
      {i < photos.length - 1 && (
        <button type="button" className="lb-nav lb-next" onClick={() => setI(i + 1)} aria-label="Nächstes Foto">
          <ChevronRight size={28} />
        </button>
      )}
    </div>
  );
}

function Thumbs({ photos }: { photos: Photo[] }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <>
      <div className="thumbs">
        {photos.map((p, i) => (
          <button key={p.id} type="button" className="thumb" onClick={() => setOpen(i)} title={p.caption}>
            <img src={p.dataUrl} alt={p.caption} loading="lazy" />
          </button>
        ))}
      </div>
      {open !== null && <PhotoLightbox photos={photos} index={open} onClose={() => setOpen(null)} />}
    </>
  );
}

/* ---------------------------------------------------------------- Struktur */

export function SiteStructure({ project }: { project: Project }) {
  const { data, save, notify } = useStore();
  const openEditor = useEditor();
  const nodes = useMemo(() => data.siteNodes.filter((n) => n.projectId === project.id), [data.siteNodes, project.id]);
  const [selectedId, setSelectedId] = useState<string>(() => childrenOf(nodes, "")[0]?.id ?? "");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [query, setQuery] = useState("");
  const t = today();
  const selected = nodes.find((n) => n.id === selectedId);

  const photoCount = (ids: string[]) => data.photos.filter((p) => ids.includes(p.nodeId)).length;
  const openIssues = (ids: string[]) => data.issues.filter((i) => i.nodeId && ids.includes(i.nodeId) && i.status !== "erledigt").length;

  // Flatten the tree in display order, honouring collapse, filter and search.
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const visibleBySearch = new Set<string>();
    if (q) {
      for (const n of nodes) {
        if (n.title.toLowerCase().includes(q)) for (const p of pathOf(nodes, n.id)) visibleBySearch.add(p.id);
      }
    }
    const out: { node: SiteNode; depth: number; hasKids: boolean }[] = [];
    const walk = (parentId: string, depth: number) => {
      for (const n of childrenOf(nodes, parentId)) {
        if (q && !visibleBySearch.has(n.id)) continue;
        if (onlyOpen && nodeProgress(nodes, n) === 100) continue;
        const hasKids = nodes.some((k) => k.parentId === n.id);
        out.push({ node: n, depth, hasKids });
        if (hasKids && (q || !collapsed.has(n.id))) walk(n.id, depth + 1);
      }
    };
    walk("", 0);
    return out;
  }, [nodes, collapsed, onlyOpen, query]);

  const toggle = (id: string) =>
    setCollapsed((c) => {
      const n = new Set(c);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const setStatus = (node: SiteNode, status: NodeStatus) => {
    save("siteNodes", { ...node, status }, `${node.title}: ${nodeStatus[status].label}`);
    notify(`${node.title}: ${nodeStatus[status].label}`);
  };

  const addChild = (parent?: SiteNode) => openEditor({ kind: "node", item: { projectId: project.id, parentId: parent?.id ?? "", assigneeId: parent?.assigneeId ?? "" } });

  const roots = childrenOf(nodes, "");
  const total = roots.length ? Math.round(roots.reduce((s, r) => s + nodeProgress(nodes, r), 0) / roots.length) : 0;

  return (
    <div className="site-layout">
      <section className="card card-flush site-tree">
        <div className="actionbar">
          <button type="button" className="action" onClick={() => addChild()}>
            <Plus size={15} /> Bereich
          </button>
          <button type="button" className="action" disabled={!selected} onClick={() => selected && addChild(selected)}>
            <Plus size={15} /> Unterpunkt
          </button>
          <span className="action-sep" />
          <button type="button" className="action" onClick={() => setCollapsed(new Set())}>
            Alle aufklappen
          </button>
          <button type="button" className="action" onClick={() => setCollapsed(new Set(nodes.filter((n) => !n.parentId).map((n) => n.id)))}>
            Zuklappen
          </button>
          <label className="check action-check">
            <input type="checkbox" checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} /> nur offene
          </label>
          <span className="spacer" />
          <SearchInput value={query} onChange={setQuery} placeholder="Punkt suchen…" />
        </div>
        <div className="tree-total">
          <span>Gesamtfortschritt</span>
          <Progress value={total} color={project.color} />
          <strong>{total} %</strong>
        </div>
        {rows.length === 0 ? (
          <Empty>{nodes.length ? "Keine Treffer." : "Noch keine Bereiche. Lege mit „+ Bereich“ den ersten an."}</Empty>
        ) : (
          <div className="table-wrap">
            <table className="table tree-table">
              <thead>
                <tr>
                  <th>Bezeichnung</th>
                  <th>Status</th>
                  <th className="w-progress">Fortschritt</th>
                  <th>Zuständig</th>
                  <th>Fällig</th>
                  <th className="num" title="Fotos">
                    <Camera size={13} />
                  </th>
                  <th className="num" title="Offene Mängel">
                    <AlertTriangle size={13} />
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ node, depth, hasKids }) => {
                  const ids = subtreeIds(nodes, node.id);
                  const progress = nodeProgress(nodes, node);
                  const overdue = node.due && node.due < t && progress < 100;
                  const photos = photoCount(ids);
                  const issues = openIssues(ids);
                  return (
                    <tr key={node.id} className={`clickable ${node.id === selectedId ? "selected" : ""} ${depth === 0 ? "tree-root" : ""}`} onClick={() => setSelectedId(node.id)}>
                      <td>
                        <span className="tree-cell" style={{ paddingLeft: depth * 20 }}>
                          {hasKids ? (
                            <button
                              type="button"
                              className="tree-toggle"
                              aria-label={collapsed.has(node.id) ? "Aufklappen" : "Zuklappen"}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggle(node.id);
                              }}
                            >
                              {collapsed.has(node.id) && !query ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
                            </button>
                          ) : (
                            <input
                              type="checkbox"
                              className="tree-check"
                              checked={node.status === "erledigt"}
                              aria-label="Erledigt"
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => setStatus(node, e.target.checked ? "erledigt" : "offen")}
                            />
                          )}
                          <span className={`tree-title ${node.status === "erledigt" && !hasKids ? "done" : ""}`}>{node.title}</span>
                          {hasKids && <small className="tree-level">{levelName(depth)}</small>}
                        </span>
                      </td>
                      <td>
                        <Badge tone={nodeStatus[progress === 100 ? "erledigt" : hasKids ? (progress > 0 ? "in_arbeit" : "offen") : node.status].tone}>
                          {nodeStatus[progress === 100 ? "erledigt" : hasKids ? (progress > 0 ? "in_arbeit" : "offen") : node.status].label}
                        </Badge>
                      </td>
                      <td>
                        <span className="cell-progress">
                          <Progress value={progress} color={progress === 100 ? "#10b981" : project.color} /> {progress} %
                        </span>
                      </td>
                      <td>{node.assigneeId ? employeeName(data, node.assigneeId) : <span className="muted">–</span>}</td>
                      <td className={overdue ? "text-red nowrap" : "nowrap"}>{node.due ? fmtShort(node.due) : <span className="muted">–</span>}</td>
                      <td className="num">{photos || <span className="muted">–</span>}</td>
                      <td className="num">{issues ? <Badge tone="red">{issues}</Badge> : <span className="muted">–</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <aside className="card site-detail">
        {selected ? (
          <NodeDetail node={selected} nodes={nodes} project={project} onStatus={setStatus} onAddChild={() => addChild(selected)} onDeleted={() => setSelectedId(selected.parentId || childrenOf(nodes, "").find((n) => n.id !== selected.id)?.id || "")} />
        ) : (
          <Empty>Wähle links einen Bereich oder Punkt.</Empty>
        )}
      </aside>
    </div>
  );
}

function NodeDetail({
  node,
  nodes,
  project,
  onStatus,
  onAddChild,
  onDeleted
}: {
  node: SiteNode;
  nodes: SiteNode[];
  project: Project;
  onStatus: (n: SiteNode, s: NodeStatus) => void;
  onAddChild: () => void;
  onDeleted: () => void;
}) {
  const { data, remove, notify } = useStore();
  const openEditor = useEditor();
  const ids = subtreeIds(nodes, node.id);
  const hasKids = ids.length > 1;
  const photos = data.photos.filter((p) => ids.includes(p.nodeId)).sort((a, b) => b.takenAt.localeCompare(a.takenAt));
  const issues = data.issues.filter((i) => i.nodeId && ids.includes(i.nodeId));
  const progress = nodeProgress(nodes, node);
  const path = pathOf(nodes, node.id);

  return (
    <div className="node-detail">
      <div className="node-path">{path.slice(0, -1).map((p) => p.title).join(" › ") || levelName(0)}</div>
      <h2>{node.title}</h2>
      <div className="row-inline wrap">
        <Badge tone="gray">{levelName(depthOf(nodes, node))}</Badge>
        {hasKids && (
          <span className="cell-progress">
            <Progress value={progress} color={project.color} /> {progress} %
          </span>
        )}
      </div>

      {!hasKids && (
        <div className="status-switch" role="group" aria-label="Status">
          {(Object.keys(nodeStatus) as NodeStatus[]).map((s) => (
            <button key={s} type="button" className={`${node.status === s ? `on tone-${nodeStatus[s].tone}` : ""}`} onClick={() => onStatus(node, s)}>
              {nodeStatus[s].label}
            </button>
          ))}
        </div>
      )}

      <dl className="fields">
        <dt>Zuständig</dt>
        <dd>
          {node.assigneeId ? (
            <span className="cell-person">
              <Avatar name={employeeName(data, node.assigneeId)} size={20} /> {employeeName(data, node.assigneeId)}
            </span>
          ) : (
            "–"
          )}
        </dd>
        <dt>Fällig</dt>
        <dd className={node.due && node.due < today() && progress < 100 ? "text-red" : ""}>{fmt(node.due)}</dd>
        {node.description && (
          <>
            <dt>Beschreibung</dt>
            <dd className="prose">{node.description}</dd>
          </>
        )}
      </dl>

      <div className="row-inline wrap">
        <button type="button" className="btn btn-sm" onClick={() => openEditor({ kind: "node", item: node })}>
          <Pencil size={13} /> Bearbeiten
        </button>
        <button type="button" className="btn btn-sm" onClick={onAddChild}>
          <Plus size={13} /> Unterpunkt
        </button>
        <button
          type="button"
          className="btn btn-sm btn-danger-ghost"
          onClick={() => {
            if (!window.confirm(hasKids ? `„${node.title}“ mit allen Unterpunkten und Fotos löschen?` : `„${node.title}“ löschen?`)) return;
            remove("siteNodes", node.id, `${node.title} gelöscht`);
            notify("Gelöscht");
            onDeleted();
          }}
        >
          <Trash2 size={13} />
        </button>
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
          <button type="button" className="btn btn-sm" onClick={() => openEditor({ kind: "issue", item: { projectId: project.id, nodeId: node.id, location: node.title } })}>
            <AlertTriangle size={13} /> Mangel
          </button>
        </header>
        {issues.length ? (
          <ul className="compact-list">
            {issues.map((i) => (
              <li key={i.id}>
                <button type="button" onClick={() => openEditor({ kind: "issue", item: i })}>
                  <Badge tone={L.issueStatus[i.status].tone}>{L.issueStatus[i.status].label}</Badge>
                  <strong>{i.title}</strong>
                  <span className="muted">{fmtShort(i.due)}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted small">Keine Mängel.</p>
        )}
      </section>
    </div>
  );
}

/* ---------------------------------------------------------------- Fotodokumentation */

export function PhotoDocumentation({ project }: { project: Project }) {
  const { data } = useStore();
  const nodes = data.siteNodes.filter((n) => n.projectId === project.id);
  const [area, setArea] = useState("");
  const [open, setOpen] = useState<number | null>(null);
  const areaIds = area ? new Set(subtreeIds(nodes, area)) : null;
  const photos = data.photos
    .filter((p) => p.projectId === project.id && (!areaIds || areaIds.has(p.nodeId)))
    .sort((a, b) => b.takenAt.localeCompare(a.takenAt));

  // Group by day, newest first – the way a site diary is read.
  const groups = new Map<string, Photo[]>();
  for (const p of photos) groups.set(p.takenAt.slice(0, 10), [...(groups.get(p.takenAt.slice(0, 10)) ?? []), p]);
  const flat = [...groups.values()].flat();

  return (
    <div className="stack">
      <div className="toolbar">
        <select className="select-sm" value={area} onChange={(e) => setArea(e.target.value)}>
          <option value="">Alle Bereiche</option>
          {childrenOf(nodes, "").map((n) => (
            <option key={n.id} value={n.id}>
              {n.title}
            </option>
          ))}
        </select>
        <span className="muted">{photos.length === 1 ? "1 Foto" : `${photos.length} Fotos`}</span>
        <span className="spacer" />
        <PhotoAddButton projectId={project.id} nodeId={area} className="btn btn-primary" label="Fotos hinzufügen" />
      </div>
      {photos.length === 0 ? (
        <Empty>
          <ImagePlus size={18} /> Noch keine Fotos.
        </Empty>
      ) : (
        [...groups.entries()].map(([day, list]) => (
          <section key={day} className="photo-day">
            <h3>
              {fmt(day)} <span className="muted">· {list.length === 1 ? "1 Foto" : `${list.length} Fotos`}</span>
            </h3>
            <div className="photo-grid">
              {list.map((p) => (
                <button key={p.id} type="button" className="photo-card" onClick={() => setOpen(flat.indexOf(p))} title={p.nodeId ? pathLabel(data.siteNodes, p.nodeId) : ""}>
                  <img src={p.dataUrl} alt={p.caption} loading="lazy" />
                  <span>
                    <strong>{p.caption || "Foto"}</strong>
                    <small>
                      {p.takenAt.slice(11, 16)} · {data.siteNodes.find((n) => n.id === p.nodeId)?.title ?? "Ohne Bereich"}
                    </small>
                  </span>
                </button>
              ))}
            </div>
          </section>
        ))
      )}
      {open !== null && <PhotoLightbox photos={flat} index={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
