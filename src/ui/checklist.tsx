"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { fmt, today } from "@/lib/date";
import { employeeName, uid, useStore } from "@/lib/store";
import type { SiteNode } from "@/lib/types";
import { activePeople, canRemove } from "./access";
import { Empty, Field, Sheet } from "./kit";

/** A plain list to tick off. */
export function Checklist({ projectId }: { projectId: string }) {
  const { data, save, notify } = useStore();
  const [text, setText] = useState("");
  const [edit, setEdit] = useState<SiteNode | null>(null);
  const [showDone, setShowDone] = useState(false);
  const t = today();
  const nodes = data.siteNodes.filter((n) => n.projectId === projectId);
  // points are the entries without sub-entries (older sites were grouped in areas)
  const points = nodes.filter((n) => !nodes.some((k) => k.parentId === n.id)).sort((a, b) => a.order - b.order);
  const open = points.filter((n) => n.status !== "erledigt");
  const done = points.filter((n) => n.status === "erledigt");
  const parent = (n: SiteNode) => nodes.find((x) => x.id === n.parentId)?.title;

  const add = () => {
    const title = text.trim();
    if (!title) return;
    save("siteNodes", { id: uid("n"), projectId, parentId: "", title, description: "", status: "offen", assigneeId: "", due: "", order: Date.now(), kind: "point" }, `Punkt „${title}“ angelegt`);
    setText("");
  };
  const tick = (n: SiteNode, on: boolean) => {
    save("siteNodes", { ...n, status: on ? "erledigt" : "offen" }, `„${n.title}“ ${on ? "erledigt" : "wieder offen"}`);
    if (on) notify("Erledigt ✓");
  };

  const row = (n: SiteNode) => (
    <li key={n.id} className={n.status === "erledigt" ? "done" : ""}>
      <input type="checkbox" className="v-check" checked={n.status === "erledigt"} onChange={(e) => tick(n, e.target.checked)} aria-label={`${n.title} erledigt`} />
      <button type="button" className="v-list-main" onClick={() => setEdit(n)}>
        <strong>{n.title}</strong>
        {(parent(n) || n.assigneeId || n.due) && (
          <small>
            {[parent(n), n.assigneeId ? employeeName(data, n.assigneeId) : ""].filter(Boolean).join(" · ")}
            {n.due && n.status !== "erledigt" && <span className={n.due < t ? "late" : ""}> · bis {fmt(n.due).slice(0, 6)}</span>}
          </small>
        )}
      </button>
    </li>
  );

  return (
    <div className="v-tab">
      <form
        className="v-add"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Neuer Punkt … (Enter)" aria-label="Neuer Punkt" />
        <button type="submit" className="v-btn primary" disabled={!text.trim()}>
          Hinzufügen
        </button>
      </form>
      {open.length === 0 ? (
        <Empty>{done.length ? "Alles erledigt." : "Noch keine Punkte. Schreib oben, was zu tun ist."}</Empty>
      ) : (
        <ul className="v-card v-list">{open.map(row)}</ul>
      )}
      {done.length > 0 && (
        <>
          <button type="button" className="v-link v-more" onClick={() => setShowDone((s) => !s)}>
            Erledigt ({done.length})
          </button>
          {showDone && <ul className="v-card v-list">{done.map(row)}</ul>}
        </>
      )}
      {edit && <PointSheet point={edit} onClose={() => setEdit(null)} />}
    </div>
  );
}

function PointSheet({ point, onClose }: { point: SiteNode; onClose: () => void }) {
  const { data, save, remove } = useStore();
  const [v, setV] = useState(point);
  return (
    <Sheet
      title="Punkt"
      onClose={onClose}
      footer={
        <>
          {canRemove(data) && (
            <button
              type="button"
              className="v-btn ghost danger"
              onClick={() => {
                remove("siteNodes", point.id, `Punkt „${point.title}“ gelöscht`);
                onClose();
              }}
            >
              <Trash2 size={16} /> Löschen
            </button>
          )}
          <span className="v-grow" />
          <button type="button" className="v-btn ghost" onClick={onClose}>
            Abbrechen
          </button>
          <button
            type="button"
            className="v-btn primary"
            disabled={!v.title.trim()}
            onClick={() => {
              save("siteNodes", { ...v, title: v.title.trim() });
              onClose();
            }}
          >
            Speichern
          </button>
        </>
      }
    >
      <Field label="Was ist zu tun?">
        <input value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} />
      </Field>
      <div className="v-row2">
        <Field label="Wer?">
          <select value={v.assigneeId} onChange={(e) => setV({ ...v, assigneeId: e.target.value })}>
            <option value="">–</option>
            {activePeople(data).map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Bis wann?">
          <input type="date" value={v.due} onChange={(e) => setV({ ...v, due: e.target.value })} />
        </Field>
      </div>
    </Sheet>
  );
}
