"use client";

import { Camera, FileText, Plus, Trash2, X } from "lucide-react";
import { useRef, useState } from "react";
import { fmt, inRange, isoWeek, today, weekdayLong, weekdayShort } from "@/core/date";
import { readAttachment } from "@/core/files";
import { byRole, teamOf } from "@/core/roles";
import { now, personName, uid, useStore } from "@/core/store";
import type { Attachment, DailyReport, Project } from "@/core/types";
import { Button, Field, IconButton, Modal } from "@/core/ui";
import { access } from "./model";

export const crewHours = (r: Pick<DailyReport, "crew">) => r.crew.reduce((s, c) => s + (c.hours || 0), 0);

/** Daily reports of a project: what was done, who was there, the weather, photos of the day. */
export function Dailies({ project: p }: { project: Project }) {
  const { data } = useStore();
  const { work } = access(data, p);
  const [edit, setEdit] = useState<Partial<DailyReport> | null>(null);
  const list = data.dailies.filter((r) => r.projectId === p.id).sort((a, b) => b.date.localeCompare(a.date));
  return (
    <section className="panel">
      <header className="panel-head">
        <h2>Tagesberichte</h2>
        {work && (
          <Button size="sm" variant="primary" icon={<Plus size={14} />} onClick={() => setEdit({})}>
            Tagesbericht
          </Button>
        )}
      </header>
      {list.length === 0 ? (
        <p className="panel-empty">Noch keine Tagesberichte.</p>
      ) : (
        <table className="table rows-click">
          <tbody>
            {list.map((r) => (
              <tr key={r.id} onClick={() => setEdit(r)}>
                <td className="nowrap w-due">
                  <strong>
                    {weekdayShort(r.date)} {fmt(r.date)}
                  </strong>
                  <small className="sub">KW {isoWeek(r.date)}</small>
                </td>
                <td>
                  <span className="clamp">{r.work || "–"}</span>
                  <small className="sub">
                    {r.crew.length} Personen · {crewHours(r)} h{r.weather ? ` · ${r.weather}` : ""}
                    {r.photos.length ? ` · ${r.photos.length} Fotos` : ""}
                    {r.incidents ? " · Besonderheiten" : ""}
                  </small>
                </td>
                <td className="hide-sm muted">{personName(data, r.createdBy)}</td>
                <td className="w-menu">
                  <a className="b-icon" href={`/druck/tagesbericht/${r.id}`} target="_blank" rel="noreferrer" title="PDF" aria-label="PDF" onClick={(e) => e.stopPropagation()}>
                    <FileText size={16} />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {edit && <DailyForm report={edit} project={p} onClose={() => setEdit(null)} />}
    </section>
  );
}

function DailyForm({ report, project: p, onClose }: { report: Partial<DailyReport>; project: Project; onClose: () => void }) {
  const { data, save, remove, notify } = useStore();
  const { work, manage } = access(data, p);
  const isNew = !report.id;
  const date = report.date ?? today();
  const team = teamOf(p)
    .map((id) => data.people.find((e) => e.id === id))
    .filter((e): e is NonNullable<typeof e> => !!e && e.active)
    .sort(byRole);
  // who was planned here that day is filled in
  const onSite = team.filter((e) => data.jobs.some((j) => j.projectId === p.id && j.employeeId === e.id && !j.symbol && inRange(date, j.start, j.end)));
  const [v, setV] = useState<DailyReport>({
    id: uid(),
    projectId: p.id,
    date,
    weather: "",
    crew: onSite.map((e) => ({ employeeId: e.id, hours: 8 })),
    work: "",
    incidents: "",
    photos: [],
    createdBy: data.meId,
    createdAt: now(),
    ...report
  });
  const set = (x: Partial<DailyReport>) => setV((o) => ({ ...o, ...x }));
  const readOnly = !work || (!isNew && !manage && v.createdBy !== data.meId);
  const photo = useRef<HTMLInputElement>(null);
  const others = team.filter((e) => !v.crew.some((c) => c.employeeId === e.id));

  const submit = () => {
    if (!v.work.trim()) return;
    save("dailies", { ...v, work: v.work.trim(), incidents: v.incidents.trim(), weather: v.weather.trim() }, `Tagesbericht ${fmt(v.date)} ${isNew ? "erstellt" : "geändert"}`);
    notify("Tagesbericht gespeichert");
    onClose();
  };

  return (
    <Modal
      kicker={`Tagesbericht · KW ${isoWeek(v.date)}`}
      title={`${weekdayLong(v.date)}, ${fmt(v.date)}`}
      onClose={onClose}
      wide
      footer={
        <>
          {!isNew && !readOnly && (
            <Button variant="danger" icon={<Trash2 size={15} />} onClick={() => window.confirm("Tagesbericht löschen?") && (remove("dailies", v.id, `Tagesbericht ${fmt(v.date)} gelöscht`), onClose())}>
              Löschen
            </Button>
          )}
          {!isNew && (
            <a className="b-btn ghost md" href={`/druck/tagesbericht/${v.id}`} target="_blank" rel="noreferrer">
              <FileText size={15} /> PDF
            </a>
          )}
          <span className="grow" />
          <Button variant="ghost" onClick={onClose}>
            {readOnly ? "Schließen" : "Abbrechen"}
          </Button>
          {!readOnly && (
            <Button variant="primary" onClick={submit} disabled={!v.work.trim()}>
              Speichern
            </Button>
          )}
        </>
      }
    >
      <fieldset className="form-grid regie-form" disabled={readOnly}>
        <Field label="Datum">
          <input type="date" value={v.date} onChange={(e) => e.target.value && set({ date: e.target.value })} />
        </Field>
        <Field label="Wetter">
          <input value={v.weather} onChange={(e) => set({ weather: e.target.value })} placeholder="z. B. Regen, 8 °C" />
        </Field>
        <Field label="Ausgeführte Arbeiten *" className="span-2">
          <textarea rows={4} value={v.work} onChange={(e) => set({ work: e.target.value })} placeholder="Was wurde heute gemacht?" />
        </Field>
        <Field label="Besonderheiten, Behinderungen" className="span-2">
          <textarea rows={2} value={v.incidents} onChange={(e) => set({ incidents: e.target.value })} placeholder="z. B. Zufahrt gesperrt, Lieferung verspätet" />
        </Field>
        <div className="regie-group span-2">
          <strong>
            Personal · {v.crew.length} Personen · {crewHours(v)} h
          </strong>
          {v.crew.map((c, i) => (
            <div key={c.employeeId} className="regie-line">
              <span>{personName(data, c.employeeId)}</span>
              <input type="number" min={0} step={0.5} value={c.hours} onChange={(e) => set({ crew: v.crew.map((x, k) => (k === i ? { ...x, hours: Number(e.target.value) } : x)) })} aria-label="Stunden" />
              <em>h</em>
              {!readOnly && (
                <IconButton label="Entfernen" onClick={() => set({ crew: v.crew.filter((_, k) => k !== i) })}>
                  <X size={15} />
                </IconButton>
              )}
            </div>
          ))}
          {!readOnly && others.length > 0 && (
            <select className="select-sm" value="" onChange={(e) => e.target.value && set({ crew: [...v.crew, { employeeId: e.target.value, hours: 8 }] })}>
              <option value="">+ Person</option>
              {others.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="regie-group span-2">
          <strong>Fotos des Tages</strong>
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
              <button type="button" className="mini-add" onClick={() => photo.current?.click()} aria-label="Foto hinzufügen">
                <Camera size={18} />
              </button>
            )}
          </div>
          <input
            ref={photo}
            type="file"
            accept="image/*"
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
  );
}
