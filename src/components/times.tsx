"use client";

import { ChevronLeft, ChevronRight, Download, FileSpreadsheet, FileText, Trash2, Wand2, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, type CSSProperties } from "react";
import { addDays, fmt, fmtShort, holidayName, isWeekend, today, weekdayShort } from "@/lib/date";
import { downloadBlob, safeName } from "@/lib/files";
import { currentUser, isManager, projectTeam, uid, useStore } from "@/lib/store";
import { absenceOn, daysOf, entryHours, fmtHours, isLeasing, monthPeriod, proposeFromPlan, sheetData, timesheetSettings, weekPeriod } from "@/lib/timesheet";
import * as L from "@/lib/labels";
import type { Absence, AbsenceType, Employee, Project, TimeEntry } from "@/lib/types";
import { EmpAvatar } from "./person";
import { TemplatePanel, TimesheetDesigner } from "./timesheet-designer";
import { Portal, Segmented } from "./ui";

type Kind = "woche" | "monat";

/** Hours per person and day; time sheets as PDF (own layout) or Excel (customer template). */
export function TimesSection({ project }: { project: Project }) {
  const { data, save, notify } = useStore();
  const manager = isManager(data);
  const me = currentUser(data);
  const [kind, setKind] = useState<Kind>("woche");
  const [anchor, setAnchor] = useState(today());
  const [filter, setFilter] = useState<"alle" | "eigen" | "leasing">("alle");
  const [edit, setEdit] = useState<{ emp: Employee; date: string; entry?: TimeEntry } | null>(null);
  const [busy, setBusy] = useState(false);
  const ansicht = useSearchParams().get("ansicht");
  const [view, setView] = useState<"erfassen" | "design" | "excel">("erfassen");
  // ?ansicht=design / excel opens a tab directly (e.g. from the settings)
  useEffect(() => {
    if (ansicht === "design" || ansicht === "excel") setView(ansicht);
  }, [ansicht]);
  const s = timesheetSettings(data);
  const period = kind === "woche" ? weekPeriod(anchor) : monthPeriod(anchor);
  const days = daysOf(period);
  const t = today();

  // subcontractors bill themselves – they get no time sheet
  const team = projectTeam(data, project).filter((e) => !/subunternehm/i.test(e.role) && (manager || e.id === me?.id));
  const shown = team.filter((e) => filter === "alle" || (filter === "leasing" ? isLeasing(e) : !isLeasing(e)));
  const groups: { key: string; label: string; people: Employee[] }[] = [];
  const own = shown.filter((e) => !isLeasing(e));
  if (own.length) groups.push({ key: "eigen", label: "Eigenpersonal", people: own });
  for (const agency of [...new Set(shown.filter(isLeasing).map((e) => e.leasingCompany || "Leasing"))].sort())
    groups.push({ key: `l:${agency}`, label: `Leasing · ${agency}`, people: shown.filter((e) => isLeasing(e) && (e.leasingCompany || "Leasing") === agency) });

  const entry = (emp: string, d: string) => data.times.find((x) => x.projectId === project.id && x.employeeId === emp && x.date === d);
  const sum = (emp: string) => data.times.filter((x) => x.projectId === project.id && x.employeeId === emp && x.date >= period.from && x.date <= period.to).reduce((n, x) => n + entryHours(x), 0);
  /** "2 U · 1 K" in the period (working days only). */
  const offCount = (emp: string) => {
    const n: Partial<Record<AbsenceType, number>> = {};
    for (const d of days) {
      const a = isWeekend(d) || holidayName(d) ? undefined : absenceOn(data, emp, d);
      if (a) n[a.type] = (n[a.type] ?? 0) + 1;
    }
    return (Object.keys(n) as AbsenceType[]).map((t) => `${n[t]} ${L.absenceShort[t]}`).join(" · ");
  };
  const canEdit = (emp: string) => manager || emp === me?.id;
  const step = (dir: number) => setAnchor(kind === "woche" ? addDays(period.from, dir * 7) : addDays(dir > 0 ? addDays(period.to, 1) : period.from, dir > 0 ? 0 : -1));

  const fromPlan = () => {
    const list = proposeFromPlan(data, project, period, shown.map((e) => e.id), (e) => ({ ...e, id: uid("t") }));
    list.forEach((e, i) => save("times", e, i === 0 ? `Zeiten aus dem Plan übernommen (${period.label})` : undefined));
    notify(list.length ? `${list.length} Tage aus dem Plan übernommen – bitte prüfen` : "Nichts zu übernehmen – im Plan stehen keine weiteren Tage");
  };

  const openPdf = (people: Employee[]) => window.open(`/zeitschein/${project.id}?von=${period.from}&bis=${period.to}&ma=${people.map((e) => e.id).join(",")}`, "_blank");

  const exportExcel = async (people: Employee[]) => {
    setBusy(true);
    try {
      const { defaultWorkbook, fillTemplate, sheetFileName } = await import("@/lib/timesheet-excel");
      const tpl = s.template?.mapping ? s.template : undefined;
      const files: { name: string; blob: Blob }[] = [];
      let cut = 0;
      for (const e of people) {
        const sd = sheetData(data, project, e.id, period);
        if (tpl) {
          const r = await fillTemplate(tpl.dataUrl, tpl.mapping!, sd);
          cut += r.cut;
          files.push({ name: sheetFileName(sd, s), blob: r.blob });
        } else files.push({ name: sheetFileName(sd, s), blob: await defaultWorkbook(sd, s) });
      }
      if (files.length === 1) downloadBlob(files[0].blob, files[0].name);
      else {
        const { default: JSZip } = await import("jszip");
        const zip = new JSZip();
        for (const f of files) zip.file(f.name, f.blob);
        downloadBlob(await zip.generateAsync({ type: "blob" }), `${safeName(`${s.title} ${period.label} ${project.code}`)}.zip`);
      }
      notify(cut ? `Exportiert – ${cut} Tage passten nicht mehr ins Formular` : tpl ? `${files.length} Zeitschein(e) mit eurer Vorlage erstellt` : `${files.length} Zeitschein(e) als Excel erstellt`);
    } catch {
      notify("Excel konnte nicht erstellt werden – Vorlage prüfen");
    } finally {
      setBusy(false);
    }
  };

  const tabs = manager && (
    <div className="times-tabs" role="tablist">
      {(
        [
          ["erfassen", "Zeiten erfassen"],
          ["design", "Zeitschein gestalten"],
          ["excel", "Excel-Vorlage"]
        ] as const
      ).map(([k, l]) => (
        <button key={k} type="button" role="tab" aria-selected={view === k} className={view === k ? "on" : ""} onClick={() => setView(k)}>
          {l}
        </button>
      ))}
    </div>
  );
  if (view === "design")
    return (
      <div className="stack times">
        {tabs}
        <TimesheetDesigner project={project} period={period} />
      </div>
    );
  if (view === "excel")
    return (
      <div className="stack times">
        {tabs}
        <TemplatePanel project={project} period={period} />
      </div>
    );

  return (
    <div className="stack times">
      {tabs}
      <div className="toolbar">
        <span className="btn-group">
          <button type="button" className="btn btn-icon" onClick={() => step(-1)} aria-label="Zurück">
            <ChevronLeft size={16} />
          </button>
          <button type="button" className="btn" onClick={() => setAnchor(today())}>
            Heute
          </button>
          <button type="button" className="btn btn-icon" onClick={() => step(1)} aria-label="Weiter">
            <ChevronRight size={16} />
          </button>
        </span>
        <Segmented
          options={[
            { value: "woche", label: "Woche" },
            { value: "monat", label: "Monat" }
          ]}
          value={kind}
          onChange={setKind}
        />
        <strong className="times-label">{period.label}</strong>
        <span className="spacer" />
        {manager && (
          <select className="sg-filter" value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} aria-label="Personal">
            <option value="alle">Alle</option>
            <option value="eigen">Eigenpersonal</option>
            <option value="leasing">Leasing</option>
          </select>
        )}
        {manager && (
          <button type="button" className="btn" onClick={fromPlan} title="Arbeitstage aus dem Plan mit der Standardzeit eintragen">
            <Wand2 size={15} /> Aus Plan übernehmen
          </button>
        )}
        <button type="button" className="btn" disabled={!shown.length} onClick={() => openPdf(shown)}>
          <FileText size={15} /> PDF{s.pdfSource === "excel" ? " (Vorlage)" : ""}
        </button>
        <button type="button" className="btn btn-primary" disabled={!shown.length || busy} onClick={() => exportExcel(shown)}>
          <FileSpreadsheet size={15} /> Excel{s.template?.mapping ? " (Vorlage)" : ""}
        </button>
      </div>

      <div className="card card-flush times-card">
        <div className="times-scroll">
          <table className="times-table" style={{ "--days": days.length } as CSSProperties}>
            <thead>
              <tr>
                <th className="tt-name">Mitarbeiter</th>
                {days.map((d) => (
                  <th key={d} className={`${isWeekend(d) || holidayName(d) ? "we" : ""} ${d === t ? "now" : ""}`} title={holidayName(d) ?? undefined}>
                    <small>{weekdayShort(d)}</small>
                    {fmtShort(d)}
                  </th>
                ))}
                <th className="tt-sum">Summe</th>
                <th className="tt-act" />
              </tr>
            </thead>
            <tbody>
              {groups.map((g) => (
                <GroupRows key={g.key} label={g.label} count={days.length} onPdf={g.key.startsWith("l:") && g.people.length > 1 ? () => openPdf(g.people) : undefined}>
                  {g.people.map((e) => (
                    <tr key={e.id}>
                      <td className="tt-name">
                        <EmpAvatar id={e.id} size={24} />
                        <span>
                          <strong>{e.name}</strong>
                          <small>{e.role}</small>
                        </span>
                      </td>
                      {days.map((d) => {
                        const x = entry(e.id, d);
                        const ab = absenceOn(data, e.id, d);
                        const tip = ab ? `${L.absenceType[ab.type].label}${ab.hours ? ` ${fmtHours(ab.hours)} h` : ""}${ab.note ? ` – ${ab.note}` : ""}` : x ? `${x.start}–${x.end}, Pause ${x.pause} min${x.activity ? `\n${x.activity}` : ""}` : "Zeit, ZA, Urlaub oder Krank eintragen";
                        return (
                          <td key={d} className={`tt-cell ${isWeekend(d) || holidayName(d) ? "we" : ""} ${x ? "has" : ""} ${ab ? `off abs-${ab.type}` : ""}`}>
                            <button type="button" disabled={!canEdit(e.id)} onClick={() => setEdit({ emp: e, date: d, entry: x })} title={tip}>
                              {x ? fmtHours(entryHours(x)) : ab ? L.absenceShort[ab.type] : ""}
                              {x && ab && <i className="tt-mark">{L.absenceShort[ab.type]}</i>}
                            </button>
                          </td>
                        );
                      })}
                      <td className="tt-sum">
                        {fmtHours(sum(e.id))}
                        {offCount(e.id) && <small>{offCount(e.id)}</small>}
                      </td>
                      <td className="tt-act">
                        <button type="button" className="icon-btn" title="Zeitschein als PDF" onClick={() => openPdf([e])}>
                          <FileText size={14} />
                        </button>
                        <button type="button" className="icon-btn" title="Zeitschein als Excel" disabled={busy} onClick={() => exportExcel([e])}>
                          <Download size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </GroupRows>
              ))}
              {groups.length === 0 && (
                <tr>
                  <td colSpan={days.length + 3} className="tt-empty">
                    Niemand im Projekt, für den Zeiten erfasst werden.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <p className="muted small">
        Klick auf ein Feld = Zeit eintragen. „Aus Plan übernehmen“ trägt jeden Arbeitstag mit Balken im Plan mit {s.dayStart}–{s.dayEnd} und {s.pause} min Pause ein. Aussehen und Excel-Vorlage stellst du oben unter „Zeitschein gestalten“ und „Excel-Vorlage“ ein.
      </p>

      {edit && <EntryDialog project={project} emp={edit.emp} date={edit.date} entry={edit.entry} onClose={() => setEdit(null)} />}
    </div>
  );
}

function GroupRows({ label, count, onPdf, children }: { label: string; count: number; onPdf?: () => void; children: React.ReactNode }) {
  return (
    <>
      <tr className="tt-group">
        <td colSpan={count + 3}>
          <span>{label}</span>
          {onPdf && (
            <button type="button" className="link-btn" onClick={onPdf}>
              <FileText size={12} /> Zeitscheine dieser Firma (PDF)
            </button>
          )}
        </td>
      </tr>
      {children}
    </>
  );
}

type Mode = "arbeit" | "za" | "urlaub" | "krank";

/** One day of one person: working time – or ZA, Urlaub, Krank (also for several days). */
function EntryDialog({ project, emp, date, entry, onClose }: { project: Project; emp: Employee; date: string; entry?: TimeEntry; onClose: () => void }) {
  const { data, save, remove, notify } = useStore();
  const s = timesheetSettings(data);
  const plan = data.jobs.filter((j) => j.projectId === project.id && j.employeeId === emp.id && !j.symbol && j.start <= date && j.end >= date).map((j) => j.title);
  const existing = absenceOn(data, emp.id, date);
  const [mode, setMode] = useState<Mode>(existing && (["za", "urlaub", "krank"] as string[]).includes(existing.type) ? (existing.type as Mode) : "arbeit");
  const [v, setV] = useState({ start: entry?.start ?? s.dayStart, end: entry?.end ?? s.dayEnd, pause: entry?.pause ?? s.pause, activity: entry?.activity ?? plan.join(", ") });
  const [abs, setAbs] = useState({ start: existing?.start ?? date, end: existing?.end ?? date, note: existing?.note ?? "", hours: existing?.hours ? String(existing.hours) : "" });
  const hours = entryHours(v);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  const saveWork = () => {
    save("times", { ...(entry ?? { id: uid("t"), projectId: project.id, employeeId: emp.id, date }), ...v, pause: Number(v.pause) || 0 }, `Zeit ${emp.name} ${fmt(date)}: ${fmtHours(hours)} h`);
    // a full working day replaces an all-day absence on that single day
    if (existing && existing.start === date && existing.end === date && !existing.hours) remove("absences", existing.id);
    onClose();
  };

  const saveAbsence = (type: AbsenceType) => {
    const end = abs.end < abs.start ? abs.start : abs.end;
    const za = type === "za" && Number(abs.hours) > 0 ? Number(abs.hours) : undefined;
    // whole days off: the working times of these days on this project go away
    const clash = za ? [] : data.times.filter((t) => t.projectId === project.id && t.employeeId === emp.id && t.date >= abs.start && t.date <= end);
    if (clash.length && !window.confirm(`An ${clash.length === 1 ? "diesem Tag ist" : `${clash.length} Tagen sind`} schon Arbeitszeiten eingetragen. Durch ${L.absenceType[type].label} ersetzen?`)) return;
    clash.forEach((t) => remove("times", t.id));
    const item: Absence = { ...(existing ?? { id: uid("a"), employeeId: emp.id }), type, start: abs.start, end, note: abs.note.trim(), hours: za };
    save("absences", item, `${L.absenceType[type].label} ${emp.name} ${fmt(abs.start)}${end !== abs.start ? ` – ${fmt(end)}` : ""}`);
    notify(`${L.absenceType[type].label} eingetragen`);
    onClose();
  };

  const tabs: [Mode, string][] = [
    ["arbeit", "Arbeitszeit"],
    ["za", "ZA"],
    ["urlaub", "Urlaub"],
    ["krank", "Krank"]
  ];

  return (
    <Portal>
      <div className="sheet-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
        <div className={`job-pop time-pop mode-${mode}`} role="dialog" aria-label="Zeit eintragen">
          <header>
            <span>
              {emp.name} · {weekdayShort(date)} {fmt(date)}
            </span>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Schließen">
              <X size={16} />
            </button>
          </header>
          <div className="time-modes" role="tablist">
            {tabs.map(([k, l]) => (
              <button key={k} type="button" role="tab" aria-selected={mode === k} className={mode === k ? `on m-${k}` : ""} onClick={() => setMode(k)}>
                {l}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (mode === "arbeit") saveWork();
              else saveAbsence(mode);
            }}
          >
            {mode === "arbeit" ? (
              <div className="job-grid">
                <label>
                  <span>Beginn</span>
                  <input type="time" value={v.start} onChange={(e) => setV({ ...v, start: e.target.value })} autoFocus />
                </label>
                <label>
                  <span>Ende</span>
                  <input type="time" value={v.end} onChange={(e) => setV({ ...v, end: e.target.value })} />
                </label>
                <label>
                  <span>Pause (min)</span>
                  <input type="number" min={0} step={5} value={v.pause} onChange={(e) => setV({ ...v, pause: Number(e.target.value) })} />
                </label>
                <label>
                  <span>Stunden</span>
                  <input value={`${fmtHours(hours)} h`} readOnly />
                </label>
                <label className="full">
                  <span>Tätigkeit</span>
                  <input value={v.activity} onChange={(e) => setV({ ...v, activity: e.target.value })} placeholder={plan.length ? plan.join(", ") : "z. B. Kabelzug Abschnitt B"} />
                </label>
                {existing && (
                  <p className="full time-hint">
                    {L.absenceType[existing.type].label} {existing.start === existing.end ? "an diesem Tag" : `${fmt(existing.start)} – ${fmt(existing.end)}`} ist eingetragen.
                  </p>
                )}
              </div>
            ) : (
              <div className="job-grid">
                <label>
                  <span>Von</span>
                  <input type="date" value={abs.start} onChange={(e) => e.target.value && setAbs({ ...abs, start: e.target.value, end: e.target.value > abs.end ? e.target.value : abs.end })} />
                </label>
                <label>
                  <span>Bis</span>
                  <input type="date" value={abs.end} min={abs.start} onChange={(e) => e.target.value && setAbs({ ...abs, end: e.target.value })} />
                </label>
                {mode === "za" && (
                  <label>
                    <span>Stunden ZA (leer = ganzer Tag)</span>
                    <input type="number" min={0} max={24} step={0.5} value={abs.hours} onChange={(e) => setAbs({ ...abs, hours: e.target.value })} placeholder="ganzer Tag" />
                  </label>
                )}
                <label className={mode === "za" ? "" : "full"}>
                  <span>Notiz</span>
                  <input value={abs.note} onChange={(e) => setAbs({ ...abs, note: e.target.value })} placeholder={mode === "krank" ? "z. B. Krankmeldung liegt vor" : "optional"} />
                </label>
                <p className="full time-hint">
                  {mode === "urlaub" ? "Urlaub" : mode === "krank" ? "Krankenstand" : "Zeitausgleich"} gilt für die Person in allen Projekten und erscheint auch im Plan und auf dem Zeitschein.
                </p>
              </div>
            )}
            <footer>
              {mode === "arbeit" && entry && (
                <button
                  type="button"
                  className="icon-btn"
                  title="Arbeitszeit löschen"
                  onClick={() => {
                    remove("times", entry.id, `Zeit ${emp.name} ${fmt(date)} gelöscht`);
                    onClose();
                  }}
                >
                  <Trash2 size={15} />
                </button>
              )}
              {mode !== "arbeit" && existing && existing.type === mode && (
                <button
                  type="button"
                  className="btn btn-sm btn-danger-ghost"
                  onClick={() => {
                    remove("absences", existing.id, `${L.absenceType[existing.type].label} ${emp.name} gelöscht`);
                    onClose();
                  }}
                >
                  <Trash2 size={13} /> {L.absenceType[existing.type].label} löschen
                </button>
              )}
              <span className="spacer" />
              <button type="button" className="btn btn-sm btn-ghost" onClick={onClose}>
                Abbrechen
              </button>
              <button type="submit" className="btn btn-sm btn-primary">
                Speichern
              </button>
            </footer>
          </form>
        </div>
      </div>
    </Portal>
  );
}
