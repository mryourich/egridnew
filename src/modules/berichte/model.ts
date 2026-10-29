"use client";

import { now, uid } from "@/lib/store/id";
import { readFile, storeBlob } from "@/lib/store/files";
import type { Data, FileRef, Report, ReportKind, ServiceOrder } from "@/lib/store/types";
import { buildReportPdf, contentHash, TITLES } from "@/lib/pdf/report-pdf";
import { downloadBlob, safeName } from "@/lib/zip";

export const PREFIX: Record<ReportKind, string> = { bautagesbericht: "BTB", regie: "RS", service: "SB" };
export const KIND_LABEL: Record<ReportKind, string> = { bautagesbericht: "Bautagesbericht", regie: "Regieschein", service: "Servicebericht" };
export const STATUS_LABEL: Record<Report["status"], { label: string; tone: "neutral" | "amber" | "green" | "red" }> = {
  entwurf: { label: "Entwurf", tone: "neutral" },
  unterschrieben: { label: "Zur Freigabe", tone: "amber" },
  freigegeben: { label: "Freigegeben", tone: "green" },
  zurueck: { label: "Zurückgegeben", tone: "red" }
};

/** Consecutive number per kind and year: RS-2026-007. */
export function nextNo(data: Data, kind: ReportKind, date: string) {
  const p = `${PREFIX[kind]}-${date.slice(0, 4)}-`;
  const n = Math.max(0, ...data.reports.filter((r) => r.no.startsWith(p)).map((r) => Number(r.no.slice(p.length)) || 0));
  return `${p}${String(n + 1).padStart(3, "0")}`;
}

export function newReport(data: Data, kind: ReportKind, date: string, base: Partial<Report> = {}): Report {
  return {
    id: uid(),
    kind,
    no: nextNo(data, kind, date),
    status: "entwurf",
    siteId: "",
    orderId: "",
    customerId: "",
    date,
    orderedBy: "",
    reason: "",
    text: "",
    workers: [],
    materials: [],
    devices: [],
    withPrices: false,
    weather: "",
    tempAm: "",
    tempPm: "",
    hindrances: "",
    instructions: "",
    visitors: "",
    deliveries: "",
    accepted: "ohne",
    reservation: "",
    files: [],
    createdBy: data.meId,
    createdAt: now(),
    ...base
  };
}

/** Builds the PDF, stores it and returns the report with PDF reference and checksum. */
export async function freeze(data: Data, r: Report): Promise<Report> {
  const hash = await contentHash(r);
  const bytes = await buildReportPdf({ ...data, reports: data.reports.map((x) => (x.id === r.id ? r : x)) }, r, hash);
  const blob = new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" });
  const id = uid();
  await storeBlob(id, blob);
  const pdf: FileRef = { id, name: `${pdfName(data, r)}.pdf`, mime: "application/pdf", size: blob.size, addedBy: data.meId, addedAt: now() };
  return { ...r, pdf, hash };
}

export function pdfName(data: Data, r: Report) {
  const site = data.sites.find((s) => s.id === r.siteId)?.name;
  const cust = data.customers.find((c) => c.id === r.customerId)?.name;
  return safeName(`${r.no} ${TITLES[r.kind].split(" ")[0]} ${site ?? cust ?? ""}`);
}

/** Preview of a draft (not stored). */
export async function previewPdf(data: Data, r: Report) {
  const bytes = await buildReportPdf(data, r, await contentHash(r));
  return new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" });
}

/** Share the PDF (tablet: mail, messenger) – or download it. */
export async function sharePdf(r: Report, text: string) {
  if (!r.pdf) return false;
  const blob = await readFile(r.pdf.id);
  if (!blob) return false;
  const file = new File([blob], r.pdf.name, { type: "application/pdf" });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: r.pdf.name, text });
      return true;
    } catch {
      // cancelled: fall through to download
    }
  }
  downloadBlob(blob, r.pdf.name);
  return true;
}

/** May the signed-in person release reports? Team/site management – or anyone while nobody has the right. */
export function canApprove(data: Data) {
  const me = data.people.find((p) => p.id === data.meId);
  return !!me?.lead || !data.people.some((p) => p.lead && p.active);
}

/** Releases a signed report: the PDF gets the release note, a service order is closed. */
export async function approveReport(data: Data, r: Report, save: <K extends "reports" | "orders">(k: K, item: K extends "reports" ? Report : ServiceOrder) => void) {
  const out = await freeze(data, { ...r, status: "freigegeben", approvedBy: data.meId, approvedAt: now() });
  save("reports", out);
  const order = data.orders.find((o) => o.id === r.orderId);
  if (r.kind === "service" && order) save("orders", { ...order, status: "freigegeben" });
  return out;
}
