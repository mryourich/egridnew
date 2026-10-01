"use client";

import { PhotoField } from "./photo-field";
import { Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { fmt, inRange, isoWeek, today, weekdayLong } from "@/lib/date";
import { canDelete, projectTeam, uid, useStore } from "@/lib/store";
import type { DailyReport } from "@/lib/types";
import { Portal } from "./ui";

/** Daily report as a side panel: what was done, who was there, photos of the day. */
export function ReportSheet({ report, onClose }: { report: Partial<DailyReport>; onClose: () => void }) {
  const { data, save, remove, notify } = useStore();
  const project = data.projects.find((p) => p.id === report.projectId) ?? data.projects[0];
  const date = report.date ?? today();
  const team = project ? projectTeam(data, project) : [];
  const onSite = team.filter((e) => data.jobs.some((j) => j.projectId === project?.id && j.employeeId === e.id && inRange(date, j.start, j.end)));
  const isNew = !report.id;
  const [v, setV] = useState<DailyReport>({
    id: report.id ?? uid("r"),
    projectId: project?.id ?? "",
    date,
    crew: report.crew ?? (onSite.length || team.length),
    hours: report.hours ?? (onSite.length || team.length) * 8,
    work: report.work ?? "",
    incidents: report.incidents ?? "",
    authorId: report.authorId ?? data.currentUserId,
    photos: report.photos ?? []
  });
  const set = (patch: Partial<DailyReport>) => setV((o) => ({ ...o, ...patch }));

  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);


  const submit = () => {
    if (!v.work.trim()) return;
    save("reports", { ...v, work: v.work.trim(), incidents: v.incidents.trim() }, `Tagesbericht ${fmt(v.date)} ${isNew ? "erstellt" : "geändert"}`);
    notify("Tagesbericht gespeichert");
    onClose();
  };

  return (
    <Portal>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="drawer report-drawer" aria-label="Tagesbericht">
        <header className="drawer-head">
          <span className="rd-title">
            <strong>Tagesbericht</strong>
            <small>
              {weekdayLong(v.date)}, {fmt(v.date)} · KW {isoWeek(v.date)}
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
              <span>Projekt</span>
              <select value={v.projectId} onChange={(e) => set({ projectId: e.target.value })}>
                {data.projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} · {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Personen vor Ort</span>
              <input type="number" min={0} value={v.crew} onChange={(e) => set({ crew: Number(e.target.value) })} />
            </label>
            <label>
              <span>Stunden gesamt</span>
              <input type="number" min={0} value={v.hours} onChange={(e) => set({ hours: Number(e.target.value) })} />
            </label>
            <label className="full">
              <span>Ausgeführte Arbeiten</span>
              <textarea rows={5} value={v.work} autoFocus={isNew} onChange={(e) => set({ work: e.target.value })} placeholder="Was wurde heute gemacht?" />
            </label>
            <label className="full">
              <span>Besondere Vorkommnisse / Behinderungen</span>
              <textarea rows={2} value={v.incidents} onChange={(e) => set({ incidents: e.target.value })} placeholder="optional" />
            </label>
          </div>

          <PhotoField photos={v.photos} onChange={(photos) => set({ photos })} hint="Fotos des Tages erscheinen im Tagesbericht-PDF." />


          <footer className="drawer-foot rd-foot">
            {!isNew && canDelete(data) && (
              <button
                type="button"
                className="btn btn-sm btn-danger-ghost"
                onClick={() => {
                  if (!window.confirm("Tagesbericht löschen?")) return;
                  remove("reports", v.id, "Tagesbericht gelöscht");
                  onClose();
                }}
              >
                <Trash2 size={13} /> Löschen
              </button>
            )}
            <span className="spacer" />
            <button type="button" className="btn btn-sm btn-ghost" onClick={onClose}>
              Abbrechen
            </button>
            <button type="submit" className="btn btn-sm btn-primary" disabled={!v.work.trim()}>
              Speichern
            </button>
          </footer>
        </form>
      </aside>
    </Portal>
  );
}
