"use client";

import { Download, FileSpreadsheet, ImagePlus, Sparkles, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { today } from "@/lib/date";
import { downloadBlob } from "@/lib/files";
import { myProjects, projectTeam, useStore } from "@/lib/store";
import { timesheetSettings, weekPeriod } from "@/lib/timesheet";
import type { TemplateColumnField, TemplateHeaderField, TemplateMapping, TimesheetSettings } from "@/lib/types";
import { Card, downscale } from "./ui";

const MAX_TEMPLATE = 2 * 1024 * 1024;

/** Settings › Zeitscheine: default day, own PDF layout and the customer's Excel template (with AI detection). */
export function TimesheetSettingsCard() {
  const { data, setCompany, notify } = useStore();
  const s = timesheetSettings(data);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const xlsx = useRef<HTMLInputElement>(null);
  const logo = useRef<HTMLInputElement>(null);
  const set = (patch: Partial<TimesheetSettings>) => setCompany({ ...data.company, timesheet: { ...s, ...patch } });
  const setMapping = (m: TemplateMapping | undefined) => s.template && set({ template: { ...s.template, mapping: m } });

  const upload = async (f: File | undefined) => {
    if (!f) return;
    setError("");
    if (f.size > MAX_TEMPLATE) return setError("Die Vorlage ist größer als 2 MB.");
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
      set({ template: { name: f.name, dataUrl, mapping } });
      notify(mapping ? "Vorlage mit Platzhaltern erkannt" : "Vorlage gespeichert – jetzt mit KI erkennen lassen");
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
      setMapping(out.mapping);
      notify("Vorlage von der KI erkannt – bitte kurz prüfen");
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
    ws.getRow(8).font = { bold: true };
    downloadBlob(new Blob([await wb.xlsx.writeBuffer()], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), "Zeitschein-Vorlage mit Platzhaltern.xlsx");
  };

  const preview = () => {
    const p = myProjects(data)[0];
    if (!p) return notify("Lege zuerst ein Projekt an");
    const w = weekPeriod(today());
    const ma = projectTeam(data, p).slice(0, 2).map((e) => e.id).join(",");
    window.open(`/zeitschein/${p.id}?von=${w.from}&bis=${w.to}&ma=${ma}`, "_blank");
  };

  const m = s.template?.mapping;
  const { HEADER_FIELDS, COLUMN_FIELDS } = FIELDS;

  return (
    <Card title="Zeitscheine">
      <div className="ts-set">
        <section>
          <h3>Standard-Arbeitstag</h3>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="ts-start">Beginn</label>
              <input id="ts-start" type="time" value={s.dayStart} onChange={(e) => set({ dayStart: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="ts-end">Ende</label>
              <input id="ts-end" type="time" value={s.dayEnd} onChange={(e) => set({ dayEnd: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="ts-pause">Pause (min)</label>
              <input id="ts-pause" type="number" min={0} step={5} value={s.pause} onChange={(e) => set({ pause: Number(e.target.value) })} />
            </div>
          </div>
        </section>

        <section>
          <h3>Eigenes PDF</h3>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="ts-title">Titel</label>
              <input id="ts-title" value={s.title} onChange={(e) => set({ title: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="ts-sign">Unterschriftsfelder (mit Komma getrennt)</label>
              <input id="ts-sign" value={s.signatures.join(", ")} onChange={(e) => set({ signatures: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} />
            </div>
            <div className="field field-full">
              <label htmlFor="ts-note">Hinweis unter der Tabelle</label>
              <input id="ts-note" value={s.note} onChange={(e) => set({ note: e.target.value })} placeholder="z. B. Mit der Unterschrift werden die Stunden bestätigt." />
            </div>
            <label className="check">
              <input type="checkbox" checked={s.showPause} onChange={(e) => set({ showPause: e.target.checked })} /> Spalte Pause
            </label>
            <label className="check">
              <input type="checkbox" checked={s.showActivity} onChange={(e) => set({ showActivity: e.target.checked })} /> Spalte Tätigkeit
            </label>
          </div>
          <div className="row-inline wrap">
            <button type="button" className="btn" onClick={() => logo.current?.click()}>
              <ImagePlus size={15} /> {s.logo ? "Firmenlogo ändern" : "Firmenlogo für das PDF"}
            </button>
            {s.logo && <img className="ts-logo" src={s.logo} alt="Logo" />}
            {s.logo && (
              <button type="button" className="icon-btn" title="Logo entfernen" onClick={() => set({ logo: undefined })}>
                <Trash2 size={14} />
              </button>
            )}
            <input ref={logo} type="file" accept="image/*" hidden onChange={async (e) => e.target.files?.[0] && set({ logo: await downscale(e.target.files[0], 600) })} />
            <button type="button" className="btn" onClick={preview}>
              Vorschau
            </button>
          </div>
        </section>

        <section>
          <h3>Excel-Vorlage (z. B. vom Kunden oder von der Leasingfirma)</h3>
          <p className="muted small">
            Lade euer Formular hoch. Mit <code>{"{{Platzhaltern}}"}</code> ist es sofort fertig – ohne Platzhalter erkennt die KI, wo Name, KW, Datum, Stunden usw. hingehören. Danach füllt VYSNER das Formular bei jedem Export automatisch aus.
          </p>
          <div className="row-inline wrap">
            <button type="button" className="btn btn-primary" onClick={() => xlsx.current?.click()} disabled={!!busy}>
              <Upload size={15} /> {s.template ? "Andere Vorlage" : "Vorlage hochladen"}
            </button>
            <input ref={xlsx} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden onChange={(e) => (upload(e.target.files?.[0]), (e.target.value = ""))} />
            <button type="button" className="btn" onClick={sampleTemplate}>
              <Download size={15} /> Beispiel-Vorlage mit Platzhaltern
            </button>
          </div>
          {busy && <p className="ts-busy">{busy}</p>}
          {error && <p className="form-error">{error}</p>}
          {s.template && (
            <div className="ts-tpl">
              <header>
                <FileSpreadsheet size={16} />
                <strong>{s.template.name}</strong>
                <span className={`badge badge-${m ? "green" : "amber"}`}>{m ? "einsatzbereit" : "noch nicht zugeordnet"}</span>
                <span className="spacer" />
                <button type="button" className="btn btn-sm" onClick={detectWithAi} disabled={!!busy}>
                  <Sparkles size={14} /> Mit KI erkennen
                </button>
                <button type="button" className="icon-btn" title="Vorlage entfernen" onClick={() => window.confirm("Vorlage entfernen?") && set({ template: undefined })}>
                  <Trash2 size={14} />
                </button>
              </header>
              {m?.note && <p className="ts-note-ai">{m.note}</p>}
              {m && (
                <div className="ts-map">
                  <div>
                    <h4>Kopfdaten → Zelle</h4>
                    {(Object.keys(HEADER_FIELDS) as TemplateHeaderField[]).map((k) => (
                      <label key={k}>
                        <span>{HEADER_FIELDS[k]}</span>
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
                    {(Object.keys(COLUMN_FIELDS) as TemplateColumnField[]).map((k) => (
                      <label key={k}>
                        <span>{COLUMN_FIELDS[k]}</span>
                        <input value={m.columns[k] ?? ""} placeholder="–" onChange={(e) => setMapping({ ...m, columns: { ...m.columns, [k]: e.target.value.toUpperCase().trim() || undefined } })} />
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </Card>
  );
}

/** Field labels – kept in sync with the Excel module without loading ExcelJS up front. */
const FIELDS = {
  HEADER_FIELDS: {
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
  } as Record<TemplateHeaderField, string>,
  COLUMN_FIELDS: {
    datum: "Datum",
    wochentag: "Wochentag",
    beginn: "Beginn",
    ende: "Ende",
    pause: "Pause",
    stunden: "Stunden",
    taetigkeit: "Tätigkeit"
  } as Record<TemplateColumnField, string>
};
