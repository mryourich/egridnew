"use client";

import { AlertTriangle, Camera, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { addDays, today } from "@/lib/date";
import * as L from "@/lib/labels";
import { nodeOptions } from "@/lib/site";
import { canDelete, uid, useStore } from "@/lib/store";
import type { Issue, IssueStatus, Severity } from "@/lib/types";
import { downscale } from "./ui";

const SEVERITY_COLOR: Record<Severity, string> = { niedrig: "#64748b", mittel: "#d97706", hoch: "#dc2626", kritisch: "#991b1b" };

/** True on phones/tablets – there the camera opens first. */
function isTouch() {
  return typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
}

/**
 * „Mangel“ button: on a phone it opens the camera straight away and then the
 * defect card with the photo; on a desktop it opens the card directly.
 */
export function IssueButton({ projectId, nodeId = "", location = "", className = "btn", label = "Mangel" }: { projectId: string; nodeId?: string; location?: string; className?: string; label?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<Partial<Issue> | null>(null);

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => {
          if (isTouch()) input.current?.click();
          else setDraft({ projectId, nodeId, location });
        }}
      >
        <AlertTriangle size={15} /> {label}
      </button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          const photo = file ? await downscale(file, 1280) : "";
          setDraft({ projectId, nodeId, location, photo });
          e.target.value = "";
        }}
      />
      {draft && <IssueSheet issue={draft} onClose={() => setDraft(null)} />}
    </>
  );
}

/** Defect card – same look and feel as the job popover. */
export function IssueSheet({ issue, onClose }: { issue: Partial<Issue>; onClose: () => void }) {
  const { data, save, remove, notify } = useStore();
  const isNew = !issue.id;
  const [v, setV] = useState<Issue>({
    id: issue.id ?? uid("i"),
    projectId: issue.projectId ?? data.projects[0]?.id ?? "",
    kind: issue.kind ?? "mangel",
    title: issue.title ?? "",
    description: issue.description ?? "",
    location: issue.location ?? "",
    severity: issue.severity ?? "mittel",
    status: issue.status ?? "offen",
    assigneeId: issue.assigneeId ?? "",
    due: issue.due ?? addDays(today(), 3),
    createdAt: issue.createdAt ?? today(),
    photo: issue.photo ?? "",
    nodeId: issue.nodeId ?? ""
  });
  const photoInput = useRef<HTMLInputElement>(null);
  const set = (patch: Partial<Issue>) => setV((o) => ({ ...o, ...patch }));
  const project = data.projects.find((p) => p.id === v.projectId);

  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);

  const submit = () => {
    if (!v.title.trim()) return;
    save("issues", { ...v, title: v.title.trim() }, isNew ? `Mangel „${v.title.trim()}“ gemeldet` : `Mangel „${v.title.trim()}“ aktualisiert`);
    notify(isNew ? "Mangel gemeldet" : "Mangel gespeichert");
    onClose();
  };

  return (
    <div className="sheet-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="job-pop issue-sheet" style={{ "--c": SEVERITY_COLOR[v.severity] } as CSSProperties} role="dialog" aria-label={isNew ? "Neuer Mangel" : "Mangel"}>
        <header>
          <span>
            {isNew ? "Neuer Mangel" : "Mangel"}
            {project && <small> · {project.name}</small>}
          </span>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Schließen">
            <X size={16} />
          </button>
        </header>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className={`issue-photo-slot ${v.photo ? "has" : ""}`}>
            {v.photo ? (
              <>
                <img src={v.photo} alt="" />
                <span className="slot-actions">
                  <button type="button" className="btn btn-sm" onClick={() => photoInput.current?.click()}>
                    <Camera size={13} /> Neu
                  </button>
                  <button type="button" className="btn btn-sm" onClick={() => set({ photo: "" })}>
                    <Trash2 size={13} />
                  </button>
                </span>
              </>
            ) : (
              <button type="button" onClick={() => photoInput.current?.click()}>
                <Camera size={22} />
                <span>Foto aufnehmen</span>
              </button>
            )}
            <input
              ref={photoInput}
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) set({ photo: await downscale(file, 1280) });
                e.target.value = "";
              }}
            />
          </div>

          <input className="job-title" autoFocus={!isTouch()} value={v.title} onChange={(e) => set({ title: e.target.value })} placeholder="Was ist das Problem?" aria-label="Titel" />

          <div className="sev-chips" role="radiogroup" aria-label="Priorität">
            {(Object.keys(L.severity) as Severity[]).map((s) => (
              <button key={s} type="button" role="radio" aria-checked={v.severity === s} className={v.severity === s ? "on" : ""} style={{ "--s": SEVERITY_COLOR[s] } as CSSProperties} onClick={() => set({ severity: s })}>
                {L.severity[s].label}
              </button>
            ))}
          </div>

          <div className="job-grid">
            <label className="full">
              <span>Bereich / Punkt</span>
              <select value={v.nodeId} onChange={(e) => set({ nodeId: e.target.value })}>
                <option value="">– ohne –</option>
                {nodeOptions(data.siteNodes, v.projectId).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Zuständig</span>
              <select value={v.assigneeId} onChange={(e) => set({ assigneeId: e.target.value })}>
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
              <span>Frist</span>
              <input type="date" value={v.due} onChange={(e) => set({ due: e.target.value })} />
            </label>
            <label className="full">
              <span>Beschreibung</span>
              <textarea rows={2} value={v.description} onChange={(e) => set({ description: e.target.value })} placeholder="optional" />
            </label>
          </div>

          {!isNew && (
            <div className="status-switch" role="group" aria-label="Status">
              {(Object.keys(L.issueStatus) as IssueStatus[]).map((st) => (
                <button key={st} type="button" className={v.status === st ? `on tone-${L.issueStatus[st].tone}` : ""} onClick={() => set({ status: st })}>
                  {L.issueStatus[st].label}
                </button>
              ))}
            </div>
          )}

          <footer>
            {!isNew && canDelete(data) && (
              <button
                type="button"
                className="icon-btn"
                title="Löschen"
                onClick={() => {
                  if (!window.confirm("Mangel löschen?")) return;
                  remove("issues", v.id, `Mangel „${v.title}“ gelöscht`);
                  onClose();
                }}
              >
                <Trash2 size={15} />
              </button>
            )}
            <span className="spacer" />
            <button type="button" className="btn btn-sm btn-ghost" onClick={onClose}>
              Abbrechen
            </button>
            <button type="submit" className="btn btn-sm btn-primary" disabled={!v.title.trim()}>
              {isNew ? "Melden" : "Speichern"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
