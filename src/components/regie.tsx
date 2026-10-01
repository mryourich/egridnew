"use client";

import { PhotoField } from "./photo-field";
import { CheckCircle2, Eraser, FileText, Plus, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { fmt, isoWeek, today, weekdayShort } from "@/lib/date";
import { canDelete, canRelease, employeeName, fmtStamp, nowStamp, projectTeam, uid, useStore } from "@/lib/store";
import type { Project, RegieReport } from "@/lib/types";
import { EmpAvatar } from "./person";
import { Empty, Portal } from "./ui";

/* ---------------------------------------------------------------- list */

export function RegieList({ project, onOpen }: { project: Project; onOpen: (r: Partial<RegieReport>) => void }) {
  const { data, save } = useStore();
  const release = canRelease(data);
  const list = data.regie.filter((r) => r.projectId === project.id).sort((a, b) => b.no - a.no);
  if (!list.length) return <Empty>Noch keine Regiescheine. Zusatzarbeiten, die nicht im LV stehen, hier festhalten und vom Auftraggeber unterschreiben lassen.</Empty>;
  return (
    <div className="report-list">
      {list.map((r) => {
        const hours = r.workers.reduce((s, w) => s + w.hours, 0);
        return (
          <article key={r.id} className="card report-card regie-card" onClick={() => onOpen(r)}>
            <div className="rc-date">
              <span>Nr.</span>
              <strong>{String(r.no).padStart(2, "0")}</strong>
              <small>KW {isoWeek(r.date)}</small>
            </div>
            <div className="rc-body">
              <div className="rc-meta">
                <strong>
                  {weekdayShort(r.date)} {fmt(r.date)}
                </strong>
                <span className="chip-static">{hours} h</span>
                <span className="chip-static">{r.materials.length} Material</span>
                {(r.photos ?? []).length > 0 && <span className="chip-static">{r.photos!.length} Fotos</span>}
                {r.signature ? <span className="chip-static chip-ok">unterschrieben{r.signedBy ? ` · ${r.signedBy}` : ""}</span> : <span className="chip-static chip-warn">nicht unterschrieben</span>}
                {r.approvedAt ? (
                  <span className="chip-static chip-ok" title={`${employeeName(data, r.approvedBy ?? "")} · ${fmtStamp(r.approvedAt)}`}>
                    freigegeben · {employeeName(data, r.approvedBy ?? "")}
                  </span>
                ) : (
                  <span className="chip-static">nicht freigegeben</span>
                )}
              </div>
              <p className="prose">{r.description}</p>
              {r.orderedBy && <small className="muted">Beauftragt von {r.orderedBy}</small>}
              {(r.photos ?? []).length > 0 && (
                <div className="rc-thumbs">
                  {r.photos!.slice(0, 5).map((src, i) => (
                    <img key={i} src={src} alt="" />
                  ))}
                </div>
              )}
            </div>
            <div className="rc-actions" onClick={(e) => e.stopPropagation()}>
              {release && !r.approvedAt && (
                <button
                  type="button"
                  className="btn btn-sm"
                  disabled={!r.signature}
                  title={r.signature ? "Regiebericht freigeben (für Abrechnung)" : "Erst nach der Unterschrift des Auftraggebers"}
                  onClick={() => save("regie", { ...r, approvedBy: data.currentUserId, approvedAt: nowStamp() }, `Regieschein Nr. ${r.no} freigegeben`)}
                >
                  <CheckCircle2 size={14} /> Freigeben
                </button>
              )}
              {release && r.approvedAt && (
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => window.confirm("Freigabe zurücknehmen?") && save("regie", { ...r, approvedBy: undefined, approvedAt: undefined }, `Freigabe Regieschein Nr. ${r.no} zurückgenommen`)}>
                  Freigabe zurücknehmen
                </button>
              )}
              <a className="btn btn-sm btn-primary" href={`/regieschein/${r.id}`} target="_blank" rel="noreferrer">
                <FileText size={14} /> PDF
              </a>
            </div>
          </article>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------- signature */

function SignaturePad({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    if (value) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, c.width, c.height);
      img.src = value;
    }
    // only on mount: the pad owns its pixels afterwards
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pos = (e: React.PointerEvent) => {
    const c = canvas.current!;
    const r = c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * c.width, y: ((e.clientY - r.top) / r.height) * c.height };
  };

  return (
    <div className="sig">
      <canvas
        ref={canvas}
        width={600}
        height={200}
        onPointerDown={(e) => {
          drawing.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          const ctx = canvas.current!.getContext("2d")!;
          const p = pos(e);
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return;
          const ctx = canvas.current!.getContext("2d")!;
          const p = pos(e);
          ctx.lineWidth = 2.6;
          ctx.lineCap = "round";
          ctx.strokeStyle = "#0e1a33";
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        }}
        onPointerUp={() => {
          if (!drawing.current) return;
          drawing.current = false;
          onChange(canvas.current!.toDataURL("image/png"));
        }}
      />
      <button
        type="button"
        className="btn btn-sm btn-ghost sig-clear"
        onClick={() => {
          const c = canvas.current!;
          const ctx = c.getContext("2d")!;
          ctx.fillStyle = "#fff";
          ctx.fillRect(0, 0, c.width, c.height);
          onChange("");
        }}
      >
        <Eraser size={13} /> Löschen
      </button>
      {!value && <span className="sig-hint">Hier mit Finger oder Maus unterschreiben</span>}
    </div>
  );
}

/* ---------------------------------------------------------------- sheet */

export function RegieSheet({ regie, onClose }: { regie: Partial<RegieReport>; onClose: () => void }) {
  const { data, save, remove, notify } = useStore();
  const project = data.projects.find((p) => p.id === regie.projectId)!;
  const team = projectTeam(data, project);
  const isNew = !regie.id;
  const nextNo = Math.max(0, ...data.regie.filter((r) => r.projectId === project.id).map((r) => r.no)) + 1;
  const [v, setV] = useState<RegieReport>({
    id: regie.id ?? uid("g"),
    projectId: project.id,
    no: regie.no ?? nextNo,
    date: regie.date ?? today(),
    orderedBy: regie.orderedBy ?? "",
    description: regie.description ?? "",
    workers: regie.workers ?? [],
    materials: regie.materials ?? [],
    authorId: regie.authorId ?? data.currentUserId,
    signature: regie.signature ?? "",
    signedBy: regie.signedBy ?? "",
    photos: regie.photos ?? []
  });
  const set = (patch: Partial<RegieReport>) => setV((o) => ({ ...o, ...patch }));
  const hours = v.workers.reduce((s, w) => s + (w.hours || 0), 0);

  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);

  const toggleWorker = (id: string) =>
    set({ workers: v.workers.some((w) => w.employeeId === id) ? v.workers.filter((w) => w.employeeId !== id) : [...v.workers, { employeeId: id, hours: 8 }] });

  const setMat = (i: number, patch: Partial<RegieReport["materials"][number]>) => {
    const next = v.materials.map((m, k) => (k === i ? { ...m, ...patch } : m));
    // known article number fills name and unit
    if (patch.artNo !== undefined) {
      const a = data.articles.find((x) => x.artNo === patch.artNo);
      if (a) next[i] = { ...next[i], name: next[i].name || a.name, unit: a.unit };
    }
    set({ materials: next });
  };

  const submit = () => {
    if (!v.description.trim()) return;
    const materials = v.materials.filter((m) => m.name.trim() || m.artNo.trim());
    save("regie", { ...v, description: v.description.trim(), materials }, `Regieschein Nr. ${v.no} ${isNew ? "erstellt" : "geändert"}`);
    for (const m of materials)
      if (m.artNo.trim() && !data.articles.some((a) => a.artNo === m.artNo.trim())) save("articles", { id: uid("ar"), artNo: m.artNo.trim(), name: m.name.trim(), unit: m.unit || "Stk" });
    notify("Regieschein gespeichert");
    onClose();
  };

  return (
    <Portal>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="drawer report-drawer" aria-label="Regieschein">
        <header className="drawer-head">
          <span className="rd-title">
            <strong>Regieschein Nr. {String(v.no).padStart(2, "0")}</strong>
            <small>
              {project.code} · {project.name}
            </small>
          </span>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Schließen">
            <X size={18} />
          </button>
        </header>
        <form
          className="drawer-body"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="inline-fields">
            <label>
              <span>Datum</span>
              <input type="date" value={v.date} onChange={(e) => e.target.value && set({ date: e.target.value })} />
            </label>
            <label>
              <span>Beauftragt von (Auftraggeber)</span>
              <input value={v.orderedBy} onChange={(e) => set({ orderedBy: e.target.value })} placeholder="Name / Firma" />
            </label>
            <label className="full">
              <span>Ausgeführte Zusatzarbeit</span>
              <textarea rows={4} autoFocus={isNew} value={v.description} onChange={(e) => set({ description: e.target.value })} placeholder="Was wurde zusätzlich gemacht und warum?" />
            </label>
          </div>

          <PhotoField photos={v.photos ?? []} onChange={(photos) => set({ photos })} hint="z. B. vorher / nachher – die Fotos erscheinen im Regieschein-PDF." />

          <section className="detail-section">
            <header>
              <h3>
                Personal <span className="tab-count">{hours} h</span>
              </h3>
            </header>
            <div className="regie-people">
              {team.map((e) => {
                const w = v.workers.find((x) => x.employeeId === e.id);
                return (
                  <div key={e.id} className={`rp ${w ? "on" : ""}`}>
                    <button type="button" onClick={() => toggleWorker(e.id)} title={w ? "Entfernen" : "Hinzufügen"}>
                      <EmpAvatar id={e.id} size={30} />
                      <span>{e.name}</span>
                    </button>
                    {w && (
                      <label>
                        <input type="number" min={0} step={0.5} value={w.hours} onChange={(ev) => set({ workers: v.workers.map((x) => (x.employeeId === e.id ? { ...x, hours: Number(ev.target.value) } : x)) })} />
                        <small>h</small>
                      </label>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="detail-section">
            <header>
              <h3>
                Material <span className="tab-count">{v.materials.length}</span>
              </h3>
              <button type="button" className="btn btn-sm" onClick={() => set({ materials: [...v.materials, { artNo: "", name: "", qty: 1, unit: "Stk" }] })}>
                <Plus size={13} /> Zeile
              </button>
            </header>
            <datalist id="articles">
              {data.articles.map((a) => (
                <option key={a.id} value={a.artNo}>
                  {a.name}
                </option>
              ))}
            </datalist>
            {v.materials.map((m, i) => (
              <div key={i} className="regie-mat">
                <input list="articles" value={m.artNo} onChange={(e) => setMat(i, { artNo: e.target.value })} placeholder="Art.-Nr." aria-label="Artikelnummer" />
                <input value={m.name} onChange={(e) => setMat(i, { name: e.target.value })} placeholder="Material" aria-label="Material" />
                <input type="number" min={0} value={m.qty} onChange={(e) => setMat(i, { qty: Number(e.target.value) })} aria-label="Menge" />
                <input value={m.unit} onChange={(e) => setMat(i, { unit: e.target.value })} aria-label="Einheit" />
                <button type="button" className="icon-btn" aria-label="Zeile entfernen" onClick={() => set({ materials: v.materials.filter((_, k) => k !== i) })}>
                  <X size={13} />
                </button>
              </div>
            ))}
          </section>

          <section className="detail-section">
            <header>
              <h3>Unterschrift Auftraggeber</h3>
            </header>
            <SignaturePad value={v.signature} onChange={(signature) => set({ signature })} />
            <div className="inline-fields">
              <label className="full">
                <span>Name in Blockschrift</span>
                <input value={v.signedBy} onChange={(e) => set({ signedBy: e.target.value })} placeholder="z. B. M. Leitner" />
              </label>
            </div>
          </section>

          <footer className="drawer-foot rd-foot">
            {!isNew && canDelete(data) && (
              <button
                type="button"
                className="btn btn-sm btn-danger-ghost"
                onClick={() => {
                  if (!window.confirm("Regieschein löschen?")) return;
                  remove("regie", v.id, `Regieschein Nr. ${v.no} gelöscht`);
                  onClose();
                }}
              >
                <Trash2 size={13} /> Löschen
              </button>
            )}
            {!isNew && (
              <a className="btn btn-sm" href={`/regieschein/${v.id}`} target="_blank" rel="noreferrer">
                <FileText size={13} /> PDF
              </a>
            )}
            <span className="spacer" />
            <button type="button" className="btn btn-sm btn-ghost" onClick={onClose}>
              Abbrechen
            </button>
            <button type="submit" className="btn btn-sm btn-primary" disabled={!v.description.trim()}>
              Speichern
            </button>
          </footer>
          <p className="muted small">Erstellt von {employeeName(data, v.authorId)}</p>
        </form>
      </aside>
    </Portal>
  );
}
