"use client";

import { Check, GripVertical, HardHat, MoreHorizontal, Plus, Search, StickyNote, Trash2, User } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Avatar, Empty, PageHead, Seg, useConfirm } from "@/components/app/kit";
import { Pop } from "@/components/shell/top-controls";
import { Button, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, Input } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";
import { NOTE_COLORS } from "@/lib/labels";
import { activeSites, now, personName, siteName, uid, useStore } from "@/lib/store/store";
import type { Note } from "@/lib/store/types";
import { useQuery } from "@/lib/use-query";
import { cn } from "@/lib/utils";

type Kind = "alle" | "baustelle" | "persoenlich";
const COLORS = Object.keys(NOTE_COLORS);

/** Sticky-note board: colour-coded tiles, written in place, sorted by dragging the grip. */
export function Notes() {
  const { data, save, remove, siteId, notify, restore } = useStore();
  const q = useQuery();
  const ask = useConfirm();
  const [kind, setKind] = useState<Kind>("alle");
  const [color, setColor] = useState("");
  const [term, setTerm] = useState("");
  const [fresh, setFresh] = useState("");
  const [drag, setDrag] = useState<{ id: string; over: string; after: boolean } | null>(null);
  const focus = q.get("notiz");
  const me = data.meId;

  // own personal notes and the notes of the chosen site(s)
  const visible = data.notes.filter((n) => (n.siteId ? !siteId || n.siteId === siteId : n.createdBy === me));
  const t = term.trim().toLowerCase();
  const notes = visible
    .filter((n) => (kind === "alle" || (kind === "persoenlich" ? !n.siteId : !!n.siteId)) && (!color || n.color === color) && (!t || n.text.toLowerCase().includes(t)) || n.id === fresh)
    .sort((a, b) => a.order - b.order);
  const filtered = kind !== "alle" || !!color || !!t;

  useEffect(() => {
    if (!focus) return;
    const el = document.querySelector<HTMLElement>(`[data-note="${focus}"]`);
    el?.scrollIntoView({ block: "center" });
    el?.querySelector("textarea")?.focus();
  }, [focus]);

  const add = () => {
    const id = uid();
    const target = kind === "persoenlich" ? "" : siteId || (kind === "baustelle" ? (activeSites(data)[0]?.id ?? "") : "");
    save("notes", { id, siteId: target, text: "", color: color || (target ? "yellow" : "grey"), order: Math.min(0, ...data.notes.map((n) => n.order)) - 1, createdBy: me, createdAt: now() });
    setFresh(id);
  };
  const drop = async (n: Note) => {
    if (n.text.trim() && !(await ask({ title: "Notiz löschen?" }))) return;
    const before = data;
    remove("notes", n.id);
    if (n.text.trim()) notify("Notiz gelöscht", { undo: () => restore(before) });
  };

  /* drag the grip: pointer events work with mouse, pen and touch alike */
  const dragRef = useRef(drag);
  dragRef.current = drag;
  const startDrag = (e: React.PointerEvent, id: string) => {
    if (filtered) return notify("Sortieren geht ohne aktive Filter.");
    e.preventDefault();
    setDrag({ id, over: id, after: false });
    const move = (ev: PointerEvent) => {
      const el = document.elementFromPoint(ev.clientX, ev.clientY)?.closest<HTMLElement>("[data-note]");
      if (!el) return;
      const r = el.getBoundingClientRect();
      setDrag((d) => d && { ...d, over: el.dataset.note!, after: ev.clientX > r.left + r.width / 2 });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      const d = dragRef.current;
      setDrag(null);
      if (!d || d.over === d.id) return;
      const ids = notes.map((n) => n.id).filter((x) => x !== d.id);
      ids.splice(ids.indexOf(d.over) + (d.after ? 1 : 0), 0, d.id);
      // only notes whose place changed are saved
      ids.forEach((id, i) => {
        const n = data.notes.find((x) => x.id === id)!;
        if (n.order !== i) save("notes", { ...n, order: i });
      });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
  };

  return (
    <div className="page">
      <PageHead
        title="Notizen"
        sub={siteId ? `${siteName(data, siteId)} und persönliche Notizen` : "Alle Baustellen und persönliche Notizen"}
        actions={
          <Button leftIcon={<Plus size={15} />} onClick={add}>
            Notiz
          </Button>
        }
      />
      <div className="toolbar">
        <Seg<Kind>
          label="Art"
          value={kind}
          onChange={setKind}
          options={[
            { value: "alle", label: "Alle" },
            { value: "baustelle", label: "Baustelle" },
            { value: "persoenlich", label: "Persönlich" }
          ]}
        />
        <div className="color-filter" role="radiogroup" aria-label="Farbe">
          <button type="button" role="radio" aria-checked={!color} className={cn(!color && "on")} onClick={() => setColor("")}>
            Alle Farben
          </button>
          {COLORS.map((c) => (
            <button key={c} type="button" role="radio" aria-checked={color === c} aria-label={NOTE_COLORS[c].label} title={NOTE_COLORS[c].label} className={cn("chip", color === c && "on")} style={{ background: NOTE_COLORS[c].bg, borderColor: NOTE_COLORS[c].edge }} onClick={() => setColor(color === c ? "" : c)} />
          ))}
        </div>
        <label className="search">
          <Search size={14} />
          <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Notizen durchsuchen" aria-label="Notizen durchsuchen" />
        </label>
        <span className="count">{filtered ? `${notes.length} von ${visible.length}` : visible.length} Notizen · Reihenfolge per Griff ziehen</span>
      </div>

      {notes.length ? (
        <div className={cn("note-board", drag && "dragging")}>
          {notes.map((n) => {
            const c = NOTE_COLORS[n.color] ?? NOTE_COLORS.yellow;
            const over = drag && drag.over === n.id && drag.id !== n.id;
            return (
              <article
                key={n.id}
                data-note={n.id}
                className={cn("note", drag?.id === n.id && "lifted", over && (drag.after ? "drop-after" : "drop-before"), focus === n.id && "focus")}
                style={{ "--note-bg": c.bg, "--note-edge": c.edge } as CSSProperties}
              >
                <header>
                  <button type="button" className="note-grip" aria-label="Ziehen zum Sortieren" title="Ziehen zum Sortieren" onPointerDown={(e) => startDrag(e, n.id)}>
                    <GripVertical size={14} />
                  </button>
                  <span className="note-site">
                    {n.siteId ? (
                      <>
                        <HardHat size={12} /> {siteName(data, n.siteId)}
                      </>
                    ) : (
                      <>
                        <User size={12} /> Persönlich
                      </>
                    )}
                  </span>
                  <Pop
                    trigger={(open, toggle) => (
                      <button type="button" className={cn("note-btn", open && "on")} onClick={toggle} aria-label="Notiz-Menü">
                        <MoreHorizontal size={15} />
                      </button>
                    )}
                  >
                    {(close) => (
                      <>
                        <DropdownMenuLabel>Farbe</DropdownMenuLabel>
                        <div className="note-colors">
                          {COLORS.map((k) => (
                            <button key={k} type="button" aria-label={NOTE_COLORS[k].label} title={NOTE_COLORS[k].label} style={{ background: NOTE_COLORS[k].bg, borderColor: NOTE_COLORS[k].edge }} onClick={() => (save("notes", { ...n, color: k }), close())}>
                              {n.color === k && <Check size={12} />}
                            </button>
                          ))}
                        </div>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Zuordnung</DropdownMenuLabel>
                        <DropdownMenuItem className={cn(!n.siteId && "on")} onClick={() => (save("notes", { ...n, siteId: "" }), close())}>
                          <User size={14} /> Persönlich
                        </DropdownMenuItem>
                        {activeSites(data).map((s) => (
                          <DropdownMenuItem key={s.id} className={cn(n.siteId === s.id && "on")} onClick={() => (save("notes", { ...n, siteId: s.id }), close())}>
                            <span className="swatch" style={{ background: s.color }} /> {s.name}
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="danger" onClick={() => (close(), void drop(n))}>
                          <Trash2 size={14} /> Löschen
                        </DropdownMenuItem>
                      </>
                    )}
                  </Pop>
                </header>
                <textarea
                  key={n.text}
                  defaultValue={n.text}
                  autoFocus={n.id === fresh}
                  placeholder="Notiz schreiben …"
                  aria-label="Notiztext"
                  onBlur={(e) => {
                    const text = e.target.value.trim();
                    if (n.id === fresh) setFresh("");
                    if (!text && !n.text) return remove("notes", n.id);
                    if (text !== n.text) save("notes", { ...n, text });
                  }}
                />
                <footer>
                  <Avatar id={n.createdBy} size={18} />
                  <span title={`Angelegt ${fmtDateTime(n.createdAt)}`}>
                    {personName(data, n.createdBy).split(" ")[0] || "–"} · {fmtDateTime(n.updatedAt ?? n.createdAt)}
                  </span>
                </footer>
              </article>
            );
          })}
          <button type="button" className="note note-add" onClick={add}>
            <Plus size={18} />
            Neue Notiz
          </button>
        </div>
      ) : (
        <Empty
          icon={<StickyNote size={28} />}
          title={visible.length ? "Keine Notiz für diesen Filter" : "Noch keine Notizen"}
          text={visible.length ? "Filter oder Suche anpassen." : "Kurze Hinweise für die Baustelle oder für dich selbst – farbig markiert und frei sortierbar."}
          action={
            <Button leftIcon={<Plus size={15} />} onClick={add}>
              Notiz anlegen
            </Button>
          }
        />
      )}
    </div>
  );
}
