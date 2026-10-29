"use client";

import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import { fmt, weekdayLong } from "../date";
import { fmtDateTime, fmtEuro, fmtNum } from "../format";
import { readFile } from "../store/files";
import type { Customer, Data, Report, ServiceOrder, Signature, WorkLine } from "../store/types";

/*
 * Report PDFs (A4) for Austria:
 * - company details as required on business documents by § 14 UGB (Firma, Rechtsform, Sitz, Firmenbuchnummer,
 *   Firmenbuchgericht) plus UID, address and contact,
 * - consecutive document number, date, reference to site or order, client with address,
 * - Regieschein: who ordered the extra work and why, staff with time from–to and breaks, material, equipment,
 *   confirmation of kind and extent by the client (ÖNORM B 2110 Regieleistungen),
 * - Übernahme: accepted without / with reservation (ÖNORM B 2110 Übernahme),
 * - signatures with name in plain text, place and time; a checksum of the content in the footer.
 */

const A4 = { w: 595.28, h: 841.89 };
const M = 42;
const INK = rgb(0.09, 0.1, 0.11);
const MUTED = rgb(0.42, 0.45, 0.5);
const LINE = rgb(0.84, 0.86, 0.88);
const ACCENT = rgb(0.055, 0.353, 0.478);
const FILL = rgb(0.95, 0.955, 0.965);

export const TITLES: Record<Report["kind"], string> = {
  bautagesbericht: "Bautagesbericht",
  regie: "Regieschein",
  service: "Arbeitsbericht und Übernahmebestätigung"
};

/** Hours of a work line (from–to minus break). */
export function hoursOf(w: Pick<WorkLine, "from" | "to" | "pause">) {
  const m = (s: string) => {
    const [h, mi] = s.split(":").map(Number);
    return (h || 0) * 60 + (mi || 0);
  };
  if (!w.from || !w.to) return 0;
  let d = m(w.to) - m(w.from);
  if (d < 0) d += 24 * 60;
  return Math.max(0, Math.round(((d - (w.pause || 0)) / 60) * 100) / 100);
}

/** SHA-256 over the content that was confirmed – printed in the footer, so changes are detectable. */
export async function contentHash(r: Report) {
  const { pdf: _pdf, hash: _hash, approvedAt: _a, approvedBy: _b, status: _s, updatedAt: _u, updatedBy: _ub, returnNote: _rn, ...rest } = r;
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(rest)));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

class Doc {
  pdf!: PDFDocument;
  font!: PDFFont;
  bold!: PDFFont;
  page!: PDFPage;
  y = 0;
  chars = new Set<number>();

  async init() {
    this.pdf = await PDFDocument.create();
    this.font = await this.pdf.embedFont(StandardFonts.Helvetica);
    this.bold = await this.pdf.embedFont(StandardFonts.HelveticaBold);
    this.chars = new Set(this.font.getCharacterSet());
    this.newPage();
  }

  /** Standard fonts know Windows-1252 only – everything else is replaced. */
  clean(s: string) {
    return [...s.replace(/−/g, "-").replace(/→/g, "->").replace(/‑/g, "-").replace(/\t/g, "  ")].map((c) => (c === "\n" || this.chars.has(c.codePointAt(0)!) ? c : "?")).join("");
  }

  newPage() {
    this.page = this.pdf.addPage([A4.w, A4.h]);
    this.y = A4.h - M;
  }

  ensure(h: number) {
    if (this.y - h < M + 40) {
      this.newPage();
      this.y -= 10;
    }
  }

  lines(text: string, size: number, width: number, font = this.font) {
    const out: string[] = [];
    for (const para of this.clean(text).split("\n")) {
      let line = "";
      for (const word of para.split(/\s+/)) {
        const t = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(t, size) <= width) line = t;
        else {
          if (line) out.push(line);
          // very long words are cut
          let w = word;
          while (font.widthOfTextAtSize(w, size) > width && w.length > 1) {
            let i = w.length;
            while (i > 1 && font.widthOfTextAtSize(w.slice(0, i), size) > width) i--;
            out.push(w.slice(0, i));
            w = w.slice(i);
          }
          line = w;
        }
      }
      out.push(line);
    }
    return out;
  }

  text(s: string, x: number, y: number, size = 9, font = this.font, color = INK) {
    this.page.drawText(this.clean(s), { x, y, size, font, color });
  }

  /** Wrapped paragraph at the cursor. */
  para(s: string, size = 9.5, x = M, width = A4.w - 2 * M, font = this.font, color = INK) {
    for (const l of this.lines(s || "–", size, width, font)) {
      this.ensure(size + 4);
      this.text(l, x, this.y - size, size, font, color);
      this.y -= size + 3.5;
    }
  }

  section(title: string) {
    this.ensure(40);
    this.y -= 10;
    this.text(title.toUpperCase(), M, this.y - 8, 8, this.bold, ACCENT);
    this.y -= 12;
    this.page.drawLine({ start: { x: M, y: this.y }, end: { x: A4.w - M, y: this.y }, thickness: 0.6, color: LINE });
    this.y -= 6;
  }

  /** Label/value grid in two columns. */
  facts(rows: [string, string][], cols = 2) {
    const colW = (A4.w - 2 * M) / cols;
    for (let i = 0; i < rows.length; i += cols) {
      const chunk = rows.slice(i, i + cols);
      const heights = chunk.map(([, v]) => this.lines(v || "–", 9.5, colW - 92).length);
      const h = Math.max(...heights) * 13 + 3;
      this.ensure(h);
      chunk.forEach(([k, v], j) => {
        const x = M + j * colW;
        this.text(k, x, this.y - 9, 8, this.font, MUTED);
        this.lines(v || "–", 9.5, colW - 92).forEach((l, n) => this.text(l, x + 88, this.y - 9.5 - n * 13, 9.5));
      });
      this.y -= h;
    }
  }

  table(head: string[], rows: string[][], widths: number[], align: ("l" | "r")[] = [], foot?: string[]) {
    const total = A4.w - 2 * M;
    const ws = widths.map((w) => (w / widths.reduce((a, b) => a + b, 0)) * total);
    const drawRow = (cells: string[], bold: boolean, fill?: boolean) => {
      const wrapped = cells.map((c, i) => this.lines(c || "", 8.5, ws[i] - 8, bold ? this.bold : this.font));
      const h = Math.max(1, ...wrapped.map((l) => l.length)) * 11 + 6;
      this.ensure(h);
      if (fill) this.page.drawRectangle({ x: M, y: this.y - h, width: total, height: h, color: FILL });
      let x = M;
      wrapped.forEach((ls, i) => {
        ls.forEach((l, n) => {
          const f = bold ? this.bold : this.font;
          const tx = align[i] === "r" ? x + ws[i] - 4 - f.widthOfTextAtSize(l, 8.5) : x + 4;
          this.text(l, tx, this.y - 11 - n * 11, 8.5, f);
        });
        x += ws[i];
      });
      this.y -= h;
      this.page.drawLine({ start: { x: M, y: this.y }, end: { x: M + total, y: this.y }, thickness: 0.4, color: LINE });
    };
    drawRow(head, true, true);
    if (!rows.length) drawRow(["Keine Einträge", ...head.slice(1).map(() => "")], false);
    rows.forEach((r) => drawRow(r, false));
    if (foot) drawRow(foot, true);
    this.y -= 4;
  }

  async photos(files: Report["files"]) {
    const imgs = files.filter((f) => f.mime === "image/jpeg" || f.mime === "image/png").slice(0, 24);
    if (!imgs.length) return;
    this.section(`Fotos (${imgs.length})`);
    const w = (A4.w - 2 * M - 12) / 2;
    for (let i = 0; i < imgs.length; i += 2) {
      const pair: { img: PDFImage; name: string }[] = [];
      for (const f of imgs.slice(i, i + 2)) {
        const blob = await readFile(f.id);
        if (!blob) continue;
        const bytes = new Uint8Array(await blob.arrayBuffer());
        try {
          pair.push({ img: f.mime === "image/png" ? await this.pdf.embedPng(bytes) : await this.pdf.embedJpg(bytes), name: `${f.name} · ${fmtDateTime(f.addedAt)}` });
        } catch {
          // unreadable image: skipped
        }
      }
      if (!pair.length) continue;
      const h = Math.max(...pair.map((p) => Math.min(190, (p.img.height / p.img.width) * w)));
      this.ensure(h + 18);
      pair.forEach((p, j) => {
        const ih = Math.min(190, (p.img.height / p.img.width) * w);
        const iw = (p.img.width / p.img.height) * ih;
        const x = M + j * (w + 12);
        this.page.drawImage(p.img, { x, y: this.y - ih, width: iw, height: ih });
        this.text(this.lines(p.name, 7, w)[0], x, this.y - ih - 9, 7, this.font, MUTED);
      });
      this.y -= h + 18;
    }
  }

  async signatures(slots: { label: string; sig?: Signature }[]) {
    this.ensure(110);
    this.section("Unterschriften");
    const w = (A4.w - 2 * M - 24) / slots.length;
    const top = this.y;
    for (const [i, s] of slots.entries()) {
      const x = M + i * (w + 24);
      if (s.sig?.png) {
        try {
          const img = await this.pdf.embedPng(s.sig.png);
          const ih = 54;
          const iw = Math.min(w, (img.width / img.height) * ih);
          this.page.drawImage(img, { x, y: top - ih - 4, width: iw, height: ih });
        } catch {
          // signature image unreadable
        }
      }
      this.page.drawLine({ start: { x, y: top - 62 }, end: { x: x + w, y: top - 62 }, thickness: 0.8, color: INK });
      this.text(s.label, x, top - 73, 8, this.bold);
      this.text(s.sig ? `${s.sig.name} · ${s.sig.place ? `${s.sig.place}, ` : ""}${fmtDateTime(s.sig.at)}` : "Name in Blockbuchstaben, Ort, Datum", x, top - 84, 8, this.font, MUTED);
    }
    this.y = top - 96;
  }
}

function companyLines(data: Data) {
  const w = data.workspace;
  const firm = [w.name, w.legalForm && !w.name.includes(w.legalForm) ? w.legalForm : ""].filter(Boolean).join(" ");
  return {
    firm,
    contact: [w.address, w.phone && `Tel. ${w.phone}`, w.email, w.web].filter(Boolean).join(" · "),
    legal: [firm, w.seat && `Sitz ${w.seat}`, w.fbNo, w.fbCourt, w.uid && `UID ${w.uid}`].filter(Boolean).join(" · ")
  };
}

const addressOf = (c?: Pick<Customer, "street" | "zip" | "city">) => (c ? [c.street, [c.zip, c.city].filter(Boolean).join(" ")].filter(Boolean).join(", ") : "");

/** Builds the PDF of a report. */
export async function buildReportPdf(data: Data, r: Report, hash: string): Promise<Uint8Array> {
  const d = new Doc();
  await d.init();
  const co = companyLines(data);
  const site = data.sites.find((s) => s.id === r.siteId);
  const order: ServiceOrder | undefined = data.orders.find((o) => o.id === r.orderId);
  const customer = data.customers.find((c) => c.id === (r.customerId || order?.customerId));
  const person = (id: string) => data.people.find((p) => p.id === id)?.name ?? "";

  /* header */
  d.text(co.firm, M, d.y - 12, 13, d.bold);
  d.lines(co.contact, 8, 300).forEach((l, i) => d.text(l, M, d.y - 26 - i * 10, 8, d.font, MUTED));
  const title = TITLES[r.kind];
  const tw = d.bold.widthOfTextAtSize(d.clean(title), 13);
  d.text(title, A4.w - M - Math.min(tw, 250), d.y - 12, tw > 250 ? 10 : 13, d.bold, ACCENT);
  const right = [`Nr. ${r.no}`, `${weekdayLong(r.date)}, ${fmt(r.date)}`];
  right.forEach((l, i) => d.text(l, A4.w - M - d.font.widthOfTextAtSize(d.clean(l), 9), d.y - 28 - i * 12, 9));
  d.y -= 58;
  d.page.drawRectangle({ x: M, y: d.y, width: A4.w - 2 * M, height: 2, color: ACCENT });
  d.y -= 10;

  /* reference */
  if (site) {
    d.facts([
      ["Baustelle", `${site.name}${site.number ? ` (${site.number})` : ""}`],
      ["Auftraggeber", site.client],
      ["Adresse", site.address],
      ["Bauleitung", person(site.managerId)]
    ]);
  }
  if (order || customer) {
    const where = order && order.street ? addressOf(order) : addressOf(customer);
    d.facts([
      ["Kunde", [customer?.name, customer?.no && `Kd.-Nr. ${customer.no}`].filter(Boolean).join(" · ")],
      ["Ansprechpartner", [customer?.contact, customer?.phone].filter(Boolean).join(" · ")],
      ["Kundenadresse", addressOf(customer)],
      ["UID Kunde", customer?.uid ?? ""],
      ["Einsatzort", where],
      ["Auftrag", order ? `${order.no} – ${order.title}` : ""],
      ["Techniker", order ? person(order.techId) : ""],
      ["Datum", fmt(r.date)]
    ]);
  }

  /* body */
  const workers = r.workers.map((w) => ({ ...w, h: hoursOf(w) }));
  const sumH = workers.reduce((s, w) => s + w.h, 0);
  const workTable = (prices: boolean) =>
    d.table(
      prices ? ["Name", "Datum", "von", "bis", "Pause", "Std.", "Satz", "Betrag"] : ["Name", "Datum", "von", "bis", "Pause (min)", "Stunden"],
      workers.map((w) => [w.name || person(w.personId), fmt(w.date), w.from, w.to, String(w.pause || 0), fmtNum(w.h), ...(prices ? [w.rate ? fmtEuro(w.rate) : "", w.rate ? fmtEuro(w.rate * w.h) : ""] : [])]),
      prices ? [26, 12, 8, 8, 8, 8, 12, 14] : [34, 16, 10, 10, 14, 12],
      prices ? ["l", "l", "l", "l", "r", "r", "r", "r"] : ["l", "l", "l", "l", "r", "r"],
      prices ? ["Summe", "", "", "", "", fmtNum(sumH), "", fmtEuro(workers.reduce((s, w) => s + (w.rate ?? 0) * w.h, 0))] : ["Summe", "", "", "", "", fmtNum(sumH)]
    );
  const materialTable = (prices: boolean) =>
    d.table(
      prices ? ["Material", "Menge", "Einheit", "Preis", "Betrag"] : ["Material", "Menge", "Einheit"],
      r.materials.map((m) => [m.name, fmtNum(m.qty), m.unit, ...(prices ? [m.price ? fmtEuro(m.price) : "", m.price ? fmtEuro(m.price * m.qty) : ""] : [])]),
      prices ? [50, 12, 12, 13, 13] : [64, 18, 18],
      prices ? ["l", "r", "l", "r", "r"] : ["l", "r", "l"]
    );
  const deviceTable = (prices: boolean) =>
    d.table(
      prices ? ["Gerät", "Stunden", "Satz", "Betrag"] : ["Gerät", "Stunden"],
      r.devices.map((g) => [g.name, fmtNum(g.hours), ...(prices ? [g.rate ? fmtEuro(g.rate) : "", g.rate ? fmtEuro(g.rate * g.hours) : ""] : [])]),
      prices ? [56, 14, 15, 15] : [80, 20],
      prices ? ["l", "r", "r", "r"] : ["l", "r"]
    );

  if (r.kind === "bautagesbericht") {
    d.section("Witterung");
    d.facts([
      ["Wetter", r.weather],
      ["Temperatur", [r.tempAm && `früh ${r.tempAm} °C`, r.tempPm && `mittags ${r.tempPm} °C`].filter(Boolean).join(" · ")]
    ]);
    d.section("Personal auf der Baustelle");
    workTable(false);
    d.section("Ausgeführte Arbeiten");
    d.para(r.text);
    if (r.deliveries) (d.section("Lieferungen / Material"), d.para(r.deliveries));
    if (r.devices.length) (d.section("Geräte"), deviceTable(false));
    d.section("Behinderungen, besondere Vorkommnisse");
    d.para(r.hindrances || "Keine");
    if (r.instructions) (d.section("Anordnungen des Auftraggebers"), d.para(r.instructions));
    if (r.visitors) (d.section("Besuche, Begehungen"), d.para(r.visitors));
  }

  if (r.kind === "regie") {
    d.section("Regieleistung");
    d.para("Zusätzliche Leistung außerhalb des vereinbarten Leistungsumfangs, ausgeführt in Regie.", 8.5, M, A4.w - 2 * M, d.font, MUTED);
    d.y -= 2;
    d.facts(
      [
        ["Angeordnet von", r.orderedBy],
        ["Grund", r.reason]
      ],
      1
    );
    d.section("Beschreibung der Leistung");
    d.para(r.text);
    d.section("Arbeitskräfte");
    workTable(r.withPrices);
    d.section("Material");
    materialTable(r.withPrices);
    if (r.devices.length) (d.section("Geräte"), deviceTable(r.withPrices));
    if (r.withPrices) {
      const net = workers.reduce((s, w) => s + (w.rate ?? 0) * w.h, 0) + r.materials.reduce((s, m) => s + (m.price ?? 0) * m.qty, 0) + r.devices.reduce((s, g) => s + (g.rate ?? 0) * g.hours, 0);
      d.ensure(20);
      const t = `Summe netto ${fmtEuro(net)} (zzgl. USt)`;
      d.text(t, A4.w - M - d.bold.widthOfTextAtSize(d.clean(t), 10), d.y - 12, 10, d.bold);
      d.y -= 20;
    }
    d.y -= 4;
    d.para("Mit der Unterschrift bestätigt der Auftraggeber Art und Umfang der angeführten Regieleistungen. Die Verrechnung erfolgt nach den vereinbarten Preisen bzw. gemäß ÖNORM B 2110.", 8.5, M, A4.w - 2 * M, d.font, MUTED);
  }

  if (r.kind === "service") {
    d.section("Auftrag");
    d.para(order?.description ?? "");
    d.section("Durchgeführte Arbeiten");
    d.para(r.text);
    d.section("Arbeitszeit");
    workTable(false);
    d.section("Material");
    materialTable(false);
    d.section("Übernahme");
    d.para(r.accepted === "vorbehalt" ? `Die Leistung wurde mit folgendem Vorbehalt übernommen: ${r.reservation || "–"}` : "Die Leistung wurde ordnungsgemäß erbracht und vom Kunden ohne Vorbehalt übernommen.", 9.5, M, A4.w - 2 * M, d.bold);
  }

  await d.photos(r.files);
  await d.signatures(
    r.kind === "bautagesbericht"
      ? [
          { label: "Bauleitung / Auftragnehmer", sig: r.signContractor },
          { label: "Auftraggeber / ÖBA (optional)", sig: r.signClient }
        ]
      : [
          { label: r.kind === "service" ? "Kunde / Auftraggeber" : "Auftraggeber", sig: r.signClient },
          { label: r.kind === "service" ? "Techniker / Auftragnehmer" : "Auftragnehmer", sig: r.signContractor }
        ]
  );
  if (r.approvedAt) {
    d.ensure(16);
    d.text(`Freigegeben von ${person(r.approvedBy ?? "")} am ${fmtDateTime(r.approvedAt)}`, M, d.y - 10, 8.5, d.bold, ACCENT);
    d.y -= 16;
  }

  /* footer on every page */
  const pages = d.pdf.getPages();
  pages.forEach((p, i) => {
    p.drawLine({ start: { x: M, y: 40 }, end: { x: A4.w - M, y: 40 }, thickness: 0.5, color: LINE });
    const legal = d.lines(co.legal, 7, A4.w - 2 * M - 80);
    legal.slice(0, 2).forEach((l, n) => p.drawText(l, { x: M, y: 30 - n * 9, size: 7, font: d.font, color: MUTED }));
    const pg = `Seite ${i + 1} von ${pages.length}`;
    p.drawText(pg, { x: A4.w - M - d.font.widthOfTextAtSize(pg, 7), y: 30, size: 7, font: d.font, color: MUTED });
    const id = d.clean(`${r.no} · Prüfsumme ${hash.slice(0, 16)}`);
    p.drawText(id, { x: A4.w - M - d.font.widthOfTextAtSize(id, 6.5), y: 21, size: 6.5, font: d.font, color: MUTED });
  });
  d.pdf.setTitle(`${title} ${r.no}`);
  d.pdf.setAuthor(co.firm);
  d.pdf.setCreator("VYSNER");
  d.pdf.setLanguage("de-AT");
  return d.pdf.save();
}
