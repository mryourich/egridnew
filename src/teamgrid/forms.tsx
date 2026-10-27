"use client";

import { ArrowDown, ArrowUp, CheckCircle2, ClipboardCheck, FileDown, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { fmtWhen } from "@/core/format";
import { rightsOf } from "@/core/roles";
import { now, personName, uid, useStore } from "@/core/store";
import type { FormEntry, FormField, FormFieldType, FormTemplate, Project } from "@/core/types";
import { Button, Empty, Field, IconButton, Modal, PageHead, Tag, Toggle } from "@/core/ui";
import { Attachments } from "./attachments";
import { access } from "./model";
import { SignaturePad } from "./signature";

export const FIELD_TYPE: Record<FormFieldType, string> = {
  heading: "Überschrift",
  check: "Ja/Nein (Haken)",
  text: "Text",
  number: "Messwert / Zahl",
  date: "Datum",
  select: "Auswahl",
  photo: "Fotos",
  signature: "Unterschrift"
};

/** Inspection reports and checklists of a project – filled in on site, closed with signature, as PDF. */
export function FormsTab({ project: p }: { project: Project }) {
  const { data } = useStore();
  const { work } = access(data, p);
  const [open, setOpen] = useState<FormEntry | null>(null);
  const [choose, setChoose] = useState(false);
  const list = data.formEntries.filter((e) => e.projectId === p.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const start = (tpl: FormTemplate) => {
    setChoose(false);
    setOpen({ id: "", templateId: tpl.id, projectId: p.id, title: tpl.name, values: {}, photos: {}, status: "entwurf", createdBy: data.meId, createdAt: "" });
  };
  return (
    <>
      <PageHead kicker="Prüfprotokolle" title="Formulare" sub="Prüfprotokolle, Abnahmen und Unterweisungen direkt am Handy ausfüllen – mit Messwerten, Fotos und Unterschrift.">
        {work && (
          <Button variant="primary" icon={<Plus size={15} />} onClick={() => setChoose(true)}>
            Neues Protokoll
          </Button>
        )}
      </PageHead>
      {list.length === 0 ? (
        <Empty title="Noch keine Protokolle.">{work ? "Mit „Neues Protokoll“ eine Vorlage wählen." : undefined}</Empty>
      ) : (
        <div className="panel">
          <table className="table rows-click">
            <tbody>
              {list.map((e) => {
                const tpl = data.forms.find((x) => x.id === e.templateId);
                return (
                  <tr key={e.id} onClick={() => setOpen(e)}>
                    <td className="w-kind">
                      <ClipboardCheck size={16} className="muted" />
                    </td>
                    <td>
                      <strong>{e.title}</strong>
                      <small className="sub">{tpl?.name}</small>
                    </td>
                    <td>
                      <Tag tone={e.status === "abgeschlossen" ? "green" : "amber"} dot>
                        {e.status === "abgeschlossen" ? "Abgeschlossen" : "Entwurf"}
                      </Tag>
                    </td>
                    <td className="hide-sm muted">
                      {personName(data, e.createdBy)} · {fmtWhen(e.createdAt)}
                    </td>
                    <td className="w-menu">
                      <a className="b-icon" href={`/druck/formular/${e.id}`} target="_blank" rel="noreferrer" title="PDF" aria-label="PDF" onClick={(ev) => ev.stopPropagation()}>
                        <FileDown size={16} />
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {choose && (
        <Modal kicker="Neues Protokoll" title="Vorlage wählen" onClose={() => setChoose(false)}>
          <ul className="choose-list">
            {data.forms.map((t) => (
              <li key={t.id}>
                <button type="button" onClick={() => start(t)}>
                  <ClipboardCheck size={18} />
                  <span>
                    <strong>{t.name}</strong>
                    <small>{t.description || `${t.fields.length} Felder`}</small>
                  </span>
                </button>
              </li>
            ))}
            {!data.forms.length && <li className="muted">Noch keine Vorlagen – unter Einstellungen › Formular-Vorlagen anlegen.</li>}
          </ul>
        </Modal>
      )}
      {open && <FormFill entry={open} project={p} onClose={() => setOpen(null)} />}
    </>
  );
}

function FormFill({ entry, project, onClose }: { entry: FormEntry; project: Project; onClose: () => void }) {
  const { data, save, remove, notify } = useStore();
  const { work, manage } = access(data, project);
  const tpl = data.forms.find((x) => x.id === entry.templateId);
  const [v, setV] = useState(entry);
  const [signing, setSigning] = useState("");
  const locked = !work || v.status === "abgeschlossen";
  if (!tpl) return null;
  const setVal = (id: string, value: string | boolean) => setV((o) => ({ ...o, values: { ...o.values, [id]: value } }));
  const missing = tpl.fields.filter((f) => f.required && f.type !== "heading" && (f.type === "photo" ? !(v.photos[f.id] ?? []).length : f.type === "check" ? !v.values[f.id] : !String(v.values[f.id] ?? "").trim()));
  const store = (patch: Partial<FormEntry> = {}, activity?: string) => {
    const item = { ...v, ...patch, id: v.id || uid(), createdAt: v.createdAt || now() };
    save("formEntries", item, activity);
    return item;
  };
  return (
    <Modal
      kicker={tpl.name}
      title={v.title}
      onClose={onClose}
      wide
      footer={
        <>
          {v.id && (manage || (v.createdBy === data.meId && v.status === "entwurf")) && (
            <Button variant="danger" icon={<Trash2 size={15} />} onClick={() => window.confirm("Protokoll löschen?") && (remove("formEntries", v.id, `Protokoll „${v.title}“ gelöscht`), onClose())}>
              Löschen
            </Button>
          )}
          {v.id && (
            <a className="b-btn ghost md" href={`/druck/formular/${v.id}`} target="_blank" rel="noreferrer">
              <FileDown size={15} /> PDF
            </a>
          )}
          <span className="grow" />
          {v.status === "abgeschlossen" && manage && (
            <Button onClick={() => setV((o) => ({ ...o, status: "entwurf", closedAt: undefined }))}>Wieder öffnen</Button>
          )}
          {!locked && (
            <>
              <Button onClick={() => (store({}, v.id ? undefined : `Protokoll „${v.title}“ angelegt`), notify("Entwurf gespeichert"), onClose())}>Speichern</Button>
              <Button
                variant="primary"
                icon={<CheckCircle2 size={15} />}
                onClick={() => {
                  if (missing.length) return notify(`Noch offen: ${missing.map((f) => f.label).join(", ")}`);
                  const item = store({ status: "abgeschlossen", closedAt: now() }, `Protokoll „${v.title}“ abgeschlossen`);
                  notify("Abgeschlossen – PDF öffnet sich");
                  window.open(`/druck/formular/${item.id}`, "_blank");
                  onClose();
                }}
              >
                Abschließen
              </Button>
            </>
          )}
        </>
      }
    >
      <fieldset className="form-fill regie-form" disabled={locked}>
        <Field label="Betreff">
          <input value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} />
        </Field>
        {tpl.fields.map((f) => {
          if (f.type === "heading") return <h3 key={f.id} className="form-fill-head">{f.label}</h3>;
          const label = `${f.label}${f.required ? " *" : ""}`;
          if (f.type === "check")
            return (
              <label key={f.id} className={`form-check ${missing.includes(f) && !locked ? "need" : ""}`}>
                <input type="checkbox" className="check" checked={!!v.values[f.id]} onChange={(e) => setVal(f.id, e.target.checked)} />
                {label}
              </label>
            );
          if (f.type === "photo")
            return (
              <div key={f.id} className="b-field">
                <span className="b-label">{label}</span>
                <Attachments value={v.photos[f.id] ?? []} editable={!locked} onChange={(list) => setV((o) => ({ ...o, photos: { ...o.photos, [f.id]: list } }))} />
              </div>
            );
          if (f.type === "signature")
            return (
              <div key={f.id} className="b-field">
                <span className="b-label">{label}</span>
                {v.values[f.id] ? (
                  <div className="form-sig">
                    <img src={String(v.values[f.id])} alt="Unterschrift" />
                    {!locked && (
                      <Button size="sm" variant="ghost" icon={<X size={13} />} onClick={() => setVal(f.id, "")}>
                        Neu
                      </Button>
                    )}
                  </div>
                ) : signing === f.id ? (
                  <SignaturePad onChange={(sig) => sig && (setVal(f.id, sig), setSigning(""))} />
                ) : (
                  !locked && (
                    <Button size="sm" onClick={() => setSigning(f.id)}>
                      Unterschreiben
                    </Button>
                  )
                )}
              </div>
            );
          return (
            <Field key={f.id} label={label} hint={f.unit}>
              {f.type === "select" ? (
                <select value={String(v.values[f.id] ?? "")} onChange={(e) => setVal(f.id, e.target.value)}>
                  <option value="">– wählen –</option>
                  {(f.options ?? []).map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              ) : (
                <input type={f.type === "date" ? "date" : "text"} inputMode={f.type === "number" ? "decimal" : undefined} value={String(v.values[f.id] ?? "")} onChange={(e) => setVal(f.id, e.target.value)} />
              )}
            </Field>
          );
        })}
      </fieldset>
      {v.status === "abgeschlossen" && <p className="trail">Abgeschlossen {fmtWhen(v.closedAt)} – nur noch als PDF änderbar durch die Projektleitung („Wieder öffnen“).</p>}
    </Modal>
  );
}

/* ------------------------------------------------------------------ templates */

/** Settings › forms: build the company's own inspection reports and checklists. */
export function FormTemplates() {
  const { data } = useStore();
  const [open, setOpen] = useState<FormTemplate | null>(null);
  if (!rightsOf(data).admin && !rightsOf(data).manage) return <Empty title="Kein Zugriff" />;
  return (
    <>
      <PageHead kicker="Formular-Vorlagen" title="Einstellungen" sub="Eigene Prüfprotokolle, Abnahmen und Checklisten bauen – Felder für Haken, Messwerte, Fotos und Unterschrift.">
        <Button variant="primary" icon={<Plus size={15} />} onClick={() => setOpen({ id: "", name: "", description: "", fields: [], createdBy: data.meId, createdAt: "" })}>
          Neue Vorlage
        </Button>
      </PageHead>
      <div className="panel">
        <table className="table rows-click">
          <tbody>
            {data.forms.map((t) => (
              <tr key={t.id} onClick={() => setOpen(t)}>
                <td>
                  <strong>{t.name}</strong>
                  <small className="sub">{t.description}</small>
                </td>
                <td className="num muted">{t.fields.filter((f) => f.type !== "heading").length} Felder</td>
                <td className="num muted">{data.formEntries.filter((e) => e.templateId === t.id).length} ausgefüllt</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data.forms.length && <p className="panel-empty">Noch keine Vorlagen.</p>}
      </div>
      {open && <TemplateEditor tpl={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function TemplateEditor({ tpl, onClose }: { tpl: FormTemplate; onClose: () => void }) {
  const { data, save, remove, notify } = useStore();
  const [v, setV] = useState(tpl);
  const used = data.formEntries.some((e) => e.templateId === tpl.id);
  const setField = (id: string, x: Partial<FormField>) => setV((o) => ({ ...o, fields: o.fields.map((f) => (f.id === id ? { ...f, ...x } : f)) }));
  const moveField = (i: number, d: number) =>
    setV((o) => {
      const f = [...o.fields];
      const [x] = f.splice(i, 1);
      f.splice(Math.max(0, Math.min(f.length, i + d)), 0, x);
      return { ...o, fields: f };
    });
  return (
    <Modal
      kicker="Formular-Vorlage"
      title={v.name || "Neue Vorlage"}
      onClose={onClose}
      wide
      footer={
        <>
          {tpl.id && !used && (
            <Button variant="danger" icon={<Trash2 size={15} />} onClick={() => window.confirm("Vorlage löschen?") && (remove("forms", tpl.id), onClose())}>
              Löschen
            </Button>
          )}
          <span className="grow" />
          <Button variant="ghost" onClick={onClose}>
            Abbrechen
          </Button>
          <Button variant="primary" disabled={!v.name.trim()} onClick={() => (save("forms", { ...v, id: v.id || uid(), name: v.name.trim(), createdAt: v.createdAt || now() }), notify("Vorlage gespeichert"), onClose())}>
            Speichern
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Name *">
          <input autoFocus value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} placeholder="z. B. Prüfprotokoll Brandmeldeanlage" />
        </Field>
        <Field label="Beschreibung">
          <input value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} />
        </Field>
      </div>
      <div className="tpl-fields">
        {v.fields.map((f, i) => (
          <div key={f.id} className={`tpl-field ${f.type === "heading" ? "head" : ""}`}>
            <span className="tpl-order">
              <IconButton label="Nach oben" onClick={() => moveField(i, -1)} disabled={!i}>
                <ArrowUp size={13} />
              </IconButton>
              <IconButton label="Nach unten" onClick={() => moveField(i, 1)} disabled={i === v.fields.length - 1}>
                <ArrowDown size={13} />
              </IconButton>
            </span>
            <input className="cell-input" value={f.label} onChange={(e) => setField(f.id, { label: e.target.value })} placeholder="Bezeichnung" />
            <select className="select-sm" value={f.type} onChange={(e) => setField(f.id, { type: e.target.value as FormFieldType })}>
              {(Object.keys(FIELD_TYPE) as FormFieldType[]).map((t) => (
                <option key={t} value={t}>
                  {FIELD_TYPE[t]}
                </option>
              ))}
            </select>
            {f.type === "select" && <input className="cell-input" key={`o${f.id}`} defaultValue={(f.options ?? []).join(", ")} onBlur={(e) => setField(f.id, { options: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} placeholder="Optionen, mit Komma" />}
            {f.type === "number" && <input className="cell-input unit" value={f.unit ?? ""} onChange={(e) => setField(f.id, { unit: e.target.value })} placeholder="Einheit" />}
            {f.type !== "heading" && <Toggle label="Pflicht" checked={f.required} onChange={(x) => setField(f.id, { required: x })} />}
            <IconButton label="Feld entfernen" onClick={() => setV({ ...v, fields: v.fields.filter((x) => x.id !== f.id) })}>
              <X size={14} />
            </IconButton>
          </div>
        ))}
        <div className="tpl-add">
          {(Object.keys(FIELD_TYPE) as FormFieldType[]).map((t) => (
            <Button key={t} size="sm" icon={<Plus size={13} />} onClick={() => setV({ ...v, fields: [...v.fields, { id: uid(), label: t === "heading" ? "Abschnitt" : "", type: t, required: false }] })}>
              {FIELD_TYPE[t]}
            </Button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
