"use client";

import { ChevronDown, ChevronRight, Copy, Folder, FolderOpen, Paperclip, Pencil, Plus, Trash2, TriangleAlert } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { today } from "@/core/date";
import { fmtShort, fmtStamp, WORK_STATUS } from "@/core/format";
import { byRole, teamOf } from "@/core/roles";
import { now, personName, uid, useStore } from "@/core/store";
import type { OpenPoint, PointType, Project, WorkStatus } from "@/core/types";
import { Bar, Button, Empty, Field, Menu, Modal, PageHead, People, PeoplePicker, SearchBox, Tag } from "@/core/ui";
import { Attachments, photosOf } from "./attachments";
import { DefectEditor, newDefect } from "./defects";
import { access, childrenOf, pathLabel, pathOf, POINT_TYPE, progress, tasksUnder } from "./model";

type Filter = "offen" | "in_progress" | "mangel" | "done" | "alle";

/** Open points: a tree of areas on the left, the points of the chosen area on the right. */
export function Points({ project: p }: { project: Project }) {
  const { data, save, remove, notify } = useStore();
  const params = useSearchParams();
  const { manage, work } = access(data, p);
  const points = useMemo(() => data.points.filter((x) => x.projectId === p.id), [data.points, p.id]);
  const [sel, setSel] = useState(params.get("bereich") ?? "");
  const [filter, setFilter] = useState<Filter>("offen");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<OpenPoint | null>(null);
  const [defectFor, setDefectFor] = useState<OpenPoint | null>(null);
  const [renaming, setRenaming] = useState("");
  const [adding, setAdding] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  // ?punkt=… opens a point directly (from search, dashboard, defects)
  const wanted = params.get("punkt");
  useEffect(() => {
    const x = wanted && data.points.find((y) => y.id === wanted);
    if (x) {
      setSel(x.parentId);
      setFilter("alle");
      setEditing(x);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wanted]);

  const node = points.find((x) => x.id === sel);
  const scope = tasksUnder(points, sel);
  const defectsOf = (id: string) => data.defects.filter((d) => d.openPointId === id && d.status !== "done");
  const term = q.trim().toLowerCase();
  const shown = scope
    .filter((x) => {
      if (filter === "offen" && x.status === "done") return false;
      if (filter === "in_progress" && x.status !== "in_progress") return false;
      if (filter === "done" && x.status !== "done") return false;
      if (filter === "mangel" && !defectsOf(x.id).length) return false;
      return !term || `${x.title} ${x.description}`.toLowerCase().includes(term);
    })
    .sort((a, b) => (sel ? 0 : pathLabel(points, a.parentId).localeCompare(pathLabel(points, b.parentId), "de")) || a.order - b.order);
  const counts = {
    offen: scope.filter((x) => x.status !== "done").length,
    in_progress: scope.filter((x) => x.status === "in_progress").length,
    mangel: scope.filter((x) => defectsOf(x.id).length).length,
    done: scope.filter((x) => x.status === "done").length,
    alle: scope.length
  };
  const pct = progress(scope);

  const nextOrder = () => Math.max(0, ...points.map((x) => x.order)) + 1;
  const addNode = (parentId: string, type: PointType, title: string) => {
    const item: OpenPoint = { id: uid(), projectId: p.id, parentId, type, title, description: "", status: "open", assigneeIds: [], due: "", order: nextOrder(), attachments: [], createdBy: data.meId, createdAt: now() };
    save("points", item, type === "task" ? `Punkt „${title}“ angelegt` : `${POINT_TYPE[type].label} „${title}“ angelegt`);
    if (parentId) setCollapsed((c) => new Set([...c].filter((x) => x !== parentId)));
    return item;
  };

  const setStatus = (x: OpenPoint, status: WorkStatus) => {
    if (status === x.status) return;
    if (status === "done" && p.settings.photoRequired && !photosOf(x.attachments)) {
      notify("In diesem Projekt braucht ein erledigter Punkt mindestens ein Foto.");
      setEditing(x);
      return;
    }
    save("points", { ...x, status, doneBy: status === "done" ? data.meId : undefined, doneAt: status === "done" ? now() : undefined }, status === "done" ? `„${x.title}“ erledigt` : `„${x.title}“: ${WORK_STATUS[status].label}`);
    if (status === "done") notify(`„${x.title}“ erledigt`);
  };

  /** Copies an area with everything below it – all points open again, without photos. */
  const duplicate = (src: OpenPoint) => {
    let order = nextOrder();
    const copy = (n: OpenPoint, parentId: string, top: boolean): string => {
      const id = uid();
      save("points", { ...n, id, parentId, title: top ? `${n.title} (Kopie)` : n.title, status: "open", doneBy: undefined, doneAt: undefined, attachments: [], order: order++, createdBy: data.meId, createdAt: now(), updatedBy: undefined, updatedAt: undefined }, top ? `„${n.title}“ dupliziert` : undefined);
      for (const k of childrenOf(points, n.id)) copy(k, id, false);
      return id;
    };
    const id = copy(src, src.parentId, true);
    setSel(id);
    setRenaming(id);
  };

  const drop = (x: OpenPoint) => {
    const below = tasksUnder(points, x.id).length;
    if (!window.confirm(x.type === "task" ? `Punkt „${x.title}“ löschen?` : `„${x.title}“ mit ${below} ${below === 1 ? "Punkt" : "Punkten"} darunter löschen?`)) return;
    remove("points", x.id, `„${x.title}“ gelöscht`);
    if (pathOf(points, sel).some((y) => y.id === x.id)) setSel(x.parentId);
  };

  const toggle = (id: string) => setCollapsed((c) => (c.has(id) ? new Set([...c].filter((x) => x !== id)) : new Set([...c, id])));

  const tree = (parentId: string, depth: number): React.ReactNode =>
    childrenOf(points, parentId)
      .filter((n) => n.type !== "task")
      .map((n) => {
        const kids = childrenOf(points, n.id).filter((k) => k.type !== "task");
        const list = tasksUnder(points, n.id);
        const done = list.filter((x) => x.status === "done").length;
        const open = !collapsed.has(n.id);
        const childType = POINT_TYPE[n.type].child;
        return (
          <li key={n.id}>
            <div className={`tree-row ${sel === n.id ? "on" : ""}`} style={{ paddingLeft: 6 + depth * 14 }} onClick={() => setSel(n.id)} onDoubleClick={() => manage && setRenaming(n.id)}>
              <button type="button" className="tree-caret" style={{ visibility: kids.length ? "visible" : "hidden" }} onClick={(e) => (e.stopPropagation(), toggle(n.id))} aria-label={open ? "Zuklappen" : "Aufklappen"}>
                {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
              {sel === n.id ? <FolderOpen size={15} className="tree-ic" /> : <Folder size={15} className="tree-ic" />}
              {renaming === n.id ? (
                <InlineName
                  initial={n.title}
                  onDone={(v) => {
                    setRenaming("");
                    if (v && v !== n.title) save("points", { ...n, title: v });
                  }}
                />
              ) : (
                <span className="tree-title" title={n.title}>
                  <span className="tree-name">{n.title}</span>
                  <small>
                    {done}/{list.length}
                  </small>
                </span>
              )}
              {manage && renaming !== n.id && (
                <span className="tree-tools" onClick={(e) => e.stopPropagation()}>
                  {childType && childType !== "task" && (
                    <button type="button" className="b-icon" title={`${POINT_TYPE[childType].label} anlegen`} onClick={() => setAdding(n.id)}>
                      <Plus size={14} />
                    </button>
                  )}
                  <Menu
                    items={[
                      { label: "Umbenennen", icon: <Pencil size={14} />, onClick: () => setRenaming(n.id) },
                      { label: "Duplizieren", icon: <Copy size={14} />, onClick: () => duplicate(n) },
                      "-",
                      { label: "Löschen", icon: <Trash2 size={14} />, danger: true, onClick: () => drop(n) }
                    ]}
                  />
                </span>
              )}
            </div>
            {adding === n.id && childType && (
              <div className="tree-new" style={{ paddingLeft: 26 + depth * 14 }}>
                <InlineName
                  placeholder={`${POINT_TYPE[childType].label} – Name`}
                  keepOpen
                  onDone={(v) => (v ? addNode(n.id, childType, v) : setAdding(null))}
                />
              </div>
            )}
            {open && kids.length > 0 && <ul>{tree(n.id, depth + 1)}</ul>}
          </li>
        );
      });

  const hasStructure = points.some((x) => x.type !== "task");
  const teamOptions = teamOf(p)
    .map((id) => data.people.find((x) => x.id === id))
    .filter((x): x is NonNullable<typeof x> => !!x && x.active)
    .sort(byRole)
    .map((x) => ({ id: x.id, name: x.name, info: x.title }));

  return (
    <div className="page">
      <PageHead kicker="Offene Punkte" title={node ? node.title : "Alle Punkte"} sub={node ? pathOf(points, node.id).slice(0, -1).map((x) => x.title).join(" › ") || POINT_TYPE[node.type].label : p.name} />

      <div className="split">
        <aside className="panel tree">
          <header className="panel-head">
            <h2>Bereiche</h2>
            {manage && (
              <Button size="sm" variant="ghost" icon={<Plus size={14} />} onClick={() => setAdding("")}>
                Bereich
              </Button>
            )}
          </header>
          <ul className="tree-list">
            <li>
              <div className={`tree-row all ${sel === "" ? "on" : ""}`} onClick={() => setSel("")}>
                <span className="tree-title">
                  Alle Punkte
                  <small>
                    {points.filter((x) => x.type === "task" && x.status === "done").length}/{points.filter((x) => x.type === "task").length}
                  </small>
                </span>
              </div>
            </li>
            {adding === "" && (
              <li className="tree-new">
                <InlineName placeholder="Bereich – z. B. Erdgeschoß" keepOpen onDone={(v) => (v ? setSel(addNode("", "area", v).id) : setAdding(null))} />
              </li>
            )}
            {tree("", 0)}
          </ul>
          {!hasStructure && <p className="panel-empty">{manage ? "Lege zuerst einen Bereich an, z. B. „Erdgeschoß“ oder „Tunnelabschnitt Nord“." : "Noch keine Bereiche."}</p>}
        </aside>

        <section className="split-main">
          <div className="stats-row">
            <div className="stat-total">
              <b>{pct} %</b>
              <span>
                {counts.done} von {counts.alle} erledigt
              </span>
              <Bar value={pct} />
            </div>
            {(
              [
                ["offen", "Offen"],
                ["in_progress", "In Arbeit"],
                ["mangel", "Mit Mangel"],
                ["done", "Erledigt"],
                ["alle", "Alle"]
              ] as [Filter, string][]
            ).map(([k, label]) => (
              <button key={k} type="button" className={`stat-chip ${filter === k ? "on" : ""} ${k === "mangel" && counts.mangel ? "warn" : ""}`} onClick={() => setFilter(k)}>
                <span>{label}</span>
                <b>{counts[k]}</b>
              </button>
            ))}
          </div>

          <div className="toolbar">
            <SearchBox value={q} onChange={setQ} placeholder="Punkt suchen…" />
          </div>

          <div className="panel">
            {shown.length === 0 ? (
              <p className="panel-empty">{scope.length ? "Kein Punkt in dieser Ansicht." : node ? "Noch keine Punkte in diesem Bereich." : "Noch keine Punkte."}</p>
            ) : (
              <table className="table points">
                <thead>
                  <tr>
                    <th className="w-check" />
                    <th>Punkt</th>
                    <th className="w-status">Status</th>
                    <th className="hide-sm">Zugewiesen</th>
                    <th className="hide-md">Fällig</th>
                    <th className="num hide-sm">Anhänge</th>
                    <th className="w-defect">Mangel</th>
                    <th className="w-menu" />
                  </tr>
                </thead>
                <tbody>
                  {shown.map((x) => {
                    const open = defectsOf(x.id);
                    const late = x.status !== "done" && x.due && x.due < today();
                    const mine = x.assigneeIds.includes(data.meId);
                    const canTick = work && (manage || mine || !x.assigneeIds.length);
                    return (
                      <tr key={x.id} className={x.status === "done" ? "done" : ""}>
                        <td className="w-check">
                          <input type="checkbox" className="check" checked={x.status === "done"} disabled={!canTick} onChange={(e) => setStatus(x, e.target.checked ? "done" : "open")} aria-label="Erledigt" />
                        </td>
                        <td>
                          {renaming === x.id ? (
                            <InlineName
                              initial={x.title}
                              onDone={(v) => {
                                setRenaming("");
                                if (v && v !== x.title) save("points", { ...x, title: v });
                              }}
                            />
                          ) : (
                            <button type="button" className="row-title" onClick={() => setEditing(x)} onDoubleClick={() => manage && setRenaming(x.id)}>
                              {x.title}
                            </button>
                          )}
                          {(sel === "" || x.parentId !== sel) && <small className="sub">{pathLabel(points, x.parentId)}</small>}
                        </td>
                        <td className="w-status">
                          <select className={`status-select s-${x.status}`} value={x.status} disabled={!canTick} onChange={(e) => setStatus(x, e.target.value as WorkStatus)} aria-label="Status">
                            {(Object.keys(WORK_STATUS) as WorkStatus[]).map((s) => (
                              <option key={s} value={s}>
                                {WORK_STATUS[s].label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="hide-sm">
                          <People ids={x.assigneeIds} />
                        </td>
                        <td className={`hide-md nowrap ${late ? "bad" : ""}`}>{x.due ? fmtShort(x.due) : <span className="muted">–</span>}</td>
                        <td className="num hide-sm">
                          {x.attachments.length ? (
                            <button type="button" className="count-btn" onClick={() => setEditing(x)} title="Anhänge">
                              <Paperclip size={13} /> {x.attachments.length}
                            </button>
                          ) : (
                            <span className="muted">–</span>
                          )}
                        </td>
                        <td className="w-defect">
                          {open.length ? (
                            <a href={`/projekte/${p.id}/maengel?mangel=${open[0].id}`} className="defect-flag" title={open.map((d) => d.title).join(", ")}>
                              <TriangleAlert size={14} /> {open.length}
                            </a>
                          ) : (
                            work && (
                              <button type="button" className="link small" onClick={() => setDefectFor(x)}>
                                + Mangel
                              </button>
                            )
                          )}
                        </td>
                        <td className="w-menu">
                          <Menu
                            items={[
                              { label: "Öffnen", icon: <Pencil size={14} />, onClick: () => setEditing(x) },
                              { label: "Mangel erfassen", icon: <TriangleAlert size={14} />, onClick: () => setDefectFor(x), disabled: !work },
                              { label: "Umbenennen", icon: <Pencil size={14} />, onClick: () => setRenaming(x.id), disabled: !manage },
                              { label: "Duplizieren", icon: <Copy size={14} />, onClick: () => save("points", { ...x, id: uid(), title: `${x.title} (Kopie)`, status: "open", doneAt: undefined, doneBy: undefined, attachments: [], order: x.order + 0.5, createdBy: data.meId, createdAt: now() }), disabled: !manage },
                              "-",
                              { label: "Löschen", icon: <Trash2 size={14} />, danger: true, onClick: () => drop(x), disabled: !manage }
                            ]}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            {manage && node && <AddRow onAdd={(title) => addNode(node.id, "task", title)} />}
            {manage && !node && hasStructure && <p className="panel-hint">Zum Anlegen von Punkten links einen Bereich wählen.</p>}
          </div>
          {!hasStructure && manage && <Empty title="So geht's" action={<Button variant="primary" icon={<Plus size={15} />} onClick={() => setAdding("")}>Ersten Bereich anlegen</Button>}>Bereiche gliedern das Projekt (Gebäude, Geschoß, Abschnitt). Darin legst du die Punkte an, die erledigt werden müssen.</Empty>}
        </section>
      </div>

      {editing && <PointEditor point={data.points.find((y) => y.id === editing.id) ?? editing} project={p} team={teamOptions} onClose={() => setEditing(null)} onStatus={setStatus} onDefect={(x) => (setEditing(null), setDefectFor(x))} />}
      {defectFor && <DefectEditor project={p} defect={newDefect(data, p, defectFor)} onClose={() => setDefectFor(null)} />}
    </div>
  );
}

/** Text field for names: Enter saves, clicking elsewhere saves too, Esc cancels. */
export function InlineName({ initial = "", placeholder, keepOpen, onDone }: { initial?: string; placeholder?: string; keepOpen?: boolean; onDone: (v: string) => void }) {
  const [v, setV] = useState(initial);
  const cancelled = useRef(false);
  return (
    <input
      className="inline-name"
      autoFocus
      value={v}
      placeholder={placeholder}
      onFocus={(e) => e.currentTarget.select()}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => {
        if (cancelled.current) return;
        const val = v.trim();
        if (keepOpen) {
          if (val) onDone(val);
          onDone("");
        } else onDone(val || initial);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          cancelled.current = true;
          onDone(keepOpen ? "" : initial);
        }
        if (e.key === "Enter") {
          e.preventDefault();
          if (keepOpen) {
            if (v.trim()) onDone(v.trim());
            setV("");
          } else e.currentTarget.blur();
        }
      }}
    />
  );
}

function AddRow({ onAdd }: { onAdd: (title: string) => void }) {
  const [on, setOn] = useState(false);
  if (!on)
    return (
      <button type="button" className="add-row" onClick={() => setOn(true)}>
        <Plus size={14} /> Punkt hinzufügen
      </button>
    );
  return (
    <div className="add-row editing">
      <Plus size={14} />
      <InlineName placeholder="Was ist zu tun? Enter = nächster Punkt" keepOpen onDone={(v) => (v ? onAdd(v) : setOn(false))} />
    </div>
  );
}

function PointEditor({
  point: x,
  project: p,
  team,
  onClose,
  onStatus,
  onDefect
}: {
  point: OpenPoint;
  project: Project;
  team: { id: string; name: string; info?: string }[];
  onClose: () => void;
  onStatus: (x: OpenPoint, s: WorkStatus) => void;
  onDefect: (x: OpenPoint) => void;
}) {
  const { data, save } = useStore();
  const { manage, work } = access(data, p);
  const [v, setV] = useState({ title: x.title, description: x.description, due: x.due, assigneeIds: x.assigneeIds });
  const defects = data.defects.filter((d) => d.openPointId === x.id);
  const points = data.points.filter((y) => y.projectId === p.id);
  const dirty = v.title !== x.title || v.description !== x.description || v.due !== x.due || v.assigneeIds.join() !== x.assigneeIds.join();
  const submit = () => {
    if (dirty && v.title.trim()) save("points", { ...x, ...v, title: v.title.trim() }, `„${v.title.trim()}“ geändert`);
    onClose();
  };
  return (
    <Modal
      kicker={pathLabel(points, x.parentId) || "Punkt"}
      title={x.title}
      onClose={submit}
      wide
      footer={
        <>
          {work && (
            <Button icon={<TriangleAlert size={15} />} onClick={() => onDefect(x)}>
              Mangel erfassen
            </Button>
          )}
          <span className="grow" />
          {work && x.status !== "done" && (
            <Button variant="default" onClick={() => onStatus({ ...x, ...v }, "done")}>
              Erledigt
            </Button>
          )}
          <Button variant="primary" onClick={submit}>
            {dirty ? "Speichern" : "Schließen"}
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Titel" className="span-2">
          <input value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} disabled={!manage} />
        </Field>
        <Field label="Beschreibung" className="span-2">
          <textarea rows={3} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} disabled={!work} placeholder="Was genau, wo, worauf achten …" />
        </Field>
        <Field label="Status">
          <div className="inline-status">
            <Tag tone={WORK_STATUS[x.status].tone} dot>
              {WORK_STATUS[x.status].label}
            </Tag>
            {work && x.status === "open" && (
              <button type="button" className="link small" onClick={() => onStatus(x, "in_progress")}>
                In Arbeit setzen
              </button>
            )}
            {work && x.status === "done" && (
              <button type="button" className="link small" onClick={() => onStatus(x, "open")}>
                Wieder öffnen
              </button>
            )}
          </div>
        </Field>
        <Field label="Fällig am">
          <input type="date" value={v.due} onChange={(e) => setV({ ...v, due: e.target.value })} disabled={!manage} />
        </Field>
        <div className="b-field span-2">
          <span className="b-label">Zugewiesen</span>
          {manage ? <PeoplePicker multiple value={v.assigneeIds} onChange={(ids) => setV({ ...v, assigneeIds: ids })} options={team} /> : <People ids={x.assigneeIds} max={6} />}
        </div>
        <div className="b-field span-2">
          <span className="b-label">Fotos und Dateien {p.settings.photoRequired && <em className="req">Foto zum Abschließen nötig</em>}</span>
          <Attachments value={x.attachments} editable={work} onChange={(attachments) => save("points", { ...x, attachments }, `Anhang bei „${x.title}“`)} />
        </div>
        {defects.length > 0 && (
          <div className="b-field span-2">
            <span className="b-label">Mängel zu diesem Punkt</span>
            <ul className="mini-list">
              {defects.map((d) => (
                <li key={d.id}>
                  <a href={`/projekte/${p.id}/maengel?mangel=${d.id}`}>{d.title}</a>
                  <Tag tone={WORK_STATUS[d.status].tone}>{WORK_STATUS[d.status].label}</Tag>
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="trail span-2">
          Angelegt von {personName(data, x.createdBy) || "–"} am {fmtStamp(x.createdAt)}
          {x.updatedAt && ` · geändert von ${personName(data, x.updatedBy ?? "")} am ${fmtStamp(x.updatedAt)}`}
          {x.doneAt && ` · erledigt von ${personName(data, x.doneBy ?? "")} am ${fmtStamp(x.doneAt)}`}
        </p>
      </div>
    </Modal>
  );
}
