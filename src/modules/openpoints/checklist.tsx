"use client";

import { ChevronDown, ChevronRight, ClipboardList, Copy, FolderPlus, MoreHorizontal, Paperclip, Pencil, Plus, Search, Trash2, TriangleAlert } from "lucide-react";
import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Due, Empty, PeopleStack, Seg, SortHead, useConfirm } from "@/components/app/kit";
import { Pop } from "@/components/shell/top-controls";
import { Checkbox, DropdownMenuItem, DropdownMenuSeparator, Input, Select } from "@/components/ui";
import { CHILD_TYPES, defectOpen, POINT_TYPE, WORK_STATUS, WORK_STATUSES } from "@/lib/labels";
import { activeSites, branchOf, now, uid, useStore } from "@/lib/store/store";
import type { OpenPoint, PointType, WorkStatus } from "@/lib/store/types";
import { useQuery } from "@/lib/use-query";
import { cn } from "@/lib/utils";
import { childrenOf, nextOrder, pathLabel, pointsBelow } from "./model";
import { withPointStatus } from "./editors";
import { ZipButton } from "./zip-button";
import { exportChecklist } from "@/lib/photo-export";

const COLLAPSED_KEY = "vysner:op-collapsed";
type Show = "offen" | "alle" | "erledigt";
type SortKey = "order" | "title" | "due" | "status";

export function Checklist({ onOpen }: { onOpen: (id: string) => void }) {
  const { data, save, siteId, notify, remove, restore } = useStore();
  const q = useQuery();
  const ask = useConfirm();
  const node = q.get("knoten");
  const [term, setTerm] = useState("");
  const [show, setShow] = useState<Show>("offen");
  const [mine, setMine] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "order", dir: 1 });
  const [renaming, setRenaming] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [quick, setQuick] = useState("");
  const quickRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      setCollapsed(new Set(JSON.parse(window.localStorage.getItem(COLLAPSED_KEY) ?? "[]") as string[]));
    } catch {
      // all open
    }
  }, []);
  const toggle = (id: string) =>
    setCollapsed((c) => {
      const n = new Set(c);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      try {
        window.localStorage.setItem(COLLAPSED_KEY, JSON.stringify([...n]));
      } catch {
        // only for this visit
      }
      return n;
    });

  const sites = siteId ? data.sites.filter((s) => s.id === siteId) : activeSites(data).filter((s) => s.status !== "geplant" || data.points.some((p) => p.siteId === s.id));
  const siteIds = new Set(sites.map((s) => s.id));
  const points = data.points.filter((p) => siteIds.has(p.siteId));
  const selected = points.find((p) => p.id === node && p.type !== "punkt");
  const selectedSite = node.startsWith("site:") ? node.slice(5) : selected?.siteId ?? siteId;
  /** where new points go */
  const target = selected ? { siteId: selected.siteId, parentId: selected.id } : selectedSite ? { siteId: selectedSite, parentId: "" } : null;

  const scopePoints = selected ? pointsBelow(points, selected.id) : points.filter((p) => p.type === "punkt" && (!selectedSite || p.siteId === selectedSite));
  const withDefect = new Set(data.defects.filter((d) => defectOpen(d.status) && d.pointId).map((d) => d.pointId));
  const t = term.trim().toLowerCase();
  const rows = useMemo(() => {
    const order = new Map(points.map((p) => [p.id, pathLabel(points, p.id) + " › " + String(p.order).padStart(6, "0")]));
    const list = scopePoints.filter(
      (p) => (show === "alle" || (show === "erledigt" ? p.status === "erledigt" : p.status !== "erledigt")) && (!mine || p.assigneeIds.includes(data.meId)) && (!t || [p.title, p.note, pathLabel(points, p.id)].join(" ").toLowerCase().includes(t))
    );
    const val = (p: OpenPoint) => (sort.key === "order" ? order.get(p.id)! : sort.key === "due" ? p.due || "9999" : sort.key === "status" ? WORK_STATUSES.indexOf(p.status) : p.title.toLowerCase());
    return list.sort((a, b) => {
      const x = val(a);
      const y = val(b);
      return (x < y ? -1 : x > y ? 1 : 0) * sort.dir;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.points, data.meId, node, siteId, show, mine, t, sort]);

  const doneCount = scopePoints.filter((p) => p.status === "erledigt").length;
  const pct = scopePoints.length ? Math.round((doneCount / scopePoints.length) * 100) : 0;

  /* ---------------------------------------------------------------- structure actions */
  const create = (siteOf: string, parentId: string, type: PointType, title: string) => {
    const id = uid();
    save("points", { id, siteId: siteOf, parentId, type, title, note: "", status: "offen", assigneeIds: [], due: "", order: nextOrder(data.points), files: [], createdBy: data.meId, createdAt: now() });
    return id;
  };
  const addNode = (siteOf: string, parentId: string, type: PointType) => {
    const id = create(siteOf, parentId, type, `Neuer ${POINT_TYPE[type]}`);
    if (parentId) setCollapsed((c) => (c.delete(parentId), new Set(c)));
    if (type === "punkt") onOpen(id);
    else {
      q.set({ knoten: id });
      setRenaming(id);
    }
  };
  const duplicate = (p: OpenPoint) => {
    const ids = branchOf(data.points, p.id);
    const map = new Map([...ids].map((id) => [id, uid()]));
    let order = nextOrder(data.points);
    for (const x of data.points.filter((y) => ids.has(y.id)))
      save("points", { ...x, id: map.get(x.id)!, parentId: x.id === p.id ? p.parentId : (map.get(x.parentId) ?? x.parentId), title: x.id === p.id ? `${x.title} (Kopie)` : x.title, status: "offen", doneBy: undefined, doneAt: undefined, files: [], order: order++, createdBy: data.meId, createdAt: now(), updatedBy: undefined, updatedAt: undefined });
    notify(`„${p.title}“ dupliziert`);
  };
  const drop = async (p: OpenPoint) => {
    const n = branchOf(data.points, p.id).size - 1;
    if (!(await ask({ title: `„${p.title}“ löschen?`, text: n ? `${n} Einträge darunter werden mitgelöscht.` : undefined }))) return;
    const before = data;
    remove("points", p.id);
    if (node === p.id) q.set({ knoten: null });
    notify("Gelöscht", { undo: () => restore(before) });
  };
  const rename = (p: OpenPoint, v: string | null) => {
    setRenaming("");
    if (v !== null && v.trim() && v.trim() !== p.title) save("points", { ...p, title: v.trim() });
  };
  const setStatus = (p: OpenPoint, s: WorkStatus) => s !== p.status && save("points", withPointStatus(p, s, data.meId));
  const addQuick = () => {
    const title = quick.trim();
    if (!title || !target) return;
    create(target.siteId, target.parentId, "punkt", title);
    setQuick("");
    quickRef.current?.focus();
  };

  /* ---------------------------------------------------------------- tree */
  const count = (id: string) => {
    const l = pointsBelow(points, id);
    return { done: l.filter((p) => p.status === "erledigt").length, all: l.length };
  };
  const renderNode = (p: OpenPoint, depth: number): ReactNode => {
    const kids = childrenOf(points, p.id).filter((x) => x.type !== "punkt");
    const c = count(p.id);
    const closed = collapsed.has(p.id);
    const childTypes = CHILD_TYPES[p.type].filter((x) => x !== "punkt");
    return (
      <Fragment key={p.id}>
        <div className={cn("tree-node", node === p.id && "on")} style={{ paddingLeft: 6 + depth * 14 }}>
          <button type="button" className="tree-caret" onClick={() => toggle(p.id)} aria-label={closed ? "Aufklappen" : "Zuklappen"} style={{ visibility: kids.length ? "visible" : "hidden" }}>
            {closed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
          </button>
          {renaming === p.id ? (
            <RenameInput value={p.title} onDone={(v) => rename(p, v)} />
          ) : (
            <button type="button" className="tree-label" onClick={() => q.set({ knoten: p.id })} onDoubleClick={() => setRenaming(p.id)} title={`${POINT_TYPE[p.type]}: ${p.title}`}>
              <span className="grow">{p.title}</span>
              <small className={cn(c.all && c.done === c.all && "ok-text")}>
                {c.done}/{c.all}
              </small>
            </button>
          )}
          <Pop
            className="tree-more"
            trigger={(open, tg) => (
              <button type="button" className={cn("tree-dots", open && "on")} onClick={tg} aria-label={`Aktionen für ${p.title}`}>
                <MoreHorizontal size={14} />
              </button>
            )}
          >
            {(close) => (
              <>
                {childTypes.map((ct) => (
                  <DropdownMenuItem key={ct} onClick={() => (close(), addNode(p.siteId, p.id, ct))}>
                    <FolderPlus size={14} /> {POINT_TYPE[ct]} anlegen
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem onClick={() => (close(), addNode(p.siteId, p.id, "punkt"))}>
                  <Plus size={14} /> Punkt anlegen
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => (close(), setRenaming(p.id))}>
                  <Pencil size={14} /> Umbenennen
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => (close(), onOpen(p.id))}>
                  <ClipboardList size={14} /> Beschreibung bearbeiten
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => (close(), duplicate(p))}>
                  <Copy size={14} /> Duplizieren
                </DropdownMenuItem>
                <DropdownMenuItem className="danger" onClick={() => (close(), void drop(p))}>
                  <Trash2 size={14} /> Löschen
                </DropdownMenuItem>
              </>
            )}
          </Pop>
        </div>
        {!closed && kids.map((k) => renderNode(k, depth + 1))}
      </Fragment>
    );
  };

  const siteNodes = sites.map((s) => {
    const roots = childrenOf(points, "").filter((p) => p.siteId === s.id && p.type !== "punkt");
    const l = points.filter((p) => p.siteId === s.id && p.type === "punkt");
    const key = `site:${s.id}`;
    return (
      <div key={s.id} className="tree-site">
        {!siteId ? (
          <div className={cn("tree-node site", node === key && "on")}>
            <span className="swatch" style={{ background: s.color }} />
            <button type="button" className="tree-label" onClick={() => q.set({ knoten: key })}>
              <span className="grow">{s.name}</span>
              <small>
                {l.filter((p) => p.status === "erledigt").length}/{l.length}
              </small>
            </button>
            <button type="button" className="tree-dots" title="Bereich anlegen" aria-label={`Bereich in ${s.name} anlegen`} onClick={() => addNode(s.id, "", "bereich")}>
              <Plus size={14} />
            </button>
          </div>
        ) : (
          <div className={cn("tree-node site", !node && "on")}>
            <span className="swatch" style={{ background: s.color }} />
            <button type="button" className="tree-label" onClick={() => q.set({ knoten: null })}>
              <span className="grow">Gesamte Baustelle</span>
              <small>
                {l.filter((p) => p.status === "erledigt").length}/{l.length}
              </small>
            </button>
          </div>
        )}
        {roots.map((r) => renderNode(r, siteId ? 0 : 1))}
      </div>
    );
  });

  return (
    <div className="checklist">
      <aside className="panel tree" aria-label="Struktur">
        <div className="panel-head">
          <h3>Struktur</h3>
          <span className="grow" />
          {siteId && (
            <button type="button" className="more" onClick={() => addNode(siteId, "", "bereich")}>
              <Plus size={13} /> Bereich
            </button>
          )}
        </div>
        <div className="tree-body">
          {!siteId && (
            <div className={cn("tree-node site", !node && "on")}>
              <span className="swatch" style={{ background: "var(--border-strong)" }} />
              <button type="button" className="tree-label" onClick={() => q.set({ knoten: null })}>
                <span className="grow">Alle Baustellen</span>
              </button>
            </div>
          )}
          {siteNodes}
          {!sites.length && <p className="muted tree-empty">Keine Baustelle vorhanden.</p>}
        </div>
      </aside>

      <section className="panel point-list">
        <div className="panel-head wrap">
          <div className="grow point-head">
            <h3>{selected ? selected.title : selectedSite ? (data.sites.find((s) => s.id === selectedSite)?.name ?? "") : "Alle Punkte"}</h3>
            <span className="muted">
              {doneCount} von {scopePoints.length} erledigt
            </span>
            <div className="progress" style={{ width: 120 }}>
              <i style={{ width: `${pct}%` }} />
            </div>
          </div>
          <ZipButton
            name={`Fotodoku ${selected ? selected.title : selectedSite ? (data.sites.find((x) => x.id === selectedSite)?.name ?? "") : "Alle Baustellen"}`}
            run={() => exportChecklist(data, selected ? [selected.siteId] : selectedSite ? [selectedSite] : sites.map((x) => x.id), selected?.id)}
          />
          <label className="search">
            <Search size={14} />
            <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Punkte durchsuchen" aria-label="Punkte durchsuchen" />
          </label>
          <label className="check-row">
            <Checkbox checked={mine} onChange={(e) => setMine(e.target.checked)} /> Nur meine
          </label>
          <Seg<Show>
            label="Status"
            value={show}
            onChange={setShow}
            options={[
              { value: "offen", label: "Offen" },
              { value: "erledigt", label: "Erledigt" },
              { value: "alle", label: "Alle" }
            ]}
          />
        </div>
        {rows.length ? (
          <div className="table-scroll">
            <table className="ui-table">
              <thead>
                <tr>
                  <th className="ui-table-head" style={{ width: 36 }}>
                    <span className="sr-only">Erledigt</span>
                  </th>
                  <SortHead k="order" sort={sort} onSort={setSort}>
                    Punkt
                  </SortHead>
                  <th className="ui-table-head">Zuständig</th>
                  <SortHead k="due" sort={sort} onSort={setSort}>
                    Fällig
                  </SortHead>
                  <SortHead k="status" sort={sort} onSort={setSort}>
                    Status
                  </SortHead>
                  <th className="ui-table-head" aria-label="Hinweise" />
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className={cn("ui-table-row clickable", p.status === "erledigt" && "done")} onClick={() => onOpen(p.id)}>
                    <td className="ui-table-cell" onClick={(e) => e.stopPropagation()}>
                      <Checkbox checked={p.status === "erledigt"} aria-label={`${p.title} erledigt`} onChange={(e) => setStatus(p, e.target.checked ? "erledigt" : "offen")} />
                    </td>
                    <td className="ui-table-cell">
                      <div className="point-cell">
                        <strong className={cn(p.status === "erledigt" && "struck")}>{p.title}</strong>
                        <small>
                          {[!siteId && !selectedSite ? data.sites.find((s) => s.id === p.siteId)?.name : "", pathLabel(points, p.id)].filter(Boolean).join(" › ") || "Ohne Bereich"}
                        </small>
                      </div>
                    </td>
                    <td className="ui-table-cell">
                      <PeopleStack ids={p.assigneeIds} />
                    </td>
                    <td className="ui-table-cell">
                      <Due due={p.due} done={p.status === "erledigt"} />
                    </td>
                    <td className="ui-table-cell" onClick={(e) => e.stopPropagation()}>
                      <Select className={cn("status-select", p.status)} value={p.status} aria-label="Status" onChange={(e) => setStatus(p, e.target.value as WorkStatus)}>
                        {WORK_STATUSES.map((k) => (
                          <option key={k} value={k}>
                            {WORK_STATUS[k].label}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td className="ui-table-cell nowrap muted">
                      {p.files.length > 0 && (
                        <span className="hint" title={`${p.files.length} Dateien`}>
                          <Paperclip size={13} /> {p.files.length}
                        </span>
                      )}
                      {withDefect.has(p.id) && (
                        <span className="hint signal-text" title="Offener Mangel">
                          <TriangleAlert size={13} />
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="panel-body">
            <Empty
              inline
              icon={<ClipboardList size={26} />}
              title={scopePoints.length ? "Keine Punkte für diesen Filter" : "Noch keine Punkte"}
              text={scopePoints.length ? (show === "offen" ? "Alles erledigt – unter „Alle“ sind die erledigten Punkte." : "Suche oder Filter anpassen.") : target ? "Unten einen Punkt eintragen oder links die Struktur anlegen." : "Links eine Baustelle oder einen Bereich wählen."}
            />
          </div>
        )}
        <form
          className="quick-add"
          onSubmit={(e) => {
            e.preventDefault();
            addQuick();
          }}
        >
          <Plus size={15} className="muted" />
          <Input ref={quickRef} value={quick} onChange={(e) => setQuick(e.target.value)} disabled={!target} placeholder={target ? `Neuer Punkt in „${selected?.title ?? data.sites.find((s) => s.id === target.siteId)?.name}“ – Enter speichert` : "Zum Anlegen links eine Baustelle wählen"} aria-label="Neuer Punkt" />
        </form>
      </section>
    </div>
  );
}

function RenameInput({ value, onDone }: { value: string; onDone: (v: string | null) => void }) {
  const done = useRef(false);
  const finish = (v: string | null) => {
    if (done.current) return;
    done.current = true;
    onDone(v);
  };
  return (
    <input
      className="ui-input tree-input"
      autoFocus
      defaultValue={value}
      onFocus={(e) => e.currentTarget.select()}
      onBlur={(e) => finish(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") finish(e.currentTarget.value);
        if (e.key === "Escape") finish(null);
      }}
      aria-label="Name"
    />
  );
}
