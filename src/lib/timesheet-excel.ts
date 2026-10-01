import type { Workbook, Worksheet } from "exceljs";
import { fmt, today } from "./date";
import { dataUrlToBytes } from "./files";
import { absenceSummary, fmtHours, type SheetData } from "./timesheet";
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
    if (o.result != null) return String(o.result);
    if (o.formula) return `=${o.formula}`;
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
  // Urlaub / Krank / ZA: no times and no hours, the reason goes into the activity
  if (r.absence) return { datum: fmt(r.date), wochentag: r.weekday, beginn: "", ende: "", pause: "", stunden: "", taetigkeit: r.activity };
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
  const { wb, cut } = await fillWorkbook(dataUrl, mapping, sd);
  return { blob: await toBlob(wb), cut };
}

/** The filled template as a grid for the screen and the PDF – looks like the Excel form. */
export async function filledSheetView(dataUrl: string, mapping: TemplateMapping, sd: SheetData) {
  const { wb } = await fillWorkbook(dataUrl, mapping, sd);
  return sheetView(wb.getWorksheet(mapping.sheet) ?? wb.worksheets[0]);
}

/** The empty template as a grid (for checking the mapping). */
export async function templateView(dataUrl: string, sheet?: string) {
  const wb = await loadWorkbook(dataUrl);
  return sheetView((sheet && wb.getWorksheet(sheet)) || wb.worksheets[0]);
}

async function fillWorkbook(dataUrl: string, mapping: TemplateMapping, sd: SheetData) {
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
  return { wb, cut };
}

export type SheetCell = { text: string; colSpan: number; rowSpan: number; style: Record<string, string | number>; spill?: number };
export type SheetView = { widths: number[]; rows: { height: number; cells: (SheetCell | null)[] }[] };

function argb(c?: { argb?: string; theme?: number }) {
  if (!c?.argb || c.argb.length < 6) return undefined;
  return `#${c.argb.slice(-6)}`;
}

function borderCss(b?: { style?: string; color?: { argb?: string } }) {
  if (!b?.style) return undefined;
  const w = b.style === "thick" ? 2.5 : b.style === "medium" ? 1.6 : 1;
  const kind = b.style === "dashed" || b.style === "dotted" ? b.style : b.style === "double" ? "double" : "solid";
  return `${w}px ${kind} ${argb(b.color) ?? "#222"}`;
}

/** Converts a sheet into a grid: merged cells, widths, heights, fonts, fills, borders, alignment. */
function sheetView(ws: Worksheet): SheetView {
  let maxRow = 0;
  let maxCol = 0;
  ws.eachRow({ includeEmpty: false }, (row, r) =>
    row.eachCell({ includeEmpty: false }, (cell) => {
      const hasBorder = cell.border && Object.values(cell.border).some((b) => b && (b as { style?: string }).style);
      if (text(cell.value).trim() || hasBorder) {
        maxRow = Math.max(maxRow, r);
        maxCol = Math.max(maxCol, Number(cell.col));
      }
    })
  );
  const merges = ((ws as unknown as { model: { merges?: string[] } }).model.merges ?? []).map((m) => {
    const [a, b] = m.split(":");
    const ca = ws.getCell(a);
    const cb = ws.getCell(b);
    return { r1: Number(ca.row), c1: Number(ca.col), r2: Number(cb.row), c2: Number(cb.col) };
  });
  for (const m of merges) {
    maxRow = Math.max(maxRow, m.r2);
    maxCol = Math.max(maxCol, m.c2);
  }
  maxRow = Math.min(maxRow, 200);
  maxCol = Math.min(maxCol, 26);
  const covered = new Set<string>();
  const widths = Array.from({ length: maxCol }, (_, i) => Math.round(((ws.getColumn(i + 1).width ?? 9) * 7 + 5)));
  const rows: SheetView["rows"] = [];
  for (let r = 1; r <= maxRow; r++) {
    const row = ws.getRow(r);
    const cells: (SheetCell | null)[] = [];
    for (let c = 1; c <= maxCol; c++) {
      if (covered.has(`${r}:${c}`)) {
        cells.push(null);
        continue;
      }
      const m = merges.find((x) => x.r1 === r && x.c1 === c);
      if (m) for (let rr = m.r1; rr <= m.r2; rr++) for (let cc = m.c1; cc <= m.c2; cc++) if (rr !== r || cc !== c) covered.add(`${rr}:${cc}`);
      const cell = row.getCell(c);
      const f = cell.font ?? {};
      const fill = cell.fill as { type?: string; fgColor?: { argb?: string } } | undefined;
      const al = cell.alignment ?? {};
      const b = cell.border ?? {};
      const style: Record<string, string | number> = {};
      if (f.bold) style.fontWeight = 700;
      if (f.italic) style.fontStyle = "italic";
      if (f.size) style.fontSize = `${f.size}pt`;
      if (argb(f.color)) style.color = argb(f.color)!;
      if (fill?.type === "pattern" && argb(fill.fgColor)) style.background = argb(fill.fgColor)!;
      if (al.horizontal) style.textAlign = al.horizontal === "centerContinuous" ? "center" : al.horizontal;
      if (al.vertical) style.verticalAlign = al.vertical === "middle" ? "middle" : al.vertical;
      if (al.wrapText) style.whiteSpace = "pre-wrap";
      const bt = borderCss(b.top as never);
      const bl = borderCss(b.left as never);
      const bb = borderCss((m ? ws.getCell(m.r2, c).border?.bottom : b.bottom) as never);
      const br = borderCss((m ? ws.getCell(r, m.c2).border?.right : b.right) as never);
      if (bt) style.borderTop = bt;
      if (bl) style.borderLeft = bl;
      if (bb) style.borderBottom = bb;
      if (br) style.borderRight = br;
      let t = text(cell.value);
      if (typeof cell.value === "number" && !Number.isInteger(cell.value)) t = fmtHours(cell.value);
      if (t.startsWith("=")) t = "";
      cells.push({ text: t, colSpan: m ? m.c2 - m.c1 + 1 : 1, rowSpan: m ? m.r2 - m.r1 + 1 : 1, style });
    }
    // like Excel: left-aligned text runs on into empty cells to the right, up to the next filled one
    cells.forEach((c, i) => {
      if (!c?.text || c.style.whiteSpace || (c.style.textAlign && c.style.textAlign !== "left")) return;
      const own = widths.slice(i, i + c.colSpan).reduce((a, b) => a + b, 0);
      let extra = 0;
      for (let k = i + c.colSpan; k < cells.length; k++) {
        const n = cells[k];
        if (n === null || n.text) break;
        extra += widths[k];
      }
      if (extra) c.spill = (own + extra) / own;
    });
    rows.push({ height: Math.round((row.height ?? 15) * 1.33), cells });
  }
  return { widths, rows };
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
  const widths: Record<TemplateColumnField, number> = { wochentag: 6, datum: 12, beginn: 9, ende: 9, pause: 11, stunden: 10, taetigkeit: 48 };
  const designed = s.columns?.length ? s.columns : (Object.keys(widths) as TemplateColumnField[]).map((key) => ({ key, label: COLUMN_FIELDS[key], on: key === "pause" ? s.showPause : key === "taetigkeit" ? s.showActivity : true }));
  const cols: [TemplateColumnField, string, number][] = designed.filter((c) => c.on).map((c) => [c.key, c.label, widths[c.key]]);
  if (!cols.some(([k]) => k === "stunden")) cols.push(["stunden", "Stunden", 10]);
  ws.columns = cols.map(([, , w]) => ({ width: w }));
  const last = String.fromCharCode(64 + cols.length);
  ws.mergeCells(`A1:${last}1`);
  ws.getCell("A1").value = `${s.title} – ${sd.kw}`;
  ws.getCell("A1").font = { bold: true, size: 16, color: { argb: `FF${(s.accent ?? "#111827").slice(1)}` } };
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
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: `FF${(s.accent ?? "#1b57b8").slice(1)}` } };
    c.font = { bold: true, color: { argb: "FFFFFFFF" } };
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
  if (hoursCol > 1) {
    ws.getRow(sumRow).getCell(hoursCol - 1).value = "Summe";
    ws.getRow(sumRow).getCell(hoursCol - 1).font = { bold: true };
  }
  const sc = ws.getRow(sumRow).getCell(hoursCol);
  sc.value = sd.total;
  sc.numFmt = "0.00";
  sc.font = { bold: true };
  sc.border = border;
  if (sd.absences.length) ws.getCell(`A${sumRow + 1}`).value = `Abwesenheiten: ${absenceSummary(sd.absences)}`;
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
