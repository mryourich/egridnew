import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { COLUMN_FIELDS, HEADER_FIELDS } from "@/lib/timesheet-excel";
import type { TemplateColumnField, TemplateHeaderField, TemplateMapping } from "@/lib/types";

export const runtime = "nodejs";

type Sheet = { name: string; rows: number; cols: number; cells: { a: string; v: string }[]; merges: string[] };

const headerKeys = Object.keys(HEADER_FIELDS) as TemplateHeaderField[];
const columnKeys = Object.keys(COLUMN_FIELDS) as TemplateColumnField[];

/** Structured output: the model can only answer with a valid mapping. */
const schema = {
  type: "object",
  additionalProperties: false,
  required: ["sheet", "header", "rowStart", "rowCount", "columns", "note"],
  properties: {
    sheet: { type: "string", description: "Name des Arbeitsblatts mit dem Zeitschein" },
    header: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["field", "cell"],
        properties: { field: { type: "string", enum: headerKeys }, cell: { type: "string", description: "Zelle, in die der Wert geschrieben wird, z. B. C4" } }
      }
    },
    rowStart: { type: "integer", description: "Erste Zeile der Tagestabelle (1-basiert), 0 wenn keine" },
    rowCount: { type: "integer", description: "Anzahl der vorgesehenen Tageszeilen im Formular" },
    columns: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["field", "column"],
        properties: { field: { type: "string", enum: columnKeys }, column: { type: "string", description: "Spaltenbuchstabe, z. B. B" } }
      }
    },
    note: { type: "string", description: "Ein bis zwei Sätze auf Deutsch: was erkannt wurde und was unsicher ist" }
  }
} as const;

const SYSTEM = `Du analysierst leere Excel-Formulare für Zeitscheine (Stundennachweise) von Baufirmen und Personalleasing-Firmen.
Du bekommst die nicht-leeren Zellen (Adresse und Text) und die verbundenen Zellbereiche.
Bestimme, in welche Zellen die Software die Werte schreiben soll:
- Kopfdaten (Feldliste): die Zelle, in die der WERT gehört – meist die leere Zelle rechts neben oder unter der Beschriftung. Bei verbundenen Bereichen die linke obere Zelle des Bereichs. Nie die Zelle mit der Beschriftung selbst, außer die Beschriftung enthält einen Platzhalter.
- Tagestabelle: die erste leere Datenzeile unter der Tabellenüberschrift, wie viele Tageszeilen vorgesehen sind, und welche Spalte welchen Wert bekommt.
Nimm nur Felder auf, die das Formular wirklich vorsieht. Erfinde keine Zellen. Wenn "Stunden" und "Std." oder "Arbeitszeit" vorkommen, ist das die Spalte stunden. "Von/Bis" in der Tabelle sind beginn/ende, im Kopf von/bis.`;

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "Die KI ist auf dem Server noch nicht eingerichtet (ANTHROPIC_API_KEY fehlt). Bis dahin funktionieren Vorlagen mit {{Platzhaltern}}." }, { status: 503 });
  }
  let sheets: Sheet[];
  try {
    sheets = ((await req.json()) as { sheets: Sheet[] }).sheets;
    if (!Array.isArray(sheets) || !sheets.length) throw new Error();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }
  const fields = [
    "Kopfdaten-Felder:",
    ...headerKeys.map((k) => `- ${k}: ${HEADER_FIELDS[k]}`),
    "Tabellen-Spalten:",
    ...columnKeys.map((k) => `- ${k}: ${COLUMN_FIELDS[k]}`)
  ].join("\n");

  const client = new Anthropic();
  try {
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", format: { type: "json_schema", schema } },
      system: SYSTEM,
      messages: [{ role: "user", content: `${fields}\n\nFormular:\n${JSON.stringify(sheets)}` }]
    });
    if (response.stop_reason === "refusal") return NextResponse.json({ error: "Die KI konnte diese Vorlage nicht auswerten." }, { status: 422 });
    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") return NextResponse.json({ error: "Keine Antwort der KI." }, { status: 502 });
    const out = JSON.parse(textBlock.text) as {
      sheet: string;
      header: { field: TemplateHeaderField; cell: string }[];
      rowStart: number;
      rowCount: number;
      columns: { field: TemplateColumnField; column: string }[];
      note: string;
    };
    const cell = /^[A-Z]{1,3}\d{1,5}$/;
    const col = /^[A-Z]{1,3}$/;
    const mapping: TemplateMapping = {
      sheet: out.sheet,
      header: Object.fromEntries(out.header.filter((h) => headerKeys.includes(h.field) && cell.test(h.cell.toUpperCase())).map((h) => [h.field, h.cell.toUpperCase()])),
      rowStart: Math.max(0, out.rowStart | 0),
      rowCount: Math.max(0, out.rowCount | 0) || undefined,
      columns: Object.fromEntries(out.columns.filter((c) => columnKeys.includes(c.field) && col.test(c.column.toUpperCase())).map((c) => [c.field, c.column.toUpperCase()])),
      insertRows: false,
      note: out.note
    };
    return NextResponse.json({ mapping });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) return NextResponse.json({ error: "Der KI-Schlüssel auf dem Server ist ungültig." }, { status: 502 });
    if (error instanceof Anthropic.RateLimitError) return NextResponse.json({ error: "Die KI ist gerade ausgelastet – bitte gleich nochmal versuchen." }, { status: 429 });
    if (error instanceof Anthropic.APIError) return NextResponse.json({ error: `KI-Fehler (${error.status ?? "?"})` }, { status: 502 });
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Die Antwort der KI war unvollständig." }, { status: 502 });
    throw error;
  }
}
