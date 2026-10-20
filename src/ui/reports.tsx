"use client";

import { Camera, FileText, Plus, Trash2, X } from "lucide-react";
import { useRef, useState } from "react";
import { downscale } from "@/components/ui";
import { fmt, today, weekdayShort } from "@/lib/date";
import { employeeName, uid, useStore } from "@/lib/store";
import type { DailyReport } from "@/lib/types";
import { canRemove, slotOf } from "./access";
import { Empty, Field, Sheet } from "./kit";

/** One short note per day: what was done, how many people, how long. */
export function Reports({ projectId }: { projectId: string }) {
  const { data } = useStore();
  const [edit, setEdit] = useState<Partial<DailyReport> | null>(null);
  const list = data.reports.filter((r) => r.projectId === projectId).sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="v-tab">
      <div className="v-actions">
        <button type="button" className="v-btn primary big" onClick={() => setEdit({ projectId })}>
          <Plus size={19} /> Tagesbericht
        </button>
      </div>
      {list.length === 0 ? (
        <Empty>Noch keine Tagesberichte.</Empty>
      ) : (
        <ul className="v-card v-list">
          {list.map((r) => (
            <li key={r.id}>
              <span className="v-day">
                {weekdayShort(r.date)}
                <b>{fmt(r.date).slice(0, 6)}</b>
              </span>
              <button type="button" className="v-list-main" onClick={() => setEdit(r)}>
                <strong>{r.work.split("\n")[0] || "–"}</strong>
                <small>
                  {r.crew} {r.crew === 1 ? "Person" : "Personen"} · {r.hours} h · {employeeName(data, r.authorId)}
                </small>
              </button>
              <a className="v-icon" href={`/tagesbericht/${r.id}`} target="_blank" rel="noreferrer" aria-label="PDF" title="PDF">
                <FileText size={18} />
              </a>
            </li>
          ))}
        </ul>
      )}
      {edit && <ReportSheet report={edit} onClose={() => setEdit(null)} />}
    </div>
  );
}

function ReportSheet({ report, onClose }: { report: Partial<DailyReport>; onClose: () => void }) {
  const { data, save, remove, notify } = useStore();
  const isNew = !report.id;
  const t = today();
  // people planned here today are the starting point
  const planned = data.employees.filter((e) => e.active && [false, true].some((pm) => {
    const s = slotOf(data, e.id, report.date ?? t, pm);
    return s.kind === "job" && s.job.projectId === report.projectId;
  })).length;
  const [v, setV] = useState<DailyReport>({
    id: report.id ?? uid("r"),
    projectId: report.projectId!,
    date: report.date ?? t,
    crew: report.crew ?? (planned || 1),
    hours: report.hours ?? (planned || 1) * 8,
    work: report.work ?? "",
    incidents: report.incidents ?? "",
    authorId: report.authorId ?? data.currentUserId,
    photos: report.photos ?? [],
    createdBy: report.createdBy,
    createdTs: report.createdTs
  });
  const set = (p: Partial<DailyReport>) => setV((o) => ({ ...o, ...p }));
  const photoInput = useRef<HTMLInputElement>(null);

  return (
    <Sheet
      title={isNew ? "Tagesbericht" : `Tagesbericht ${fmt(v.date)}`}
      onClose={onClose}
      footer={
        <>
          {!isNew && canRemove(data) && (
            <button
              type="button"
              className="v-btn ghost danger"
              onClick={() => {
                remove("reports", v.id, `Tagesbericht ${fmt(v.date)} gelöscht`);
                onClose();
              }}
            >
              <Trash2 size={16} />
            </button>
          )}
          {!isNew && (
            <a className="v-btn ghost" href={`/tagesbericht/${v.id}`} target="_blank" rel="noreferrer">
              <FileText size={16} /> PDF
            </a>
          )}
          <span className="v-grow" />
          <button type="button" className="v-btn ghost" onClick={onClose}>
            Abbrechen
          </button>
          <button
            type="button"
            className="v-btn primary"
            disabled={!v.work.trim()}
            onClick={() => {
              save("reports", { ...v, work: v.work.trim(), incidents: v.incidents.trim() }, `Tagesbericht ${fmt(v.date)} ${isNew ? "erstellt" : "geändert"}`);
              notify("Tagesbericht gespeichert");
              onClose();
            }}
          >
            Speichern
          </button>
        </>
      }
    >
      <Field label="Datum">
        <input type="date" value={v.date} onChange={(e) => e.target.value && set({ date: e.target.value })} />
      </Field>
      <Field label="Was wurde heute gemacht?">
        <textarea rows={4} value={v.work} onChange={(e) => set({ work: e.target.value })} placeholder="z. B. Leitungen im 1. Stock verlegt, Dosen gesetzt" />
      </Field>
      <div className="v-row2">
        <Field label="Personen">
          <input type="number" min={0} value={v.crew} onChange={(e) => set({ crew: Number(e.target.value) })} />
        </Field>
        <Field label="Stunden gesamt">
          <input type="number" min={0} step={0.5} value={v.hours} onChange={(e) => set({ hours: Number(e.target.value) })} />
        </Field>
      </div>
      <Field label="Besonderheiten (optional)">
        <input value={v.incidents} onChange={(e) => set({ incidents: e.target.value })} placeholder="z. B. Material fehlte, Regen ab Mittag" />
      </Field>
      <div className="v-group">
        <strong>Fotos</strong>
        <div className="v-mini-photos">
          {v.photos.map((src, i) => (
            <span key={i}>
              <img src={src} alt="" />
              <button type="button" onClick={() => set({ photos: v.photos.filter((_, k) => k !== i) })} aria-label="Foto entfernen">
                <X size={12} />
              </button>
            </span>
          ))}
          <button type="button" className="v-mini-add" onClick={() => photoInput.current?.click()} aria-label="Foto hinzufügen">
            <Camera size={18} />
          </button>
        </div>
        <input
          ref={photoInput}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={async (e) => {
            const files = Array.from(e.target.files ?? []);
            const urls = await Promise.all(files.map((f) => downscale(f, 1280)));
            set({ photos: [...v.photos, ...urls] });
            e.target.value = "";
          }}
        />
      </div>
    </Sheet>
  );
}
