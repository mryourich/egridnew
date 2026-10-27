"use client";

import { Camera, CheckCircle2, Eraser, FileText, PenLine, Plus, Trash2, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { fmt, today, weekdayShort } from "@/core/date";
import { readAttachment } from "@/core/files";
import { fmtStamp } from "@/core/format";
import { byRole, teamOf } from "@/core/roles";
import { now, personName, uid, useStore } from "@/core/store";
import type { Attachment, Project, Regie } from "@/core/types";
import { Button, Empty, Field, IconButton, Modal, PageHead, Tag } from "@/core/ui";
import { access } from "./model";
import { SignaturePad } from "./signature";

export const regieNo = (n: number) => String(n).padStart(2, "0");
export const hoursOf = (r: Pick<Regie, "workers">) => r.workers.reduce((s, w) => s + (w.hours || 0), 0);

/** Extra work with hours and material – the client signs right on the phone, the project management releases it. */
export function RegieList({ project: p }: { project: Project }) {
  const { data } = useStore();
  const q = useSearchParams();
  const router = useRouter();
  const { work } = access(data, p);
  const [edit, setEdit] = useState<Partial<Regie> | null>(null);
  const list = data.regie.filter((r) => r.projectId === p.id).sort((a, b) => b.no - a.no);

  useEffect(() => {
    const id = q.get("regie");
    if (q.get("neu") && work) setEdit({ projectId: p.id });
    else if (id) {
      const r = data.regie.find((x) => x.id === id);
      if (r) setEdit(r);
    }
    // opened once from the address
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);
  const close = () => {
    setEdit(null);
    if (q.toString()) router.replace(`/projekte/${p.id}/regie`);
  };

  return (
    <div className="page narrow">
      <PageHead kicker="Regie" title="Regiescheine" sub="Zusatzarbeit erfassen und gleich vom Kunden unterschreiben lassen – das PDF ist sofort fertig.">
        {work && (
          <Button variant="primary" icon={<Plus size={15} />} onClick={() => setEdit({ projectId: p.id })}>
            Neuer Regieschein
          </Button>
        )}
      </PageHead>
      {list.length === 0 ? (
        <Empty title="Noch keine Regiescheine." />
      ) : (
        <div className="panel">
          <table className="table rows-click">
            <tbody>
              {list.map((r) => (
                <tr key={r.id} onClick={() => setEdit(r)}>
                  <td className="w-no mono">Nr. {regieNo(r.no)}</td>
                  <td>
                    <strong>{r.description.split("\n")[0] || "–"}</strong>
                    <small className="sub">
                      {weekdayShort(r.date)} {fmt(r.date)} · {hoursOf(r)} h{r.materials.length ? ` · ${r.materials.length} Material` : ""}
                      {r.photos.length ? ` · ${r.photos.length} Fotos` : ""}
                    </small>
                  </td>
                  <td className="nowrap">
                    {r.approvedAt ? <Tag tone="green">freigegeben</Tag> : r.signature ? <Tag tone="blue">unterschrieben</Tag> : <Tag tone="amber">nicht unterschrieben</Tag>}
                  </td>
                  <td className="w-menu">
                    <a className="b-icon" href={`/druck/regie/${r.id}`} target="_blank" rel="noreferrer" title="PDF" aria-label="PDF" onClick={(e) => e.stopPropagation()}>
                      <FileText size={16} />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {edit && <RegieForm regie={edit} project={p} onClose={close} />}
    </div>
  );
}

function RegieForm({ regie, project: p, onClose }: { regie: Partial<Regie>; project: Project; onClose: () => void }) {
  const { data, save, remove, notify } = useStore();
  const { manage, work } = access(data, p);
  const isNew = !regie.id;
  const nextNo = Math.max(0, ...data.regie.filter((r) => r.projectId === p.id).map((r) => r.no)) + 1;
  const [v, setV] = useState<Regie>({
    id: uid(),
    projectId: p.id,
    no: nextNo,
    date: today(),
    orderedBy: "",
    description: "",
    // whoever writes it was there – a full day to start with
    workers: [{ employeeId: data.meId, hours: 8 }],
    materials: [],
    photos: [],
    signature: "",
    signedBy: "",
    createdBy: data.meId,
    createdAt: now(),
    ...regie
  });
  const [signing, setSigning] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);
  const set = (x: Partial<Regie>) => setV((o) => ({ ...o, ...x }));
  const locked = !!regie.signature && !!v.signature;
  const readOnly = locked || !work;
  const team = teamOf(p)
    .map((id) => data.people.find((e) => e.id === id))
    .filter((e): e is NonNullable<typeof e> => !!e && e.active)
    .sort(byRole);
  const people = team.filter((e) => !v.workers.some((w) => w.employeeId === e.id));

  const store = (patch: Partial<Regie> = {}, msg = "Regieschein gespeichert") => {
    const item = { ...v, ...patch, description: v.description.trim(), materials: v.materials.filter((m) => m.name.trim()) };
    save("regie", item, patch.signature ? `Regieschein Nr. ${regieNo(v.no)} unterschrieben` : patch.approvedAt ? `Regieschein Nr. ${regieNo(v.no)} freigegeben` : `Regieschein Nr. ${regieNo(v.no)} ${isNew ? "erstellt" : "geändert"}`);
    notify(msg);
    onClose();
  };

  return (
    <>
      <Modal
        kicker={p.name}
        title={`Regieschein Nr. ${regieNo(v.no)}`}
        onClose={onClose}
        wide
        footer={
          <>
            {!isNew && manage && !locked && (
              <Button variant="danger" icon={<Trash2 size={15} />} onClick={() => window.confirm("Regieschein löschen?") && (remove("regie", v.id, `Regieschein Nr. ${regieNo(v.no)} gelöscht`), onClose())}>
                Löschen
              </Button>
            )}
            {!isNew && (
              <a className="b-btn ghost md" href={`/druck/regie/${v.id}`} target="_blank" rel="noreferrer">
                <FileText size={15} /> PDF
              </a>
            )}
            <span className="grow" />
            {locked ? (
              manage &&
              !v.approvedAt && (
                <Button variant="primary" icon={<CheckCircle2 size={15} />} onClick={() => store({ approvedBy: data.meId, approvedAt: now() }, "Freigegeben ✓")}>
                  Freigeben
                </Button>
              )
            ) : work ? (
              <>
                <Button onClick={() => store()} disabled={!v.description.trim()}>
                  Speichern
                </Button>
                <Button variant="primary" icon={<PenLine size={15} />} onClick={() => setSigning(true)} disabled={!v.description.trim()}>
                  Unterschreiben lassen
                </Button>
              </>
            ) : null}
          </>
        }
      >
        {locked && (
          <div className="signed">
            <img src={v.signature} alt="Unterschrift" />
            <span>
              <strong>Unterschrieben von {v.signedBy || "Kunde"}</strong>
              {v.signedAt && <small>{fmtStamp(v.signedAt)}</small>}
              {v.approvedAt && (
                <small className="ok">
                  Freigegeben von {personName(data, v.approvedBy ?? "")} · {fmtStamp(v.approvedAt)}
                </small>
              )}
            </span>
            {manage && (
              <Button size="sm" variant="ghost" icon={<Eraser size={14} />} onClick={() => window.confirm("Unterschrift entfernen? Dann kann der Regieschein wieder geändert werden.") && set({ signature: "", signedBy: "", signedAt: undefined, approvedAt: undefined, approvedBy: undefined })}>
                Entfernen
              </Button>
            )}
          </div>
        )}
        <fieldset className="regie-form form-grid" disabled={readOnly}>
          <Field label="Datum">
            <input type="date" value={v.date} onChange={(e) => e.target.value && set({ date: e.target.value })} />
          </Field>
          <Field label="Auftrag von (optional)">
            <input value={v.orderedBy} onChange={(e) => set({ orderedBy: e.target.value })} placeholder="Name des Kunden" />
          </Field>
          <Field label="Was wurde zusätzlich gemacht? *" className="span-2">
            <textarea rows={3} value={v.description} onChange={(e) => set({ description: e.target.value })} placeholder="z. B. Zusätzliche Notbeleuchtung im Querschlag 3 montiert" />
          </Field>

          <div className="regie-group span-2">
            <strong>Stunden · {hoursOf(v)} h</strong>
            {v.workers.map((w, i) => (
              <div key={w.employeeId} className="regie-line">
                <span>{personName(data, w.employeeId)}</span>
                <input type="number" min={0} step={0.5} value={w.hours} onChange={(e) => set({ workers: v.workers.map((x, k) => (k === i ? { ...x, hours: Number(e.target.value) } : x)) })} aria-label="Stunden" />
                <em>h</em>
                {!readOnly && (
                  <IconButton label="Entfernen" onClick={() => set({ workers: v.workers.filter((_, k) => k !== i) })}>
                    <X size={15} />
                  </IconButton>
                )}
              </div>
            ))}
            {!readOnly && people.length > 0 && (
              <select className="select-sm" value="" onChange={(e) => e.target.value && set({ workers: [...v.workers, { employeeId: e.target.value, hours: 8 }] })}>
                <option value="">+ Person</option>
                {people.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="regie-group span-2">
            <strong>Material</strong>
            <datalist id="regie-articles">
              {data.articles.map((a) => (
                <option key={a.id} value={a.name} />
              ))}
            </datalist>
            {v.materials.map((m, i) => (
              <div key={i} className="regie-line mat">
                <input type="number" min={0} value={m.qty} onChange={(e) => set({ materials: v.materials.map((x, k) => (k === i ? { ...x, qty: Number(e.target.value) } : x)) })} aria-label="Menge" />
                <input value={m.unit} onChange={(e) => set({ materials: v.materials.map((x, k) => (k === i ? { ...x, unit: e.target.value } : x)) })} aria-label="Einheit" />
                <input
                  list="regie-articles"
                  value={m.name}
                  onChange={(e) => {
                    const a = data.articles.find((x) => x.name === e.target.value);
                    set({ materials: v.materials.map((x, k) => (k === i ? { ...x, name: e.target.value, ...(a ? { artNo: a.artNo, unit: a.unit } : {}) } : x)) });
                  }}
                  placeholder="Bezeichnung"
                  aria-label="Material"
                />
                {!readOnly && (
                  <IconButton label="Entfernen" onClick={() => set({ materials: v.materials.filter((_, k) => k !== i) })}>
                    <X size={15} />
                  </IconButton>
                )}
              </div>
            ))}
            {!readOnly && (
              <button type="button" className="link" onClick={() => set({ materials: [...v.materials, { artNo: "", name: "", qty: 1, unit: "Stk" }] })}>
                + Material
              </button>
            )}
          </div>

          <div className="regie-group span-2">
            <strong>Fotos</strong>
            <div className="mini-photos">
              {v.photos.map((a) => (
                <span key={a.id}>
                  <img src={a.url} alt={a.name} />
                  {!readOnly && (
                    <button type="button" onClick={() => set({ photos: v.photos.filter((x) => x.id !== a.id) })} aria-label="Foto entfernen">
                      <X size={12} />
                    </button>
                  )}
                </span>
              ))}
              {!readOnly && (
                <button type="button" className="mini-add" onClick={() => photoInput.current?.click()} aria-label="Foto hinzufügen">
                  <Camera size={18} />
                </button>
              )}
            </div>
            <input
              ref={photoInput}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              hidden
              onChange={async (e) => {
                const files = Array.from(e.target.files ?? []);
                e.target.value = "";
                const added: Attachment[] = [];
                for (const f of files) {
                  try {
                    added.push(await readAttachment(f, data.meId));
                  } catch (err) {
                    notify(err instanceof Error ? err.message : "Foto konnte nicht gelesen werden.");
                  }
                }
                setV((o) => ({ ...o, photos: [...o.photos, ...added] }));
              }}
            />
          </div>
        </fieldset>
      </Modal>
      {signing && <SignScreen regie={v} project={p} onCancel={() => setSigning(false)} onSign={(signature, signedBy) => store({ signature, signedBy, signedAt: now() }, "Unterschrieben ✓ – das PDF ist fertig")} />}
    </>
  );
}

/** Full screen for the client: everything at a glance, then sign with the finger. */
function SignScreen({ regie, project, onCancel, onSign }: { regie: Regie; project: Project; onCancel: () => void; onSign: (signature: string, name: string) => void }) {
  const { data } = useStore();
  const [sig, setSig] = useState("");
  const [name, setName] = useState(regie.orderedBy);
  const materials = regie.materials.filter((m) => m.name.trim());
  return (
    <div className="signscreen" role="dialog" aria-label="Unterschreiben">
      <header>
        <strong>Regieschein Nr. {regieNo(regie.no)}</strong>
        <small>
          {project.name} · {fmt(regie.date)}
        </small>
      </header>
      <div className="sign-body">
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
                  <span>{personName(data, w.employeeId)}</span>
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
          <SignaturePad onChange={setSig} />
          <Field label="Name in Blockschrift">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. M. Leitner" />
          </Field>
        </section>
      </div>
      <footer>
        <Button onClick={onCancel}>Zurück</Button>
        <Button variant="primary" icon={<PenLine size={16} />} disabled={!sig || !name.trim()} onClick={() => onSign(sig, name.trim())}>
          Unterschreiben
        </Button>
      </footer>
    </div>
  );
}
