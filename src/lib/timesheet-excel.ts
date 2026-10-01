import type { Workbook, Worksheet } from "exceljs";
import { fmt, today } from "./date";
import { dataUrlToBytes } from "./files";
import { fmtHours, type SheetData } from "./timesheet";
import type { TemplateColumnField, TemplateHeaderField, TemplateMapping, TimesheetSettings } from "./types";

export const HEADER_FIELDS: Record<TemplateHeaderField, string> = {
  mitarbeiter: "Name des Mitarbeiters",
  personalnummer: "Personalnummer",
  firma: "Eigene Firma",
  verleiher: "Leasingfirma / Verleiher",
  projekt: "Projekt / Baustelle",
  projektnummer: "Projektnummer",
  kunde: "Kunde / Auftraggeber",
  ort: "Ort der Baustelle",
  kw: "Kalenderwoche",
  zeitraum: "Zeitraum (von – bis)",
  von: "Datum von",
  bis: "Datum bis",
  summe: "Summe Stunden",
  datum_heute: "Ausstellungsdatum",
  bauleitung: "Bauleitung"
};

export const COLUMN_FIELDS: Record<TemplateColumnField, string> = {
  datum: "Datum",
  wochentag: "Wochentag",
  beginn: "Beginn",
  ende: "Ende",
  pause: "Pause (Minuten)",
  stunden: "Stunden",
  taetigkeit: "Tätigkeit"
};

async function loadWorkbook(dataUrl: string) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const bytes = dataUrlToBytes(dataUrl);
  await wb.xlsx.load((typeof bytes === "string" ? new TextEncoder().encode(bytes) : bytes).buffer as ArrayBuffer);
  return wb;
}

function text(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "object") {
    const o = v as { richText?: { text: string }[]; text?: string; result?: unknown; formula?: string };
    if (o.richText) return o.richText.map((r) => r.text).join("");
    if (o.text) return String(o.text);
    if (o.formula) return `=${o.formula}`;
    if (o.result != null) return String(o.result);
    if (v instanceof Date) return v.toISOString().slice(0, 10);
  }
  return String(v);
}

const PH = /\{\{\s*([a-zA-Zäöü_]+)\s*\}\}/g;
const norm = (k: string) => k.toLowerCase().replace("ä", "ae").replace("ö", "oe").replace("ü", "ue");

/** Cells of the first sheets as text – what the AI gets to see (no personal data, only the empty form). */
export async function describeTemplate(dataUrl: string) {
  const wb = await loadWorkbook(dataUrl);
  return wb.worksheets.slice(0, 3).map((ws) => {
    const cells: { a: string; v: string }[] = [];
    ws.eachRow({ includeEmpty: false }, (row, r) => {
      if (r > 80) return;
      row.eachCell({ includeEmpty: false }, (cell) => {
        const v = text(cell.value).trim();
        if (v && Number(cell.col) <= 26) cells.push({ a: cell.address, v: v.slice(0, 80) });
      });
    });
    const merges = ((ws as unknown as { model: { merges?: string[] } }).model.merges ?? []).slice(0, 60);
    return { name: ws.name, rows: ws.rowCount, cols: ws.columnCount, cells, merges };
  });
}

/** Template with {{platzhaltern}}: the mapping follows from where they are. */
export async function placeholderMapping(dataUrl: string): Promise<TemplateMapping | null> {
  const wb = await loadWorkbook(dataUrl);
  for (const ws of wb.worksheets) {
    const header: TemplateMapping["header"] = {};
    const columns: TemplateMapping["columns"] = {};
    let rowStart = 0;
    ws.eachRow({ includeEmpty: false }, (row, r) => {
      row.eachCell({ includeEmpty: false }, (cell) => {
        for (const m of text(cell.value).matchAll(PH)) {
          const key = norm(m[1]);
          if (key in COLUMN_FIELDS) {
            columns[key as TemplateColumnField] = cell.address.replace(/\d+/g, "");
            rowStart = rowStart || r;
          } else if (key in HEADER_FIELDS) header[key as TemplateHeaderField] = cell.address;
        }
      });
    });
    if (Object.keys(header).length || rowStart) return { sheet: ws.name, header, columns, rowStart: rowStart || 0, insertRows: true, note: "Platzhalter in der Vorlage erkannt." };
  }
  return null;
}

function headerValues(sd: SheetData): Record<TemplateHeaderField, string | number> {
  return {
    mitarbeiter: sd.employee?.name ?? "",
    personalnummer: sd.employee?.staffNo ?? "",
    firma: sd.firma,
    verleiher: sd.verleiher,
    projekt: sd.project.name,
    projektnummer: sd.project.code,
    kunde: sd.project.client,
    ort: sd.project.location,
    kw: sd.kw,
    zeitraum: `${fmt(sd.from)} – ${fmt(sd.to)}`,
    von: fmt(sd.from),
    bis: fmt(sd.to),
    summe: sd.total,
    datum_heute: fmt(today()),
    bauleitung: sd.bauleitung
  };
}

function rowValues(r: SheetData["rows"][number]): Record<TemplateColumnField, string | number> {
  return { datum: fmt(r.date), wochentag: r.weekday, beginn: r.start, ende: r.end, pause: r.pause, stunden: r.hours, taetigkeit: r.activity };
}

/** Puts a value into a cell: replaces placeholders inside text, otherwise writes the value. */
function put(ws: Worksheet, address: string, value: string | number, key: string) {
  const cell = ws.getCell(address);
  const before = text(cell.value);
  if (PH.test(before)) {
    PH.lastIndex = 0;
    const replaced = before.replace(PH, (all, k: string) => (norm(k) === key ? String(value) : all));
    // a cell holding only the placeholder keeps the number type
    cell.value = before.trim().replace(PH, "").trim() === "" && typeof value === "number" ? value : replaced;
  } else {
    cell.value = value;
  }
  PH.lastIndex = 0;
}

/** Fills the customer's template; returns the file and how many days did not fit. */
export async function fillTemplate(dataUrl: string, mapping: TemplateMapping, sd: SheetData) {
  const wb = await loadWorkbook(dataUrl);
  const ws = wb.getWorksheet(mapping.sheet) ?? wb.worksheets[0];
  const hv = headerValues(sd);
  for (const [k, addr] of Object.entries(mapping.header)) if (addr) put(ws, addr, hv[k as TemplateHeaderField], k);
  let rows = sd.rows;
  let cut = 0;
  if (mapping.rowStart) {
    if (mapping.insertRows && rows.length > 1) ws.duplicateRow(mapping.rowStart, rows.length - 1, true);
    if (!mapping.insertRows && mapping.rowCount && rows.length > mapping.rowCount) {
      cut = rows.length - mapping.rowCount;
      rows = rows.slice(0, mapping.rowCount);
    }
    rows.forEach((r, i) => {
      const rv = rowValues(r);
      for (const [k, col] of Object.entries(mapping.columns)) if (col) put(ws, `${col}${mapping.rowStart + i}`, rv[k as TemplateColumnField], k);
    });
  }
  // leftover placeholders (no data for them) are emptied
  ws.eachRow({ includeEmpty: false }, (row) =>
    row.eachCell({ includeEmpty: false }, (cell) => {
      const v = text(cell.value);
      if (PH.test(v)) cell.value = v.replace(PH, "").trim();
      PH.lastIndex = 0;
    })
  );
  return { blob: await toBlob(wb), cut };
}

async function toBlob(wb: Workbook) {
  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

/** Clean time sheet without a customer template. */
export async function defaultWorkbook(sd: SheetData, s: TimesheetSettings) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(s.title.slice(0, 31) || "Zeitschein", { pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true, fitToWidth: 1 } });
  const cols: [TemplateColumnField, string, number][] = [
    ["wochentag", "Tag", 6],
    ["datum", "Datum", 12],
    ["beginn", "Beginn", 9],
    ["ende", "Ende", 9],
    ...(s.showPause ? [["pause", "Pause (min)", 11] as [TemplateColumnField, string, number]] : []),
    ["stunden", "Stunden", 10],
    ...(s.showActivity ? [["taetigkeit", "Tätigkeit", 48] as [TemplateColumnField, string, number]] : [])
  ];
  ws.columns = cols.map(([, , w]) => ({ width: w }));
  const last = String.fromCharCode(64 + cols.length);
  ws.mergeCells(`A1:${last}1`);
  ws.getCell("A1").value = `${s.title} – ${sd.kw}`;
  ws.getCell("A1").font = { bold: true, size: 16 };
  const info: [string, string][] = [
    ["Mitarbeiter", `${sd.employee?.name ?? ""}${sd.employee?.staffNo ? ` (Nr. ${sd.employee.staffNo})` : ""}`],
    [sd.leasing ? "Verleiher" : "Firma", sd.leasing ? sd.verleiher : sd.firma],
    ["Projekt", `${sd.project.code} · ${sd.project.name}`],
    ["Kunde / Ort", [sd.project.client, sd.project.location].filter(Boolean).join(" · ")],
    ["Zeitraum", `${fmt(sd.from)} – ${fmt(sd.to)}`]
  ];
  info.forEach(([k, v], i) => {
    ws.getCell(`A${3 + i}`).value = k;
    ws.getCell(`A${3 + i}`).font = { bold: true };
    ws.mergeCells(`C${3 + i}:${last}${3 + i}`);
    ws.getCell(`C${3 + i}`).value = v;
  });
  const head = 3 + info.length + 1;
  const border = { top: { style: "thin" as const }, left: { style: "thin" as const }, bottom: { style: "thin" as const }, right: { style: "thin" as const } };
  cols.forEach(([, label], i) => {
    const c = ws.getRow(head).getCell(i + 1);
    c.value = label;
    c.font = { bold: true };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE7EEF9" } };
    c.border = border;
  });
  sd.rows.forEach((r, i) => {
    const rv = rowValues(r);
    cols.forEach(([k], j) => {
      const c = ws.getRow(head + 1 + i).getCell(j + 1);
      c.value = rv[k];
      c.border = border;
      if (k === "stunden") c.numFmt = "0.00";
    });
  });
  const sumRow = head + 1 + sd.rows.length;
  const hoursCol = cols.findIndex(([k]) => k === "stunden") + 1;
  ws.getRow(sumRow).getCell(hoursCol - 1).value = "Summe";
  ws.getRow(sumRow).getCell(hoursCol - 1).font = { bold: true };
  const sc = ws.getRow(sumRow).getCell(hoursCol);
  sc.value = sd.total;
  sc.numFmt = "0.00";
  sc.font = { bold: true };
  sc.border = border;
  const sig = sumRow + 4;
  s.signatures.forEach((label, i) => {
    const col = 1 + i * Math.max(2, Math.floor(cols.length / Math.max(1, s.signatures.length)));
    const c = ws.getRow(sig).getCell(col);
    c.value = `________________\n${label}`;
    c.alignment = { wrapText: true };
  });
  ws.getRow(sig).height = 36;
  if (s.note) ws.getCell(`A${sig + 2}`).value = s.note;
  return toBlob(wb);
}

export function sheetFileName(sd: SheetData, s: TimesheetSettings) {
  return `${s.title} ${sd.kw} ${sd.employee?.name ?? ""} ${sd.project.code}`.replace(/[\\/:*?"<>|]+/g, "-").trim() + ".xlsx";
}

export { fmtHours };
