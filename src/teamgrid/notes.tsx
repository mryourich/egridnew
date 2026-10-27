"use client";

import { Pin, PinOff, Trash2 } from "lucide-react";
import { useState } from "react";
import { fmtWhen } from "@/core/format";
import { now, personName, uid, useStore } from "@/core/store";
import type { Note, Project } from "@/core/types";
import { Avatar, Button, IconButton, PageHead } from "@/core/ui";
import { access } from "./model";

/** Site journal: short notes everyone on the project can read; important ones pinned on top. */
export function Notes({ project: p }: { project: Project }) {
  const { data, save, remove } = useStore();
  const { work, manage } = access(data, p);
  const [text, setText] = useState("");
  const list = data.notes.filter((n) => n.projectId === p.id).sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt.localeCompare(a.createdAt));
  const add = () => {
    if (!text.trim()) return;
    save("notes", { id: uid(), projectId: p.id, text: text.trim(), pinned: false, createdBy: data.meId, createdAt: now() }, "Notiz geschrieben");
    setText("");
  };
  const mine = (n: Note) => manage || n.createdBy === data.meId;

  return (
    <div className="page narrow">
      <PageHead kicker="Notizen" title="Baustellen-Journal" sub="Absprachen, Zugänge, Besonderheiten – für alle im Projekt." />
      {work && (
        <div className="panel composer">
          <textarea
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => (e.ctrlKey || e.metaKey) && e.key === "Enter" && add()}
            placeholder="Was sollen die anderen wissen? (Strg + Enter speichert)"
            aria-label="Neue Notiz"
          />
          <div>
            <Button variant="primary" onClick={add} disabled={!text.trim()}>
              Notiz speichern
            </Button>
          </div>
        </div>
      )}
      {list.length === 0 && <p className="panel-empty">Noch keine Notizen.</p>}
      <ul className="notes">
        {list.map((n) => (
          <li key={n.id} className={`panel note ${n.pinned ? "pinned" : ""}`}>
            <header>
              <Avatar id={n.createdBy} size={26} />
              <span>
                <strong>{personName(data, n.createdBy) || "–"}</strong>
                <small>
                  {fmtWhen(n.createdAt)}
                  {n.updatedAt && " · bearbeitet"}
                </small>
              </span>
              {work && (
                <IconButton label={n.pinned ? "Lösen" : "Anheften"} onClick={() => save("notes", { ...n, pinned: !n.pinned })} className={n.pinned ? "on" : ""}>
                  {n.pinned ? <PinOff size={15} /> : <Pin size={15} />}
                </IconButton>
              )}
              {work && mine(n) && (
                <IconButton label="Löschen" onClick={() => window.confirm("Notiz löschen?") && remove("notes", n.id, "Notiz gelöscht")}>
                  <Trash2 size={15} />
                </IconButton>
              )}
            </header>
            {work && mine(n) ? (
              <textarea
                key={n.text}
                className="note-text"
                defaultValue={n.text}
                rows={Math.max(2, n.text.split("\n").length)}
                onBlur={(e) => e.target.value.trim() && e.target.value !== n.text && save("notes", { ...n, text: e.target.value })}
                aria-label="Notiz"
              />
            ) : (
              <p className="note-text">{n.text}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
