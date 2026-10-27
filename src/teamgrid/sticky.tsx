"use client";

import { Pin, PinOff, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { fmtWhen } from "@/core/format";
import { canManage, canWork } from "@/core/roles";
import { now, personName, uid, useStore } from "@/core/store";
import type { Note } from "@/core/types";
import { Avatar } from "@/core/ui";

export const NOTE_COLORS = ["#fff4b8", "#ffd9c2", "#d6f0c9", "#cfe6ff", "#ead7ff"];

/**
 * Sticky notes, written and changed right on the board – clicking anywhere else saves.
 * Personal notes (projectId "") or notes of a project; pinned project notes appear on everyone's dashboard.
 */
export function StickyBoard({ notes, projectId, showProject, empty, add: canAdd = true }: { notes: Note[]; projectId: string; showProject?: boolean; empty: string; add?: boolean }) {
  const { data, save, remove } = useStore();
  const [fresh, setFresh] = useState("");
  const project = projectId ? data.projects.find((p) => p.id === projectId) : undefined;
  const mayAdd = canAdd && (project ? canWork(data, project) : true);
  const sorted = [...notes].sort((a, b) => Number(b.pinned) - Number(a.pinned) || (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt));

  const add = () => {
    const id = uid();
    save("notes", { id, projectId, text: "", pinned: false, color: NOTE_COLORS[notes.length % NOTE_COLORS.length], createdBy: data.meId, createdAt: now() });
    setFresh(id);
  };
  const mayEdit = (n: Note) => {
    if (!n.projectId) return n.createdBy === data.meId;
    const p = data.projects.find((x) => x.id === n.projectId);
    return !!p && (n.createdBy === data.meId ? canWork(data, p) : canManage(data, p));
  };

  return (
    <div className="sticky-board">
      {sorted.map((n) => {
        const edit = mayEdit(n);
        const p = n.projectId ? data.projects.find((x) => x.id === n.projectId) : undefined;
        return (
          <div key={n.id} className={`sticky ${n.pinned ? "pinned" : ""}`} style={{ background: n.color }}>
            {showProject && p && (
              <Link href={`/projekte/${p.id}/notizen`} className="sticky-project">
                <i style={{ background: p.color }} />
                {p.name}
              </Link>
            )}
            {edit ? (
              <textarea
                key={n.text}
                defaultValue={n.text}
                autoFocus={n.id === fresh}
                placeholder="Notiz …"
                aria-label="Notiz"
                rows={Math.max(4, n.text.split("\n").length + 1)}
                onBlur={(e) => {
                  const text = e.target.value;
                  if (!text.trim() && !n.text) return remove("notes", n.id);
                  if (text !== n.text) save("notes", { ...n, text }, n.projectId && !n.text ? "Notiz geschrieben" : undefined);
                }}
              />
            ) : (
              <p className="sticky-text">{n.text}</p>
            )}
            <footer>
              <Avatar id={n.createdBy} size={18} />
              <span className="sticky-meta" title={personName(data, n.createdBy)}>
                {personName(data, n.createdBy).split(" ")[0]} · {fmtWhen(n.updatedAt ?? n.createdAt)}
              </span>
              {edit && (
                <span className="sticky-colors">
                  {NOTE_COLORS.map((c) => (
                    <button key={c} type="button" style={{ background: c }} className={c === n.color ? "on" : ""} aria-label="Farbe" onClick={() => save("notes", { ...n, color: c })} />
                  ))}
                </span>
              )}
              {n.projectId && p && canWork(data, p) && (
                <button type="button" className={`sticky-btn ${n.pinned ? "on" : ""}`} title={n.pinned ? "Vom Dashboard nehmen" : "Aufs Dashboard aller im Projekt heften"} onClick={() => save("notes", { ...n, pinned: !n.pinned })}>
                  {n.pinned ? <PinOff size={13} /> : <Pin size={13} />}
                </button>
              )}
              {edit && (
                <button type="button" className="sticky-btn" title="Notiz löschen" onClick={() => (n.text.trim() ? window.confirm("Notiz löschen?") : true) && remove("notes", n.id, n.projectId ? "Notiz gelöscht" : undefined)}>
                  <Trash2 size={13} />
                </button>
              )}
            </footer>
          </div>
        );
      })}
      {mayAdd && (
        <button type="button" className="sticky sticky-add" onClick={add}>
          <Plus size={18} />
          {notes.length ? "Neue Notiz" : empty}
        </button>
      )}
    </div>
  );
}
