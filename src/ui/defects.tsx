"use client";

import { AlertTriangle, Camera, CheckCircle2, FileText, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { downscale } from "@/components/ui";
import { fmt, today } from "@/lib/date";
import { employeeName, uid, useStore } from "@/lib/store";
import type { Issue } from "@/lib/types";
import { activePeople, canRemove, me } from "./access";
import { Empty, Field, Sheet } from "./kit";

/** Defects: photo, what, who – done. */
export function Defects({ projectId }: { projectId: string }) {
  const { data } = useStore();
  const q = useSearchParams();
  const [showDone, setShowDone] = useState(false);
  const [edit, setEdit] = useState<Partial<Issue> | null>(null);
  const t = today();
  const all = data.issues.filter((i) => i.projectId === projectId).sort((a, b) => (b.createdTs ?? b.createdAt).localeCompare(a.createdTs ?? a.createdAt));
  const list = all.filter((i) => (showDone ? i.status === "erledigt" : i.status !== "erledigt"));
  const doneCount = all.filter((i) => i.status === "erledigt").length;

  useEffect(() => {
    if (q.get("neu")) setEdit({ projectId });
  }, [q, projectId]);

  return (
    <div className="v-tab">
      <div className="v-actions">
        <button type="button" className="v-btn primary big" onClick={() => setEdit({ projectId })}>
          <Plus size={19} /> Mangel melden
        </button>
        <div className="v-switch small">
          <button type="button" className={!showDone ? "on" : ""} onClick={() => setShowDone(false)}>
            Offen ({all.length - doneCount})
          </button>
          <button type="button" className={showDone ? "on" : ""} onClick={() => setShowDone(true)}>
            Erledigt ({doneCount})
          </button>
        </div>
        <span className="v-grow" />
        {all.length > 0 && (
          <a className="v-link" href={`/maengelbericht/${projectId}`} target="_blank" rel="noreferrer">
            <FileText size={16} /> Mängelbericht (PDF)
          </a>
        )}
      </div>
      {list.length === 0 ? (
        <Empty>{showDone ? "Noch nichts erledigt." : "Keine offenen Mängel."}</Empty>
      ) : (
        <ul className="v-card v-list">
          {list.map((i) => (
            <li key={i.id} className={i.status === "erledigt" ? "done" : ""}>
              <button type="button" className="v-defect" onClick={() => setEdit(i)}>
                {i.fixPhoto || i.photo ? (
                  <img src={i.fixPhoto || i.photo} alt="" />
                ) : (
                  <span className="v-defect-ic">
                    <AlertTriangle size={18} />
                  </span>
                )}
                <span className="v-list-main">
                  <strong>{i.title}</strong>
                  <small>
                    {[i.location, i.assigneeId ? employeeName(data, i.assigneeId) : ""].filter(Boolean).join(" · ") || "niemand zugeteilt"}
                    {i.status !== "erledigt" && i.due && <span className={i.due < t ? "late" : ""}> · bis {fmt(i.due).slice(0, 6)}</span>}
                    {i.status === "erledigt" && i.fixedAt && <> · erledigt {fmt(i.fixedAt).slice(0, 6)}</>}
                  </small>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {edit && <DefectSheet issue={edit} onClose={() => setEdit(null)} />}
    </div>
  );
}

function PhotoSlot({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className={`v-photo-slot ${value ? "has" : ""}`}>
      {value ? <img src={value} alt="" /> : null}
      <button type="button" className="v-btn" onClick={() => input.current?.click()}>
        <Camera size={17} /> {value ? "Neues Foto" : label}
      </button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (f) onChange(await downscale(f, 1280));
          e.target.value = "";
        }}
      />
    </div>
  );
}

function DefectSheet({ issue, onClose }: { issue: Partial<Issue>; onClose: () => void }) {
  const { data, save, remove, notify } = useStore();
  const isNew = !issue.id;
  const t = today();
  const [v, setV] = useState<Issue>({
    id: issue.id ?? uid("i"),
    projectId: issue.projectId!,
    kind: issue.kind ?? "mangel",
    title: issue.title ?? "",
    description: issue.description ?? "",
    location: issue.location ?? "",
    severity: issue.severity ?? "mittel",
    status: issue.status ?? "offen",
    assigneeId: issue.assigneeId ?? "",
    due: issue.due ?? "",
    createdAt: issue.createdAt ?? t,
    photo: issue.photo ?? "",
    nodeId: issue.nodeId ?? "",
    plan: issue.plan,
    fixPhoto: issue.fixPhoto ?? "",
    fixNote: issue.fixNote ?? "",
    fixedAt: issue.fixedAt,
    fixedBy: issue.fixedBy,
    createdBy: issue.createdBy,
    createdTs: issue.createdTs,
    history: issue.history
  });
  const set = (p: Partial<Issue>) => setV((o) => ({ ...o, ...p }));
  const done = v.status === "erledigt";

  const store = (item: Issue, msg: string, toast: string) => {
    save("issues", { ...item, title: item.title.trim() || (item.location ? `Mangel – ${item.location}` : `Mangel vom ${fmt(t)}`) }, msg);
    notify(toast);
    onClose();
  };

  return (
    <Sheet
      title={isNew ? "Mangel melden" : done ? "Mangel (erledigt)" : "Mangel"}
      onClose={onClose}
      footer={
        <>
          {!isNew && canRemove(data) && (
            <button
              type="button"
              className="v-btn ghost danger"
              onClick={() => {
                remove("issues", v.id, `Mangel „${v.title}“ gelöscht`);
                onClose();
              }}
            >
              <Trash2 size={16} />
            </button>
          )}
          {!isNew &&
            (done ? (
              <button type="button" className="v-btn ghost" onClick={() => store({ ...v, status: "offen", fixedAt: undefined, fixedBy: undefined }, `Mangel „${v.title}“ wieder offen`, "Wieder offen")}>
                <RotateCcw size={16} /> Wieder öffnen
              </button>
            ) : (
              <button type="button" className="v-btn ok" onClick={() => store({ ...v, status: "erledigt", fixedAt: t, fixedBy: me(data)?.id }, `Mangel „${v.title}“ erledigt`, "Erledigt ✓")}>
                <CheckCircle2 size={16} /> Erledigt
              </button>
            ))}
          <span className="v-grow" />
          <button type="button" className="v-btn primary" onClick={() => store(v, isNew ? `Mangel „${v.title}“ gemeldet` : `Mangel „${v.title}“ geändert`, isNew ? "Mangel gemeldet" : "Gespeichert")}>
            {isNew ? "Melden" : "Speichern"}
          </button>
        </>
      }
    >
      <PhotoSlot value={v.photo} onChange={(photo) => set({ photo })} label="Foto aufnehmen" />
      <Field label="Was ist das Problem?">
        <input value={v.title} onChange={(e) => set({ title: e.target.value })} placeholder="z. B. Steckdose locker" />
      </Field>
      <Field label="Wo? (optional)">
        <input value={v.location} onChange={(e) => set({ location: e.target.value })} placeholder="z. B. Bad, 1. Stock" />
      </Field>
      <div className="v-row2">
        <Field label="Wer kümmert sich?">
          <select value={v.assigneeId} onChange={(e) => set({ assigneeId: e.target.value })}>
            <option value="">–</option>
            {activePeople(data).map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Bis wann? (optional)">
          <input type="date" value={v.due} onChange={(e) => set({ due: e.target.value })} />
        </Field>
      </div>
      {!isNew && (
        <div className="v-fix">
          <strong>Nach der Behebung</strong>
          <PhotoSlot value={v.fixPhoto ?? ""} onChange={(fixPhoto) => set({ fixPhoto })} label="Foto danach" />
          {done && v.fixedAt && (
            <small>
              Erledigt am {fmt(v.fixedAt)}
              {v.fixedBy ? ` von ${employeeName(data, v.fixedBy)}` : ""}
            </small>
          )}
        </div>
      )}
    </Sheet>
  );
}
