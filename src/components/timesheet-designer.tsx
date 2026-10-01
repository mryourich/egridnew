"use client";

import { ArrowDown, ArrowUp, Download, FileSpreadsheet, ImagePlus, Plus, Sparkles, Trash2, Upload, X } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { addDays } from "@/lib/date";
import { downloadBlob } from "@/lib/files";
import { projectTeam, useStore } from "@/lib/store";
import { entryHours, sheetData, timesheetSettings, type Period, type SheetData } from "@/lib/timesheet";
import type { SheetView } from "@/lib/timesheet-excel";
import type { DesignItem, Project, TemplateColumnField, TemplateHeaderField, TemplateMapping, TimesheetSettings } from "@/lib/types";
import { DesignedSheet, ExcelSheet } from "./timesheet-doc";
import { downscale } from "./ui";

const ACCENTS = ["#1b57b8", "#0f766e", "#b45309", "#b91c1c", "#6d28d9", "#334155", "#111827"];

function useTimesheet() {
  const { data, setCompany } = useStore();
  const s = timesheetSettings(data);
  const set = (patch: Partial<TimesheetSettings>) => setCompany({ ...data.company, timesheet: { ...(data.company.timesheet ?? {}), ...s, ...patch } });
  return { s, set };
}

/** Real data of the period for the preview – or a sample week when nothing is entered yet. */
function usePreviewData(project: Project, period: Period): SheetData {
  const { data } = useStore();
  const team = projectTeam(data, project).filter((e) => !/subunternehm/i.test(e.role));
  const withRows = team.map((e) => sheetData(data, project, e.id, period)).sort((a, b) => b.rows.length - a.rows.length)[0];
  if (withRows?.rows.length) return withRows;
  const base = withRows ?? sheetData(data, project, team[0]?.id ?? "", period);
  const days = [0, 1, 2, 3, 4].map((i) => addDays(period.from, i));
  const rows = days.map((d, i) => {
    const r = { id: `s${i}`, projectId: project.id, employeeId: base.employee?.id ?? "", date: d, start: "07:00", end: i === 4 ? "13:00" : "16:00", pause: i === 4 ? 0 : 30, activity: ["Kabelzug", "Trasse montiert", "Verteiler verdrahtet", "Messung", "Beschriftung"][i] };
    return { ...r, hours: entryHours(r), weekday: ["Mo", "Di", "Mi", "Do", "Fr"][i], absence: undefined };
  });
  return { ...base, employee: base.employee ?? { id: "x", name: "Max Muster", role: "Monteur", department: "", team: "", phone: "", email: "", hourlyRate: 0, qualifications: [], active: true, staffNo: "1001" }, rows, total: rows.reduce((n, r) => n + r.hours, 0) };
}

/* ---------------------------------------------------------------- designer */

export function TimesheetDesigner({ project, period }: { project: Project; period: Period }) {
  const { s, set } = useTimesheet();
  const sd = usePreviewData(project, period);
  const logo = useRef<HTMLInputElement>(null);
  const [newSign, setNewSign] = useState("");

  const move = <K extends string>(list: DesignItem<K>[], i: number, dir: number) => {
    const next = [...list];
    const j = i + dir;
    if (j < 0 || j >= next.length) return list;
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  };
  const items = <K extends string>(list: DesignItem<K>[], onChange: (l: DesignItem<K>[]) => void) => (
    <ul className="tsd-items">
      {list.map((it, i) => (
        <li key={it.key} className={it.on ? "" : "off"}>
          <input type="checkbox" checked={it.on} onChange={(e) => onChange(list.map((x, k) => (k === i ? { ...x, on: e.target.checked } : x)))} aria-label={`${it.label} anzeigen`} />
          <input value={it.label} onChange={(e) => onChange(list.map((x, k) => (k === i ? { ...x, label: e.target.value } : x)))} aria-label="Beschriftung" />
          <button type="button" className="icon-btn" disabled={i === 0} onClick={() => onChange(move(list, i, -1))} aria-label="Nach oben">
            <ArrowUp size={13} />
          </button>
          <button type="button" className="icon-btn" disabled={i === list.length - 1} onClick={() => onChange(move(list, i, 1))} aria-label="Nach unten">
            <ArrowDown size={13} />
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="tsd-wrap">
      <aside className="card tsd-panel">
        {s.template?.mapping && (
          <section>
            <h3>Grundlage für das PDF</h3>
            <div className="seg-full">
              <button type="button" className={s.pdfSource === "design" ? "on" : ""} onClick={() => set({ pdfSource: "design" })}>
                Eigenes Design
              </button>
              <button type="button" className={s.pdfSource === "excel" ? "on" : ""} onClick={() => set({ pdfSource: "excel" })}>
                Unsere Excel-Vorlage
              </button>
            </div>
            {s.pdfSource === "excel" && <p className="muted small">Das PDF ist eure ausgefüllte Excel-Vorlage. Der Designer gilt dann nicht.</p>}
          </section>
        )}
        <section>
          <h3>Kopf</h3>
          <label className="tsd-field">
            <span>Titel</span>
            <input value={s.title} onChange={(e) => set({ title: e.target.value })} />
          </label>
          <div className="tsd-row">
            <button type="button" className="btn btn-sm" onClick={() => logo.current?.click()}>
              <ImagePlus size={14} /> {s.logo ? "Logo ändern" : "Firmenlogo"}
            </button>
            {s.logo && (
              <button type="button" className="icon-btn" title="Logo entfernen" onClick={() => set({ logo: undefined })}>
                <X size={14} />
              </button>
            )}
            <input ref={logo} type="file" accept="image/*" hidden onChange={async (e) => e.target.files?.[0] && set({ logo: await downscale(e.target.files[0], 600) })} />
          </div>
          <span className="tsd-sub">Farbe</span>
          <div className="tsd-colors">
            {ACCENTS.map((c) => (
              <button key={c} type="button" className={s.accent === c ? "on" : ""} style={{ background: c }} onClick={() => set({ accent: c })} aria-label={c} />
            ))}
            <input type="color" value={s.accent} onChange={(e) => set({ accent: e.target.value })} aria-label="Eigene Farbe" />
          </div>
          <span className="tsd-sub">Stil</span>
          <div className="seg-full">
            {(
              [
                ["balken", "Farbbalken"],
                ["linie", "Linie"],
                ["kasten", "Kasten"]
              ] as const
            ).map(([k, l]) => (
              <button key={k} type="button" className={s.headStyle === k ? "on" : ""} onClick={() => set({ headStyle: k })}>
                {l}
              </button>
            ))}
          </div>
          <div className="tsd-two">
            <label className="tsd-field">
              <span>Seite</span>
              <select value={s.orientation} onChange={(e) => set({ orientation: e.target.value as "hoch" | "quer" })}>
                <option value="hoch">Hochformat</option>
                <option value="quer">Querformat</option>
              </select>
            </label>
            <label className="tsd-field">
              <span>Schrift</span>
              <select value={s.fontSize} onChange={(e) => set({ fontSize: e.target.value as "klein" | "normal" | "gross" })}>
                <option value="klein">Klein</option>
                <option value="normal">Normal</option>
                <option value="gross">Groß</option>
              </select>
            </label>
          </div>
        </section>
        <section>
          <h3>Kopfdaten</h3>
          {items(s.facts, (facts) => set({ facts }))}
        </section>
        <section>
          <h3>Spalten der Tabelle</h3>
          {items(s.columns, (columns) => set({ columns }))}
          <label className="tsd-check">
            <input type="checkbox" checked={s.showSummary} onChange={(e) => set({ showSummary: e.target.checked })} /> Summenzeile
          </label>
        </section>
        <section>
          <h3>Unterschriften</h3>
          <ul className="tsd-items">
            {s.signatures.map((l, i) => (
              <li key={i}>
                <input value={l} onChange={(e) => set({ signatures: s.signatures.map((x, k) => (k === i ? e.target.value : x)) })} aria-label="Unterschriftsfeld" />
                <button type="button" className="icon-btn" onClick={() => set({ signatures: s.signatures.filter((_, k) => k !== i) })} aria-label="Entfernen">
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
          </ul>
          <form
            className="tsd-row"
            onSubmit={(e) => {
              e.preventDefault();
              if (!newSign.trim()) return;
              set({ signatures: [...s.signatures, newSign.trim()] });
              setNewSign("");
            }}
          >
            <input value={newSign} onChange={(e) => setNewSign(e.target.value)} placeholder="z. B. Leasingfirma" aria-label="Neues Unterschriftsfeld" />
            <button type="submit" className="btn btn-sm" disabled={!newSign.trim()}>
              <Plus size={13} /> Feld
            </button>
          </form>
        </section>
        <section>
          <h3>Hinweis & Standardtag</h3>
          <label className="tsd-field">
            <span>Hinweis unter der Tabelle</span>
            <textarea rows={2} value={s.note} onChange={(e) => set({ note: e.target.value })} placeholder="z. B. Mit der Unterschrift werden die Stunden bestätigt." />
          </label>
          <div className="tsd-three">
            <label className="tsd-field">
              <span>Beginn</span>
              <input type="time" value={s.dayStart} onChange={(e) => set({ dayStart: e.target.value })} />
            </label>
            <label className="tsd-field">
              <span>Ende</span>
              <input type="time" value={s.dayEnd} onChange={(e) => set({ dayEnd: e.target.value })} />
            </label>
            <label className="tsd-field">
              <span>Pause</span>
              <input type="number" min={0} step={5} value={s.pause} onChange={(e) => set({ pause: Number(e.target.value) })} />
            </label>
          </div>
        </section>
      </aside>
      <div className="tsd-preview">
        <span className="tsd-preview-label">Vorschau · {sd.employee?.name}</span>
        <div className={`tsd-paper ${s.orientation === "quer" ? "quer" : ""}`}>
          {s.pdfSource === "excel" && s.template?.mapping ? <ExcelPreview sd={sd} /> : <DesignedSheet sd={sd} s={s} />}
        </div>
      </div>
    </div>
  );
}

/** Live view of the filled Excel form. */
function ExcelPreview({ sd, empty }: { sd?: SheetData; empty?: boolean }) {
  const { s } = useTimesheet();
  const [view, setView] = useState<SheetView | null>(null);
  const [err, setErr] = useState("");
  const tpl = s.template;
  const key = `${tpl?.dataUrl.length}|${JSON.stringify(tpl?.mapping)}|${sd?.employee?.id}|${sd?.rows.length}|${empty}`;
  useEffect(() => {
    if (!tpl) return;
    let alive = true;
    (async () => {
      try {
        const x = await import("@/lib/timesheet-excel");
        const v = !empty && tpl.mapping && sd ? await x.filledSheetView(tpl.dataUrl, tpl.mapping, sd) : await x.templateView(tpl.dataUrl, tpl.mapping?.sheet);
        if (alive) (setView(v), setErr(""));
      } catch {
        if (alive) setErr("Die Vorlage konnte nicht angezeigt werden.");
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  if (err) return <p className="form-error">{err}</p>;
  return view ? <ExcelSheet view={view} /> : <p className="muted small">Lädt …</p>;
}

/* ---------------------------------------------------------------- Excel template */

const HEADER_LABELS: Record<TemplateHeaderField, string> = {
  mitarbeiter: "Name",
  personalnummer: "Personalnummer",
  firma: "Eigene Firma",
  verleiher: "Leasingfirma",
  projekt: "Projekt",
  projektnummer: "Projektnummer",
  kunde: "Kunde",
  ort: "Ort",
  kw: "KW",
  zeitraum: "Zeitraum",
  von: "Von",
  bis: "Bis",
  summe: "Summe Stunden",
  datum_heute: "Ausstellungsdatum",
  bauleitung: "Bauleitung"
};
const COLUMN_LABELS: Record<TemplateColumnField, string> = { datum: "Datum", wochentag: "Wochentag", beginn: "Beginn", ende: "Ende", pause: "Pause", stunden: "Stunden", taetigkeit: "Tätigkeit" };

export function TemplatePanel({ project, period }: { project: Project; period: Period }) {
  const { notify } = useStore();
  const { s, set } = useTimesheet();
  const sd = usePreviewData(project, period);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const xlsx = useRef<HTMLInputElement>(null);
  const m = s.template?.mapping;
  const setMapping = (mapping: TemplateMapping | undefined) => s.template && set({ template: { ...s.template, mapping } });

  const upload = async (f: File | undefined) => {
    if (!f) return;
    setError("");
    if (f.size > 2 * 1024 * 1024) return setError("Die Vorlage ist größer als 2 MB.");
    if (!/\.xlsx$/i.test(f.name)) return setError("Bitte eine Excel-Datei im Format .xlsx wählen (ältere .xls zuerst in Excel als .xlsx speichern).");
    setBusy("Vorlage wird gelesen …");
    try {
      const dataUrl = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result));
        r.onerror = rej;
        r.readAsDataURL(f);
      });
      const { placeholderMapping } = await import("@/lib/timesheet-excel");
      const mapping = (await placeholderMapping(dataUrl)) ?? undefined;
      set({ template: { name: f.name, dataUrl, mapping }, pdfSource: mapping ? "excel" : s.pdfSource });
      notify(mapping ? "Vorlage erkannt – sie wird jetzt für PDF und Excel verwendet" : "Vorlage gespeichert – jetzt mit KI erkennen lassen");
    } catch {
      setError("Die Datei konnte nicht gelesen werden.");
    } finally {
      setBusy("");
    }
  };

  const detectWithAi = async () => {
    if (!s.template) return;
    setError("");
    setBusy("Die KI liest das Formular …");
    try {
      const { describeTemplate } = await import("@/lib/timesheet-excel");
      const sheets = await describeTemplate(s.template.dataUrl);
      const res = await fetch("/api/ki/zeitschein-vorlage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sheets }) });
      const out = (await res.json()) as { mapping?: TemplateMapping; error?: string };
      if (!res.ok || !out.mapping) throw new Error(out.error ?? "Die KI hat keine Zuordnung geliefert.");
      set({ template: { ...s.template, mapping: out.mapping }, pdfSource: "excel" });
      notify("Vorlage von der KI erkannt – bitte in der Vorschau prüfen");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Die KI ist gerade nicht erreichbar.");
    } finally {
      setBusy("");
    }
  };

  const sampleTemplate = async () => {
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Zeitschein");
    ws.columns = [{ width: 8 }, { width: 12 }, { width: 9 }, { width: 9 }, { width: 9 }, { width: 10 }, { width: 44 }];
    const rows: (string | null)[][] = [
      ["Stundennachweis {{kw}}"],
      [],
      ["Mitarbeiter:", null, "{{mitarbeiter}}", null, "Pers.-Nr.:", "{{personalnummer}}"],
      ["Verleiher:", null, "{{verleiher}}", null, "Firma:", "{{firma}}"],
      ["Projekt:", null, "{{projektnummer}} {{projekt}}"],
      ["Kunde:", null, "{{kunde}}", null, "Zeitraum:", "{{zeitraum}}"],
      [],
      ["Tag", "Datum", "Beginn", "Ende", "Pause", "Stunden", "Tätigkeit"],
      ["{{wochentag}}", "{{datum}}", "{{beginn}}", "{{ende}}", "{{pause}}", "{{stunden}}", "{{taetigkeit}}"],
      [null, null, null, null, "Summe", "{{summe}}"],
      [],
      ["Unterschrift Mitarbeiter", null, null, "Unterschrift Bauleitung ({{bauleitung}})"]
    ];
    rows.forEach((r) => ws.addRow(r));
    ws.getRow(1).font = { bold: true, size: 14 };
    const thin = { style: "thin" as const };
    for (const r of [8, 9]) for (let c = 1; c <= 7; c++) ws.getRow(r).getCell(c).border = { top: thin, left: thin, bottom: thin, right: thin };
    ws.getRow(8).font = { bold: true };
    for (let c = 1; c <= 7; c++) ws.getRow(8).getCell(c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE7EEF9" } };
    downloadBlob(new Blob([await wb.xlsx.writeBuffer()], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), "Zeitschein-Vorlage mit Platzhaltern.xlsx");
  };

  return (
    <div className="tsd-wrap">
      <aside className="card tsd-panel">
        <section>
          <h3>Eure Excel als Formular</h3>
          <p className="muted small">
            Lade euren Zeitschein als Excel hoch. VYSNER füllt ihn bei jedem Export aus – als <b>Excel</b> und als <b>PDF</b>, genau so wie er in Excel aussieht.
          </p>
          <div className="tsd-row wrap">
            <button type="button" className="btn btn-primary" onClick={() => xlsx.current?.click()} disabled={!!busy}>
              <Upload size={15} /> {s.template ? "Andere Excel hochladen" : "Excel hochladen"}
            </button>
            <input ref={xlsx} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden onChange={(e) => (upload(e.target.files?.[0]), (e.target.value = ""))} />
            <button type="button" className="btn btn-sm" onClick={sampleTemplate}>
              <Download size={14} /> Beispiel mit Platzhaltern
            </button>
          </div>
          <p className="muted small">
            Mit Platzhaltern wie <code>{"{{mitarbeiter}}"}</code>, <code>{"{{datum}}"}</code>, <code>{"{{stunden}}"}</code> ist die Vorlage sofort fertig. Ohne Platzhalter erkennt die KI die Felder.
          </p>
          {busy && <p className="ts-busy">{busy}</p>}
          {error && <p className="form-error">{error}</p>}
        </section>
        {s.template && (
          <section className="ts-tpl">
            <header>
              <FileSpreadsheet size={16} />
              <strong>{s.template.name}</strong>
              <span className={`badge badge-${m ? "green" : "amber"}`}>{m ? "einsatzbereit" : "noch nicht zugeordnet"}</span>
              <span className="spacer" />
              <button type="button" className="icon-btn" title="Vorlage entfernen" onClick={() => window.confirm("Vorlage entfernen?") && set({ template: undefined, pdfSource: "design" })}>
                <Trash2 size={14} />
              </button>
            </header>
            <div className="tsd-row wrap">
              <button type="button" className="btn btn-sm" onClick={detectWithAi} disabled={!!busy}>
                <Sparkles size={14} /> Mit KI erkennen
              </button>
              {m && (
                <label className="tsd-check">
                  <input type="checkbox" checked={s.pdfSource === "excel"} onChange={(e) => set({ pdfSource: e.target.checked ? "excel" : "design" })} /> Auch für das PDF verwenden
                </label>
              )}
            </div>
            {m?.note && <p className="ts-note-ai">{m.note}</p>}
            {m && (
              <details className="ts-mapdetails">
                <summary>Zuordnung prüfen / ändern</summary>
                <div className="ts-map">
                  <div>
                    <h4>Kopfdaten → Zelle</h4>
                    {(Object.keys(HEADER_LABELS) as TemplateHeaderField[]).map((k) => (
                      <label key={k}>
                        <span>{HEADER_LABELS[k]}</span>
                        <input value={m.header[k] ?? ""} placeholder="–" onChange={(e) => setMapping({ ...m, header: { ...m.header, [k]: e.target.value.toUpperCase().trim() || undefined } })} />
                      </label>
                    ))}
                  </div>
                  <div>
                    <h4>Tagestabelle</h4>
                    <label>
                      <span>Arbeitsblatt</span>
                      <input value={m.sheet} onChange={(e) => setMapping({ ...m, sheet: e.target.value })} />
                    </label>
                    <label>
                      <span>Erste Zeile</span>
                      <input type="number" min={0} value={m.rowStart} onChange={(e) => setMapping({ ...m, rowStart: Number(e.target.value) })} />
                    </label>
                    <label>
                      <span>{m.insertRows ? "Zeilen" : "Zeilen im Formular"}</span>
                      {m.insertRows ? <input value="werden eingefügt" readOnly /> : <input type="number" min={0} value={m.rowCount ?? ""} onChange={(e) => setMapping({ ...m, rowCount: Number(e.target.value) || undefined })} />}
                    </label>
                    <h4>Spalten → Buchstabe</h4>
                    {(Object.keys(COLUMN_LABELS) as TemplateColumnField[]).map((k) => (
                      <label key={k}>
                        <span>{COLUMN_LABELS[k]}</span>
                        <input value={m.columns[k] ?? ""} placeholder="–" onChange={(e) => setMapping({ ...m, columns: { ...m.columns, [k]: e.target.value.toUpperCase().trim() || undefined } })} />
                      </label>
                    ))}
                  </div>
                </div>
              </details>
            )}
          </section>
        )}
      </aside>
      <div className="tsd-preview">
        <span className="tsd-preview-label">{s.template ? (m ? `Vorschau ausgefüllt · ${sd.employee?.name}` : "Vorlage (noch leer)") : "Noch keine Vorlage"}</span>
        <div className="tsd-paper">{s.template ? <ExcelPreview sd={sd} empty={!m} /> : <EmptyPaper />}</div>
      </div>
    </div>
  );
}

function EmptyPaper() {
  return (
    <div className="doc tsd-empty" style={{ "--ac": "#94a3b8" } as CSSProperties}>
      <FileSpreadsheet size={40} />
      <p>Hier erscheint eure Excel-Vorlage – ausgefüllt mit den Zeiten.</p>
    </div>
  );
}
