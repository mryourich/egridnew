"use client";

import { AlertTriangle, Camera, CheckCircle2, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { addDays, fmt, today } from "@/lib/date";
import * as L from "@/lib/labels";
import { nodeOptions } from "@/lib/site";
import { canDelete, currentUser, employeeName, plannable, uid, useStore } from "@/lib/store";
import type { Issue, IssueStatus, Severity } from "@/lib/types";
import { ISSUE_LABELS, Trail } from "./trail";
import { downscale, Portal } from "./ui";

const SEVERITY_COLOR: Record<Severity, string> = { niedrig: "#64748b", mittel: "#d97706", hoch: "#dc2626", kritisch: "#991b1b" };

/** True on phones/tablets – there the camera opens first. */
function isTouch() {
  return typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
}

/**
 * „Mangel“ button: on a phone it opens the camera straight away and then the
 * defect card with the photo; on a desktop it opens the card directly.
 */
export function IssueButton({ projectId, nodeId = "", location = "", className = "btn", label = "Mangel", iconOnly = false }: { projectId: string; nodeId?: string; location?: string; className?: string; label?: string; iconOnly?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<Partial<Issue> | null>(null);
  const [shot, setShot] = useState("");

  return (
    <>
      <button
        type="button"
        className={className}
        title="Mangel melden"
        onClick={(e) => {
          e.stopPropagation();
          // the card always opens; on a phone the camera opens on top of it
          setShot("");
          setDraft({ projectId, nodeId, location });
          if (isTouch()) input.current?.click();
        }}
      >
        <AlertTriangle size={15} /> {!iconOnly && label}
      </button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) setShot(await downscale(file, 1280));
          e.target.value = "";
        }}
      />
      {draft && <IssueSheet issue={draft} photo={shot} onClose={() => setDraft(null)} />}
    </>
  );
}

/** Defect card – same look and feel as the job popover. */
export function IssueSheet({ issue, photo, onClose }: { issue: Partial<Issue>; photo?: string; onClose: () => void }) {
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
    nodeId: issue.nodeId ?? "",
    fixPhoto: issue.fixPhoto ?? "",
    fixNote: issue.fixNote ?? "",
    fixedAt: issue.fixedAt,
    fixedBy: issue.fixedBy
  });
  const photoInput = useRef<HTMLInputElement>(null);
  const fixInput = useRef<HTMLInputElement>(null);
  const me = currentUser(data);
  const set = (patch: Partial<Issue>) => setV((o) => ({ ...o, ...patch }));
  const project = data.projects.find((p) => p.id === v.projectId);

  useEffect(() => {
    if (photo) setV((o) => ({ ...o, photo }));
  }, [photo]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);

  const submit = () => {
    // a photo alone is enough – the title then comes from the point
    const title = v.title.trim() || (v.location ? `Mangel – ${v.location}` : `Mangel vom ${fmt(today())}`);
    const done = v.status === "erledigt";
    // who fixed it and when is recorded once; reopening clears it
    const item: Issue = done
      ? { ...v, title, fixNote: v.fixNote?.trim(), fixedAt: v.fixedAt || today(), fixedBy: v.fixedBy || me?.id }
      : { ...v, title, fixedAt: undefined, fixedBy: undefined };
    const was = data.issues.find((i) => i.id === v.id)?.status;
    save("issues", item, isNew ? `Mangel „${item.title}“ gemeldet` : done && was !== "erledigt" ? `Mangel „${item.title}“ behoben` : `Mangel „${item.title}“ aktualisiert`);
    notify(isNew ? "Mangel gemeldet" : done && was !== "erledigt" ? "Als behoben gemeldet ✓" : "Mangel gespeichert");
    onClose();
  };

  return (
    <Portal>
    <div className="sheet-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="job-pop issue-sheet" style={{ "--c": v.status === "erledigt" ? "#059669" : SEVERITY_COLOR[v.severity] } as CSSProperties} role="dialog" aria-label={isNew ? "Neuer Mangel" : "Mangel"}>
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
                {plannable(data).map((e) => (
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

          {!isNew && v.status === "erledigt" && (
            <div className="fix-box">
              <strong>
                <CheckCircle2 size={14} /> Behebung
                {v.fixedAt && (
                  <small>
                    {fmt(v.fixedAt)}
                    {v.fixedBy ? ` · ${employeeName(data, v.fixedBy)}` : ""}
                  </small>
                )}
              </strong>
              <div className={`issue-photo-slot fix ${v.fixPhoto ? "has" : ""}`}>
                {v.fixPhoto ? (
                  <>
                    <img src={v.fixPhoto} alt="Nach Behebung" />
                    <span className="slot-actions">
                      <button type="button" className="btn btn-sm" onClick={() => fixInput.current?.click()}>
                        <Camera size={13} /> Neu
                      </button>
                      <button type="button" className="btn btn-sm" onClick={() => set({ fixPhoto: "" })} aria-label="Foto entfernen">
                        <Trash2 size={13} />
                      </button>
                    </span>
                  </>
                ) : (
                  <button type="button" onClick={() => fixInput.current?.click()}>
                    <Camera size={20} />
                    <span>Foto nach Behebung</span>
                  </button>
                )}
                <input
                  ref={fixInput}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  hidden
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) set({ fixPhoto: await downscale(file, 1280) });
                    e.target.value = "";
                  }}
                />
              </div>
              <div className="job-grid">
                <label className="full">
                  <span>Was wurde gemacht?</span>
                  <textarea rows={2} value={v.fixNote ?? ""} onChange={(e) => set({ fixNote: e.target.value })} placeholder="z. B. Konsolen nachgezogen, Drehmoment geprüft" />
                </label>
              </div>
            </div>
          )}

          {!isNew && (
            <div className="sheet-trail">
              <span>Verlauf</span>
              <Trail item={data.issues.find((i) => i.id === v.id) ?? v} labels={ISSUE_LABELS} created="Gemeldet" />
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
            <button type="submit" className="btn btn-sm btn-primary">
              {isNew ? "Melden" : v.status === "erledigt" && data.issues.find((i) => i.id === v.id)?.status !== "erledigt" ? "Behoben melden" : "Speichern"}
            </button>
          </footer>
        </form>
      </div>
    </div>
    </Portal>
  );
}
