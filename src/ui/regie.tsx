"use client";

import { Camera, CheckCircle2, Eraser, FileText, PenLine, Plus, Trash2, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { downscale } from "@/components/ui";
import { fmt, today, weekdayShort } from "@/lib/date";
import { canRelease, employeeName, fmtStamp, nowStamp, uid, useStore } from "@/lib/store";
import type { RegieReport } from "@/lib/types";
import { activePeople, canRemove, me } from "./access";
import { Empty, Field, Sheet } from "./kit";

const hoursOf = (r: RegieReport) => r.workers.reduce((s, w) => s + (w.hours || 0), 0);

/** Extra work with hours and material – the client signs on the phone. */
export function Regie({ projectId }: { projectId: string }) {
  const { data } = useStore();
  const q = useSearchParams();
  const [edit, setEdit] = useState<Partial<RegieReport> | null>(null);
  const list = data.regie.filter((r) => r.projectId === projectId).sort((a, b) => b.no - a.no);

  useEffect(() => {
    if (q.get("neu")) setEdit({ projectId });
  }, [q, projectId]);

  return (
    <div className="v-tab">
      <div className="v-actions">
        <button type="button" className="v-btn primary big" onClick={() => setEdit({ projectId })}>
          <Plus size={19} /> Neuer Regieschein
        </button>
      </div>
      {list.length === 0 ? (
        <Empty>Noch keine Regiescheine. Zusatzarbeit erfassen und gleich vom Kunden unterschreiben lassen.</Empty>
      ) : (
        <ul className="v-card v-list">
          {list.map((r) => (
            <li key={r.id}>
              <button type="button" className="v-list-main" onClick={() => setEdit(r)}>
                <strong>
                  Nr. {String(r.no).padStart(2, "0")} · {weekdayShort(r.date)} {fmt(r.date).slice(0, 6)} – {r.description.split("\n")[0]}
                </strong>
                <small>
                  {hoursOf(r)} h{r.materials.length ? ` · ${r.materials.length} Material` : ""} ·{" "}
                  {r.signature ? <span className="ok">unterschrieben{r.signedBy ? ` von ${r.signedBy}` : ""}</span> : <span className="warn">noch nicht unterschrieben</span>}
                  {r.approvedAt && <span className="ok"> · freigegeben</span>}
                </small>
              </button>
              <a className="v-icon" href={`/regieschein/${r.id}`} target="_blank" rel="noreferrer" aria-label="PDF" title="PDF">
                <FileText size={18} />
              </a>
            </li>
          ))}
        </ul>
      )}
      {edit && <RegieSheet regie={edit} onClose={() => setEdit(null)} />}
    </div>
  );
}

function RegieSheet({ regie, onClose }: { regie: Partial<RegieReport>; onClose: () => void }) {
  const { data, save, remove, notify } = useStore();
  const user = me(data);
  const isNew = !regie.id;
  const nextNo = Math.max(0, ...data.regie.filter((r) => r.projectId === regie.projectId).map((r) => r.no)) + 1;
  const [v, setV] = useState<RegieReport>({
    id: regie.id ?? uid("g"),
    projectId: regie.projectId!,
    no: regie.no ?? nextNo,
    date: regie.date ?? today(),
    orderedBy: regie.orderedBy ?? "",
    description: regie.description ?? "",
    // whoever writes it was there – a full day to start with
    workers: regie.workers ?? (user ? [{ employeeId: user.id, hours: 8 }] : []),
    materials: regie.materials ?? [],
    authorId: regie.authorId ?? data.currentUserId,
    signature: regie.signature ?? "",
    signedBy: regie.signedBy ?? "",
    signedAt: regie.signedAt,
    photos: regie.photos ?? [],
    approvedBy: regie.approvedBy,
    approvedAt: regie.approvedAt,
    createdBy: regie.createdBy,
    createdTs: regie.createdTs
  });
  const [signing, setSigning] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);
  const set = (p: Partial<RegieReport>) => setV((o) => ({ ...o, ...p }));
  const locked = !!regie.signature && !!v.signature;
  const office = canRelease(data);
  const people = activePeople(data).filter((e) => !v.workers.some((w) => w.employeeId === e.id));

  const store = (patch: Partial<RegieReport> = {}, msg = "Regieschein gespeichert") => {
    const item = { ...v, ...patch, description: v.description.trim(), materials: v.materials.filter((m) => m.name.trim()) };
    save("regie", item, patch.signature ? `Regieschein Nr. ${v.no} unterschrieben` : `Regieschein Nr. ${v.no} ${isNew ? "erstellt" : "geändert"}`);
    notify(msg);
    onClose();
  };

  return (
    <>
      <Sheet
        title={`Regieschein Nr. ${String(v.no).padStart(2, "0")}`}
        onClose={onClose}
        footer={
          <>
            {!isNew && canRemove(data) && !locked && (
              <button
                type="button"
                className="v-btn ghost danger"
                onClick={() => {
                  remove("regie", v.id, `Regieschein Nr. ${v.no} gelöscht`);
                  onClose();
                }}
              >
                <Trash2 size={16} />
              </button>
            )}
            {!isNew && (
              <a className="v-btn ghost" href={`/regieschein/${v.id}`} target="_blank" rel="noreferrer">
                <FileText size={16} /> PDF
              </a>
            )}
            <span className="v-grow" />
            {locked ? (
              office &&
              !v.approvedAt && (
                <button type="button" className="v-btn ok" onClick={() => store({ approvedBy: data.currentUserId, approvedAt: nowStamp() }, "Freigegeben ✓")}>
                  <CheckCircle2 size={16} /> Freigeben
                </button>
              )
            ) : (
              <>
                <button type="button" className="v-btn ghost" onClick={() => store()} disabled={!v.description.trim()}>
                  Speichern
                </button>
                <button type="button" className="v-btn primary" onClick={() => setSigning(true)} disabled={!v.description.trim()}>
                  <PenLine size={16} /> Unterschreiben lassen
                </button>
              </>
            )}
          </>
        }
      >
        {locked && (
          <div className="v-signed">
            <img src={v.signature} alt="Unterschrift" />
            <span>
              <strong>Unterschrieben von {v.signedBy || "Kunde"}</strong>
              {v.signedAt && <small>{fmtStamp(v.signedAt)}</small>}
              {v.approvedAt && <small className="ok">Freigegeben von {employeeName(data, v.approvedBy ?? "")}</small>}
            </span>
            {office && (
              <button
                type="button"
                className="v-btn ghost small"
                onClick={() => {
                  if (window.confirm("Unterschrift entfernen? Dann kann der Regieschein wieder geändert werden.")) set({ signature: "", signedBy: "", signedAt: undefined, approvedAt: undefined, approvedBy: undefined });
                }}
              >
                <Eraser size={14} /> Entfernen
              </button>
            )}
          </div>
        )}
        <fieldset className="v-fs" disabled={locked}>
          <div className="v-row2">
            <Field label="Datum">
              <input type="date" value={v.date} onChange={(e) => e.target.value && set({ date: e.target.value })} />
            </Field>
            <Field label="Auftrag von (optional)">
              <input value={v.orderedBy} onChange={(e) => set({ orderedBy: e.target.value })} placeholder="Name des Kunden" />
            </Field>
          </div>
          <Field label="Was wurde zusätzlich gemacht?">
            <textarea rows={3} value={v.description} onChange={(e) => set({ description: e.target.value })} placeholder="z. B. Zusätzliche Steckdose im Keller gesetzt" />
          </Field>

          <div className="v-group">
            <strong>Stunden</strong>
            {v.workers.map((w, i) => (
              <div key={w.employeeId} className="v-line">
                <span>{employeeName(data, w.employeeId)}</span>
                <input type="number" min={0} step={0.5} value={w.hours} onChange={(e) => set({ workers: v.workers.map((x, k) => (k === i ? { ...x, hours: Number(e.target.value) } : x)) })} aria-label="Stunden" />
                <em>h</em>
                <button type="button" className="v-icon" onClick={() => set({ workers: v.workers.filter((_, k) => k !== i) })} aria-label="Entfernen">
                  <X size={15} />
                </button>
              </div>
            ))}
            {people.length > 0 && (
              <select className="v-add-select" value="" onChange={(e) => e.target.value && set({ workers: [...v.workers, { employeeId: e.target.value, hours: 8 }] })}>
                <option value="">+ Person</option>
                {people.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="v-group">
            <strong>Material</strong>
            {v.materials.map((m, i) => (
              <div key={i} className="v-line mat">
                <input type="number" min={0} value={m.qty} onChange={(e) => set({ materials: v.materials.map((x, k) => (k === i ? { ...x, qty: Number(e.target.value) } : x)) })} aria-label="Menge" />
                <input value={m.unit} onChange={(e) => set({ materials: v.materials.map((x, k) => (k === i ? { ...x, unit: e.target.value } : x)) })} aria-label="Einheit" />
                <input value={m.name} onChange={(e) => set({ materials: v.materials.map((x, k) => (k === i ? { ...x, name: e.target.value } : x)) })} placeholder="Bezeichnung" aria-label="Material" />
                <button type="button" className="v-icon" onClick={() => set({ materials: v.materials.filter((_, k) => k !== i) })} aria-label="Entfernen">
                  <X size={15} />
                </button>
              </div>
            ))}
            <button type="button" className="v-link" onClick={() => set({ materials: [...v.materials, { artNo: "", name: "", qty: 1, unit: "Stk" }] })}>
              + Material
            </button>
          </div>

          <div className="v-group">
            <strong>Fotos</strong>
            <div className="v-mini-photos">
              {(v.photos ?? []).map((src, i) => (
                <span key={i}>
                  <img src={src} alt="" />
                  {!locked && (
                    <button type="button" onClick={() => set({ photos: (v.photos ?? []).filter((_, k) => k !== i) })} aria-label="Foto entfernen">
                      <X size={12} />
                    </button>
                  )}
                </span>
              ))}
              {!locked && (
                <button type="button" className="v-mini-add" onClick={() => photoInput.current?.click()} aria-label="Foto hinzufügen">
                  <Camera size={18} />
                </button>
              )}
            </div>
            <input
              ref={photoInput}
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) set({ photos: [...(v.photos ?? []), await downscale(f, 1280)] });
                e.target.value = "";
              }}
            />
          </div>
        </fieldset>
      </Sheet>
      {signing && <SignScreen regie={v} onCancel={() => setSigning(false)} onSign={(signature, signedBy) => store({ signature, signedBy, signedAt: nowStamp() }, "Unterschrieben ✓ – das PDF ist fertig")} />}
    </>
  );
}

/** Full screen for the client: everything at a glance, then sign with the finger. */
function SignScreen({ regie, onCancel, onSign }: { regie: RegieReport; onCancel: () => void; onSign: (signature: string, name: string) => void }) {
  const { data } = useStore();
  const [sig, setSig] = useState("");
  const [name, setName] = useState(regie.orderedBy);
  const site = data.projects.find((p) => p.id === regie.projectId);
  const materials = regie.materials.filter((m) => m.name.trim());
  return (
    <div className="v-signscreen" role="dialog" aria-label="Unterschreiben">
      <header>
        <strong>Regieschein Nr. {String(regie.no).padStart(2, "0")}</strong>
        <small>
          {site?.name} · {fmt(regie.date)}
        </small>
      </header>
      <div className="v-sign-body">
        <section>
          <h3>Ausgeführte Arbeit</h3>
          <p>{regie.description}</p>
        </section>
        {regie.workers.length > 0 && (
          <section>
            <h3>Stunden · {hoursOf(regie)} h</h3>
            <ul>
              {regie.workers.map((w) => (
                <li key={w.employeeId}>
                  <span>{employeeName(data, w.employeeId)}</span>
                  <b>{w.hours} h</b>
                </li>
              ))}
            </ul>
          </section>
        )}
        {materials.length > 0 && (
          <section>
            <h3>Material</h3>
            <ul>
              {materials.map((m, i) => (
                <li key={i}>
                  <span>{m.name}</span>
                  <b>
                    {m.qty} {m.unit}
                  </b>
                </li>
              ))}
            </ul>
          </section>
        )}
        <section>
          <h3>Unterschrift Kunde</h3>
          <Pad onChange={setSig} />
          <Field label="Name in Blockschrift">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. M. Leitner" />
          </Field>
        </section>
      </div>
      <footer>
        <button type="button" className="v-btn big" onClick={onCancel}>
          Zurück
        </button>
        <button type="button" className="v-btn primary big" disabled={!sig || !name.trim()} onClick={() => onSign(sig, name.trim())}>
          <PenLine size={18} /> Unterschreiben
        </button>
      </footer>
    </div>
  );
}

function Pad({ onChange }: { onChange: (v: string) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [has, setHas] = useState(false);
  useEffect(() => {
    const c = canvas.current!;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
  }, []);
  const pos = (e: React.PointerEvent) => {
    const c = canvas.current!;
    const r = c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * c.width, y: ((e.clientY - r.top) / r.height) * c.height };
  };
  return (
    <div className="v-pad">
      <canvas
        ref={canvas}
        width={900}
        height={300}
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
          ctx.lineWidth = 4;
          ctx.lineCap = "round";
          ctx.strokeStyle = "#0b1530";
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        }}
        onPointerUp={() => {
          if (!drawing.current) return;
          drawing.current = false;
          setHas(true);
          onChange(canvas.current!.toDataURL("image/png"));
        }}
      />
      {!has && <span className="v-pad-hint">Hier mit dem Finger unterschreiben</span>}
      {has && (
        <button
          type="button"
          className="v-btn ghost small v-pad-clear"
          onClick={() => {
            const c = canvas.current!;
            const ctx = c.getContext("2d")!;
            ctx.fillStyle = "#fff";
            ctx.fillRect(0, 0, c.width, c.height);
            setHas(false);
            onChange("");
          }}
        >
          <Eraser size={14} /> Neu
        </button>
      )}
    </div>
  );
}
