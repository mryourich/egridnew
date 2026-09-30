"use client";

import { AlertTriangle, Camera, ChevronDown, ChevronLeft, ChevronRight, Download, ImagePlus, Plus, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { fmt, fmtShort, today } from "@/lib/date";
import * as L from "@/lib/labels";
import { childrenOf, levelName, nodeProgress, nodeStatus, pathLabel, pathOf, subtreeIds } from "@/lib/site";
import { employeeName, uid, useStore } from "@/lib/store";
import type { NodeStatus, Photo, Project, SiteNode } from "@/lib/types";
import { useEditor } from "./shell";
import { Badge, downscale, Empty, Progress, SearchInput } from "./ui";

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
  const nodes = useMemo(() => data.siteNodes.filter((n) => n.projectId === project.id), [data.siteNodes, project.id]);
  const [openId, setOpenId] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const t = today();
  const open = nodes.find((n) => n.id === openId);

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

  const addArea = () => {
    const title = draft.trim();
    if (!title) return;
    save("siteNodes", { id: uid("n"), projectId: project.id, parentId: "", title, description: "", status: "offen", assigneeId: "", due: "", order: Date.now() }, `Bereich ${title} angelegt`);
    setDraft("");
  };

  const roots = childrenOf(nodes, "");
  const total = roots.length ? Math.round(roots.reduce((s, r) => s + nodeProgress(nodes, r), 0) / roots.length) : 0;

  return (
    <section className="card card-flush site-tree">
      <div className="actionbar">
        <form
          className="quick-add"
          onSubmit={(e) => {
            e.preventDefault();
            addArea();
          }}
        >
          <Plus size={15} />
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Neuen Bereich eingeben und Enter drücken…" aria-label="Neuer Bereich" />
        </form>
        <span className="action-sep" />
        <button type="button" className="action" onClick={() => setCollapsed(new Set())}>
          Aufklappen
        </button>
        <button type="button" className="action" onClick={() => setCollapsed(new Set(nodes.filter((n) => nodes.some((k) => k.parentId === n.id)).map((n) => n.id)))}>
          Zuklappen
        </button>
        <label className="check action-check">
          <input type="checkbox" checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} /> nur offene
        </label>
        <span className="spacer" />
        <span className="tree-total">
          <span>Fortschritt</span>
          <Progress value={total} color={project.color} />
          <strong>{total} %</strong>
        </span>
        <SearchInput value={query} onChange={setQuery} placeholder="Suchen…" />
      </div>
      {rows.length === 0 ? (
        <Empty>{nodes.length ? "Keine Treffer." : "Noch keine Bereiche – oben einen Namen eingeben und Enter drücken."}</Empty>
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
                const shownStatus: NodeStatus = progress === 100 ? "erledigt" : hasKids ? (progress > 0 ? "in_arbeit" : "offen") : node.status;
                return (
                  <tr key={node.id} className={`clickable ${node.id === openId ? "selected" : ""} ${depth === 0 ? "tree-root" : ""}`} onClick={() => setOpenId(node.id)}>
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
                      <Badge tone={nodeStatus[shownStatus].tone}>{nodeStatus[shownStatus].label}</Badge>
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
      {open && <NodeDrawer node={open} nodes={nodes} project={project} onOpen={setOpenId} onClose={() => setOpenId("")} onStatus={setStatus} />}
    </section>
  );
}

/** Slide-over with every field of a point editable in place – no separate edit dialog. */
function NodeDrawer({
  node,
  nodes,
  project,
  onOpen,
  onClose,
  onStatus
}: {
  node: SiteNode;
  nodes: SiteNode[];
  project: Project;
  onOpen: (id: string) => void;
  onClose: () => void;
  onStatus: (n: SiteNode, s: NodeStatus) => void;
}) {
  const { data, save, remove, notify } = useStore();
  const openEditor = useEditor();
  const [child, setChild] = useState("");
  const ids = subtreeIds(nodes, node.id);
  const kids = childrenOf(nodes, node.id);
  const hasKids = kids.length > 0;
  const photos = data.photos.filter((p) => ids.includes(p.nodeId)).sort((a, b) => b.takenAt.localeCompare(a.takenAt));
  const issues = data.issues.filter((i) => i.nodeId && ids.includes(i.nodeId));
  const jobs = data.jobs.filter((j) => ids.includes(j.nodeId)).sort((a, b) => a.start.localeCompare(b.start));
  const progress = nodeProgress(nodes, node);
  const path = pathOf(nodes, node.id);
  const set = (patch: Partial<SiteNode>) => save("siteNodes", { ...node, ...patch });

  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === "Escape" && !document.querySelector(".modal, .lightbox-backdrop") && onClose();
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);

  const addChild = () => {
    const title = child.trim();
    if (!title) return;
    save("siteNodes", { id: uid("n"), projectId: project.id, parentId: node.id, title, description: "", status: "offen", assigneeId: node.assigneeId, due: "", order: Date.now() }, `${title} angelegt`);
    setChild("");
  };

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="drawer" aria-label={node.title}>
        <header className="drawer-head">
          <nav className="node-path">
            {path.slice(0, -1).map((p) => (
              <button key={p.id} type="button" onClick={() => onOpen(p.id)}>
                {p.title}
              </button>
            ))}
            {path.length === 1 && <span>{levelName(0)}</span>}
          </nav>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Schließen">
            <X size={18} />
          </button>
        </header>

        <div className="drawer-body">
          <input className="drawer-title" value={node.title} onChange={(e) => set({ title: e.target.value })} aria-label="Bezeichnung" />

          {hasKids ? (
            <span className="cell-progress">
              <Progress value={progress} color={project.color} /> {progress} % erledigt
            </span>
          ) : (
            <div className="status-switch" role="group" aria-label="Status">
              {(Object.keys(nodeStatus) as NodeStatus[]).map((st) => (
                <button key={st} type="button" className={node.status === st ? `on tone-${nodeStatus[st].tone}` : ""} onClick={() => onStatus(node, st)}>
                  {nodeStatus[st].label}
                </button>
              ))}
            </div>
          )}

          <div className="inline-fields">
            <label>
              <span>Zuständig</span>
              <select value={node.assigneeId} onChange={(e) => set({ assigneeId: e.target.value })}>
                <option value="">–</option>
                {data.employees
                  .filter((e) => e.active)
                  .map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              <span>Fällig</span>
              <input type="date" value={node.due} onChange={(e) => set({ due: e.target.value })} className={node.due && node.due < today() && progress < 100 ? "text-red" : ""} />
            </label>
            <label className="full">
              <span>Beschreibung</span>
              <textarea rows={3} value={node.description} placeholder="Notizen, Hinweise…" onChange={(e) => set({ description: e.target.value })} />
            </label>
          </div>

          <section className="detail-section">
            <header>
              <h3>
                Unterpunkte <span className="tab-count">{kids.length}</span>
              </h3>
            </header>
            {kids.length > 0 && (
              <ul className="sub-list">
                {kids.map((k) => {
                  const kp = nodeProgress(nodes, k);
                  const kHasKids = nodes.some((x) => x.parentId === k.id);
                  return (
                    <li key={k.id}>
                      {kHasKids ? (
                        <span className="sub-pct">{kp}%</span>
                      ) : (
                        <input type="checkbox" className="tree-check" checked={k.status === "erledigt"} onChange={(e) => onStatus(k, e.target.checked ? "erledigt" : "offen")} aria-label="Erledigt" />
                      )}
                      <button type="button" className={k.status === "erledigt" && !kHasKids ? "done" : ""} onClick={() => onOpen(k.id)}>
                        {k.title}
                      </button>
                      <ChevronRight size={14} className="muted" />
                    </li>
                  );
                })}
              </ul>
            )}
            <form
              className="quick-add small-add"
              onSubmit={(e) => {
                e.preventDefault();
                addChild();
              }}
            >
              <Plus size={14} />
              <input value={child} onChange={(e) => setChild(e.target.value)} placeholder="Unterpunkt eingeben + Enter" aria-label="Neuer Unterpunkt" />
            </form>
          </section>

          {jobs.length > 0 && (
            <section className="detail-section">
              <header>
                <h3>
                  Aufgaben <span className="tab-count">{jobs.length}</span>
                </h3>
              </header>
              <ul className="sub-list">
                {jobs.map((j) => (
                  <li key={j.id}>
                    <input type="checkbox" className="tree-check" checked={j.done} onChange={() => save("jobs", { ...j, done: !j.done })} aria-label="Erledigt" />
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

          <footer className="drawer-foot">
            <button
              type="button"
              className="btn btn-sm btn-danger-ghost"
              onClick={() => {
                if (!window.confirm(hasKids ? `„${node.title}“ mit allen Unterpunkten und Fotos löschen?` : `„${node.title}“ löschen?`)) return;
                remove("siteNodes", node.id, `${node.title} gelöscht`);
                notify("Gelöscht");
                if (node.parentId) onOpen(node.parentId);
                else onClose();
              }}
            >
              <Trash2 size={13} /> Löschen
            </button>
          </footer>
        </div>
      </aside>
    </>
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
