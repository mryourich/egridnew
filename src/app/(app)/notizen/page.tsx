"use client";

import { Lock, Plus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { PageHeader } from "@/components/ui";
import { fmt, today } from "@/lib/date";
import { uid, useStore } from "@/lib/store";
import type { Note } from "@/lib/types";

const COLORS = ["#fef3c7", "#ffedd5", "#dcfce7", "#dbeafe", "#fce7f3", "#ede9fe"];

/** Private sticky notes: only the owner ever sees them. Drag by the top bar, resize at the corner. */
export default function NotesPage() {
  const { data, save, remove } = useStore();
  const me = data.currentUserId;
  const notes = data.notes.filter((n) => n.ownerId === me);
  const [drag, setDrag] = useState<{ id: string; dx: number; dy: number } | null>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const board = useRef<HTMLDivElement>(null);

  const add = () => {
    const i = notes.length;
    save("notes", { id: uid("no"), ownerId: me, title: "", text: "", color: COLORS[i % COLORS.length], x: 24 + (i % 4) * 30, y: 24 + (i % 4) * 30, w: 260, h: 230, createdAt: today() });
  };

  return (
    <div className="page page-wide">
      <PageHeader
        title="Notizen"
        subtitle={
          <>
            <Lock size={12} /> Privat – nur du siehst deine Zettel. Oben anfassen zum Verschieben, Ecke ziehen für die Größe.
          </>
        }
        actions={
          <button type="button" className="btn btn-primary" onClick={add}>
            <Plus size={15} /> Sticky Note
          </button>
        }
      />
      <div
        ref={board}
        className={`note-board ${drag ? "is-dragging" : ""}`}
        onPointerMove={(e) => {
          if (!drag || !board.current) return;
          const r = board.current.getBoundingClientRect();
          setPos({ x: Math.max(0, e.clientX - r.left - drag.dx), y: Math.max(0, e.clientY - r.top - drag.dy) });
        }}
        onPointerUp={() => {
          if (drag && pos) {
            const n = notes.find((x) => x.id === drag.id);
            if (n) save("notes", { ...n, x: Math.round(pos.x), y: Math.round(pos.y) });
          }
          setDrag(null);
          setPos(null);
        }}
      >
        {notes.length === 0 && <p className="note-empty">Noch keine Notizen – „Sticky Note“ oben rechts.</p>}
        {notes.map((n) => (
          <NoteCard
            key={n.id}
            note={n}
            at={drag?.id === n.id && pos ? pos : { x: n.x, y: n.y }}
            dragging={drag?.id === n.id}
            onGrab={(e) => {
              const r = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
              setDrag({ id: n.id, dx: e.clientX - r.left, dy: e.clientY - r.top });
            }}
            onChange={(patch) => save("notes", { ...n, ...patch })}
            onDelete={() => window.confirm("Notiz löschen?") && remove("notes", n.id)}
          />
        ))}
      </div>
    </div>
  );
}

function NoteCard({
  note,
  at,
  dragging,
  onGrab,
  onChange,
  onDelete
}: {
  note: Note;
  at: { x: number; y: number };
  dragging: boolean;
  onGrab: (e: React.PointerEvent<HTMLElement>) => void;
  onChange: (patch: Partial<Note>) => void;
  onDelete: () => void;
}) {
  const ref = useRef<HTMLElement>(null);
  return (
    <article
      ref={ref}
      className={`note ${dragging ? "dragging" : ""}`}
      style={{ left: at.x, top: at.y, width: note.w, height: note.h, background: note.color }}
      onPointerUp={() => {
        const el = ref.current;
        if (el && (Math.abs(el.offsetWidth - note.w) > 2 || Math.abs(el.offsetHeight - note.h) > 2)) onChange({ w: el.offsetWidth, h: el.offsetHeight });
      }}
    >
      <header onPointerDown={onGrab}>
        <span className="note-tag">
          <Lock size={11} /> Privat
        </span>
        <span className="note-colors" onPointerDown={(e) => e.stopPropagation()}>
          {COLORS.map((c) => (
            <button key={c} type="button" style={{ background: c }} className={c === note.color ? "on" : ""} onClick={() => onChange({ color: c })} aria-label="Farbe" />
          ))}
        </span>
        <button type="button" className="icon-btn" onPointerDown={(e) => e.stopPropagation()} onClick={onDelete} aria-label="Löschen">
          <Trash2 size={14} />
        </button>
      </header>
      <input className="note-title" value={note.title} placeholder="Titel" onChange={(e) => onChange({ title: e.target.value })} />
      <textarea className="note-text" value={note.text} placeholder="Notiz…" onChange={(e) => onChange({ text: e.target.value })} />
      <footer>{fmt(note.createdAt)}</footer>
    </article>
  );
}
