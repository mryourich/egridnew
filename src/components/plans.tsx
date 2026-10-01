"use client";

import { AlertTriangle, Crosshair, Maximize, Minus, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { today } from "@/lib/date";
import * as L from "@/lib/labels";
import { canDelete, employeeName, isManager, uid, useStore } from "@/lib/store";
import type { Issue, Project, SitePlan } from "@/lib/types";
import { IssueSheet } from "./issue-sheet";
import { Empty, Segmented } from "./ui";

const PIN: Record<string, string> = { kritisch: "#c62828", hoch: "#e5383b", mittel: "#f59e0b", niedrig: "#1a5cff" };

/** Plans of a site: upload PDF or pictures, zoom and pan, set defects by clicking on the plan. */
export function PlansSection({ project }: { project: Project }) {
  const { data, save, remove, notify } = useStore();
  const manager = isManager(data);
  const plans = data.plans.filter((p) => p.projectId === project.id).sort((a, b) => a.name.localeCompare(b.name, "de", { numeric: true }));
  const [currentId, setCurrentId] = useState("");
  const plan = plans.find((p) => p.id === currentId) ?? plans[0];
  const [busy, setBusy] = useState("");
  const input = useRef<HTMLInputElement>(null);

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy("Plan wird gelesen …");
    try {
      const { planPages } = await import("@/lib/plan-file");
      let first = "";
      let n = 0;
      for (const f of Array.from(files)) {
        for (const page of await planPages(f)) {
          const id = uid("pl");
          first ||= id;
          n++;
          save("plans", { id, projectId: project.id, ...page, addedAt: today(), addedBy: data.currentUserId }, `Plan „${page.name}“ hochgeladen`);
        }
      }
      if (first) setCurrentId(first);
      notify(n > 1 ? `${n} Planseiten hochgeladen` : "Plan hochgeladen");
    } catch {
      notify("Der Plan konnte nicht gelesen werden");
    } finally {
      setBusy("");
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div className="plans">
      <aside className="card plans-list">
        <header>
          <strong>Pläne</strong>
          {manager && (
            <button type="button" className="btn btn-sm" onClick={() => input.current?.click()} disabled={!!busy}>
              <Upload size={14} /> Hochladen
            </button>
          )}
          <input ref={input} type="file" accept="application/pdf,image/*" multiple hidden onChange={(e) => upload(e.target.files)} />
        </header>
        {busy && <p className="ts-busy">{busy}</p>}
        {plans.length === 0 && <p className="muted small">{manager ? "Grundrisse oder Schnitte als PDF oder Bild hochladen – dann Mängel direkt auf dem Plan setzen." : "Noch keine Pläne."}</p>}
        <ul>
          {plans.map((p) => {
            const open = data.issues.filter((i) => i.plan?.planId === p.id && i.status !== "erledigt").length;
            return (
              <li key={p.id}>
                <button type="button" className={p.id === plan?.id ? "on" : ""} onClick={() => setCurrentId(p.id)}>
                  <img src={p.dataUrl} alt="" />
                  <span>
                    <strong>{p.name}</strong>
                    <small>{open ? `${open} offene Mängel` : "keine offenen Mängel"}</small>
                  </span>
                </button>
                {manager && (
                  <span className="plans-tools">
                    <button
                      type="button"
                      className="icon-btn"
                      title="Umbenennen"
                      onClick={() => {
                        const name = window.prompt("Name des Plans", p.name);
                        if (name?.trim()) save("plans", { ...p, name: name.trim() });
                      }}
                    >
                      <Pencil size={13} />
                    </button>
                    {canDelete(data) && (
                      <button
                        type="button"
                        className="icon-btn"
                        title="Plan löschen"
                        onClick={() => {
                          if (!window.confirm(`Plan „${p.name}“ löschen? Die Mängel bleiben, verlieren aber ihre Position.`)) return;
                          for (const i of data.issues.filter((x) => x.plan?.planId === p.id)) save("issues", { ...i, plan: undefined });
                          remove("plans", p.id, `Plan „${p.name}“ gelöscht`);
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </aside>
      {plan ? <PlanViewer key={plan.id} plan={plan} project={project} /> : <Empty>{manager ? "Lade links einen Plan hoch." : "Noch keine Pläne hochgeladen."}</Empty>}
    </div>
  );
}

type View = { s: number; x: number; y: number };

function PlanViewer({ plan, project }: { plan: SitePlan; project: Project }) {
  const { data, save } = useStore();
  const box = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>({ s: 1, x: 0, y: 0 });
  const [placing, setPlacing] = useState(false);
  const [filter, setFilter] = useState<"offen" | "alle">("offen");
  const [sheet, setSheet] = useState<Partial<Issue> | null>(null);
  const [dragPin, setDragPin] = useState<{ id: string; x: number; y: number } | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pan = useRef<{ x: number; y: number; vx: number; vy: number; moved: boolean; pinch?: { d: number; s: number; cx: number; cy: number; vx: number; vy: number } } | null>(null);
  const issues = data.issues.filter((i) => i.projectId === project.id && i.plan?.planId === plan.id && (filter === "alle" || i.status !== "erledigt"));
  const all = data.issues.filter((i) => i.projectId === project.id && i.plan?.planId === plan.id);

  const fit = useCallback(() => {
    const el = box.current;
    if (!el) return;
    const s = Math.min(el.clientWidth / plan.width, el.clientHeight / plan.height);
    setView({ s, x: (el.clientWidth - plan.width * s) / 2, y: (el.clientHeight - plan.height * s) / 2 });
  }, [plan.width, plan.height]);
  useEffect(() => {
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [fit]);

  const zoomAt = (factor: number, cx: number, cy: number) =>
    setView((v) => {
      const s = Math.min(8, Math.max(0.05, v.s * factor));
      const k = s / v.s;
      return { s, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k };
    });
  const local = (e: { clientX: number; clientY: number }) => {
    const r = box.current!.getBoundingClientRect();
    return { cx: e.clientX - r.left, cy: e.clientY - r.top };
  };
  const toPlan = (cx: number, cy: number) => ({ x: (cx - view.x) / view.s / plan.width, y: (cy - view.y) / view.s / plan.height });

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    // wheel must not scroll the page
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const { cx, cy } = local(e);
      zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, cx, cy);
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  });

  const newIssueAt = (cx: number, cy: number) => {
    const p = toPlan(cx, cy);
    if (p.x < 0 || p.y < 0 || p.x > 1 || p.y > 1) return;
    setPlacing(false);
    setSheet({ projectId: project.id, location: plan.name, plan: { planId: plan.id, x: round(p.x), y: round(p.y) } });
  };

  return (
    <section className="card plan-view">
      <header className="pv-bar">
        <strong>{plan.name}</strong>
        <span className="muted small">{all.filter((i) => i.status !== "erledigt").length} offen · {all.length} gesamt</span>
        <span className="spacer" />
        <Segmented
          options={[
            { value: "offen", label: "Offene" },
            { value: "alle", label: "Alle" }
          ]}
          value={filter}
          onChange={setFilter}
        />
        <button type="button" className="btn btn-icon" title="Kleiner" onClick={() => zoomAt(1 / 1.3, (box.current?.clientWidth ?? 0) / 2, (box.current?.clientHeight ?? 0) / 2)}>
          <Minus size={16} />
        </button>
        <button type="button" className="btn btn-icon" title="Größer" onClick={() => zoomAt(1.3, (box.current?.clientWidth ?? 0) / 2, (box.current?.clientHeight ?? 0) / 2)}>
          <Plus size={16} />
        </button>
        <button type="button" className="btn btn-icon" title="Ganzer Plan" onClick={fit}>
          <Maximize size={16} />
        </button>
        <button type="button" className={`btn ${placing ? "btn-primary" : ""}`} onClick={() => setPlacing((p) => !p)}>
          <Crosshair size={15} /> {placing ? "Auf den Plan tippen …" : "Mangel setzen"}
        </button>
      </header>
      <div
        ref={box}
        className={`pv-box ${placing ? "placing" : ""}`}
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest(".pv-pin")) return;
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          const pts = [...pointers.current.values()];
          if (pts.length === 2) {
            const r = box.current!.getBoundingClientRect();
            pan.current = { x: 0, y: 0, vx: view.x, vy: view.y, moved: true, pinch: { d: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y), s: view.s, cx: (pts[0].x + pts[1].x) / 2 - r.left, cy: (pts[0].y + pts[1].y) / 2 - r.top, vx: view.x, vy: view.y } };
          } else pan.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y, moved: false };
        }}
        onPointerMove={(e) => {
          if (!pointers.current.has(e.pointerId)) return;
          pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
          const p = pan.current;
          if (!p) return;
          if (p.pinch && pointers.current.size === 2) {
            const pts = [...pointers.current.values()];
            const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
            const s = Math.min(8, Math.max(0.05, (p.pinch.s * d) / p.pinch.d));
            const k = s / p.pinch.s;
            setView({ s, x: p.pinch.cx - (p.pinch.cx - p.pinch.vx) * k, y: p.pinch.cy - (p.pinch.cy - p.pinch.vy) * k });
            return;
          }
          const dx = e.clientX - p.x;
          const dy = e.clientY - p.y;
          if (Math.abs(dx) + Math.abs(dy) > 4) p.moved = true;
          if (p.moved) setView((v) => ({ ...v, x: p.vx + dx, y: p.vy + dy }));
        }}
        onPointerUp={(e) => {
          pointers.current.delete(e.pointerId);
          const p = pan.current;
          if (pointers.current.size === 0) pan.current = null;
          if (p && !p.moved && placing) {
            const { cx, cy } = local(e);
            newIssueAt(cx, cy);
          }
        }}
        onPointerCancel={(e) => (pointers.current.delete(e.pointerId), (pan.current = null))}
        onDoubleClick={(e) => {
          if ((e.target as HTMLElement).closest(".pv-pin")) return;
          const { cx, cy } = local(e);
          newIssueAt(cx, cy);
        }}
      >
        <div className="pv-sheet" style={{ width: plan.width, height: plan.height, transform: `translate(${view.x}px, ${view.y}px) scale(${view.s})` }}>
          <img src={plan.dataUrl} alt={plan.name} draggable={false} />
          {issues.map((i) => {
            const pos = dragPin?.id === i.id ? dragPin : i.plan!;
            const no = all.indexOf(i) + 1;
            return (
              <button
                key={i.id}
                type="button"
                className={`pv-pin ${i.status === "erledigt" ? "done" : ""}`}
                style={{ left: pos.x * plan.width, top: pos.y * plan.height, transform: `translate(-50%, -100%) scale(${1 / view.s})`, "--pin": i.status === "erledigt" ? "#059669" : PIN[i.severity] } as CSSProperties}
                title={`${i.title} · ${L.severity[i.severity].label} · ${L.issueStatus[i.status].label}${i.assigneeId ? ` · ${employeeName(data, i.assigneeId)}` : ""}`}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                  setDragPin({ id: i.id, x: i.plan!.x, y: i.plan!.y });
                  pan.current = { x: e.clientX, y: e.clientY, vx: 0, vy: 0, moved: false };
                }}
                onPointerMove={(e) => {
                  if (dragPin?.id !== i.id || !pan.current) return;
                  if (Math.abs(e.clientX - pan.current.x) + Math.abs(e.clientY - pan.current.y) > 4) pan.current.moved = true;
                  if (pan.current.moved) {
                    const { cx, cy } = local(e);
                    const p = toPlan(cx, cy);
                    setDragPin({ id: i.id, x: clamp(p.x), y: clamp(p.y) });
                  }
                }}
                onPointerUp={() => {
                  const moved = pan.current?.moved;
                  pan.current = null;
                  if (moved && dragPin) save("issues", { ...i, plan: { planId: plan.id, x: round(dragPin.x), y: round(dragPin.y) } }, `Mangel „${i.title}“ auf dem Plan verschoben`);
                  else setSheet(i);
                  setDragPin(null);
                }}
              >
                <svg width="28" height="36" viewBox="0 0 28 36" aria-hidden>
                  <path d="M14 35s12-12.6 12-21A12 12 0 0 0 2 14c0 8.4 12 21 12 21z" fill="var(--pin)" stroke="#fff" strokeWidth="2" />
                </svg>
                <span>{no}</span>
              </button>
            );
          })}
        </div>
        {placing && (
          <p className="pv-hint">
            <AlertTriangle size={14} /> Tippe auf die Stelle, an der der Mangel ist.
          </p>
        )}
      </div>
      <p className="muted small pv-help">Mausrad / zwei Finger = zoomen · ziehen = verschieben · Doppelklick = Mangel an dieser Stelle · Stecknadel ziehen = Position ändern</p>
      {sheet && <IssueSheet issue={sheet} onClose={() => setSheet(null)} />}
    </section>
  );
}

const round = (n: number) => Math.round(n * 10000) / 10000;
const clamp = (n: number) => Math.min(1, Math.max(0, n));
