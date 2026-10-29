"use client";

import { fmtDateTime } from "./format";
import { DEFECT_STATUS, PRIORITY, WORK_STATUS } from "./labels";
import { readFile } from "./store/files";
import type { Data, Defect, FileRef, OpenPoint } from "./store/types";
import { downloadBlob, makeZip, safeName } from "./zip";

type Entry = { path: string; data: Blob | Uint8Array };

const pad = (n: number) => String(n).padStart(2, "0");
const ext = (f: FileRef) => (/\.[a-z0-9]{2,5}$/i.exec(f.name)?.[0] ?? (f.mime === "image/jpeg" ? ".jpg" : f.mime === "image/png" ? ".png" : ""));
const person = (data: Data, id: string) => data.people.find((p) => p.id === id)?.name ?? "";
const csv = (rows: string[][]) => "﻿" + rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(";")).join("\r\n");

/** Adds the files of one record to a folder: 01_Name.jpg, 02_… */
async function addFiles(out: Entry[], folder: string, files: FileRef[], missing: { n: number }) {
  let i = 0;
  for (const f of files) {
    const blob = await readFile(f.id);
    if (!blob) {
      missing.n++;
      continue;
    }
    i++;
    const base = safeName(f.name.replace(/\.[a-z0-9]{2,5}$/i, ""));
    out.push({ path: `${folder}/${pad(i)}_${base}${ext(f)}`, data: blob });
  }
}

/**
 * Photo documentation of the checklist as ZIP: one folder per site, below it the structure as it was set up
 * (Bereich › Abschnitt › Unterabschnitt › Punkt), numbered in order. Plus a list as CSV for Excel.
 */
export async function exportChecklist(data: Data, siteIds: string[], rootId = "") {
  const out: Entry[] = [];
  const list: string[][] = [["Baustelle", "Pfad", "Punkt", "Status", "Zuständig", "Erledigt am", "Datei", "Aufgenommen von", "Aufgenommen am"]];
  const missing = { n: 0 };
  const kids = (parentId: string, siteId: string) => data.points.filter((p) => p.parentId === parentId && p.siteId === siteId).sort((a, b) => a.order - b.order);
  const walk = async (p: OpenPoint, folder: string, trail: string[], siteName: string) => {
    if (p.files.length) {
      await addFiles(out, folder, p.files, missing);
      for (const f of p.files) list.push([siteName, trail.slice(0, -1).join(" › "), p.title, WORK_STATUS[p.status].label, p.assigneeIds.map((id) => person(data, id)).join(", "), fmtDateTime(p.doneAt), f.name, person(data, f.addedBy), fmtDateTime(f.addedAt)]);
    }
    const children = kids(p.id, p.siteId);
    for (const [i, c] of children.entries()) await walk(c, `${folder}/${pad(i + 1)} ${safeName(c.title)}`, [...trail, c.title], siteName);
  };
  for (const siteId of siteIds) {
    const site = data.sites.find((s) => s.id === siteId);
    if (!site) continue;
    const top = safeName(`${site.number ? `${site.number} ` : ""}${site.name}`);
    const root = data.points.find((p) => p.id === rootId);
    if (root && root.siteId === siteId) {
      const trail = [...pathTitles(data.points, root.id), root.title];
      await walk(root, `${top}/${trail.map(safeName).join("/")}`, trail, site.name);
    } else {
      for (const [i, c] of kids("", siteId).entries()) await walk(c, `${top}/${pad(i + 1)} ${safeName(c.title)}`, [c.title], site.name);
    }
  }
  const photos = out.length;
  if (photos) out.push({ path: "Fotodokumentation.csv", data: new TextEncoder().encode(csv(list)) });
  return { out, photos, missing: missing.n };
}

function pathTitles(points: OpenPoint[], id: string) {
  const t: string[] = [];
  let p = points.find((x) => x.id === id);
  while (p?.parentId) {
    p = points.find((x) => x.id === p!.parentId);
    if (p) t.unshift(p.title);
  }
  return t;
}

/** Defects as ZIP: site › "M-001 Titel" › Mangel / Behebung, plus the defect list as CSV. */
export async function exportDefects(data: Data, defects: Defect[]) {
  const out: Entry[] = [];
  const missing = { n: 0 };
  const list: string[][] = [["Baustelle", "Nr.", "Mangel", "Ort", "Status", "Priorität", "Zuständig", "Frist", "Fotos Mangel", "Fotos Behebung", "Behoben von", "Behoben am", "Beschreibung"]];
  for (const d of [...defects].sort((a, b) => a.siteId.localeCompare(b.siteId) || a.no - b.no)) {
    const site = data.sites.find((s) => s.id === d.siteId);
    const no = `M-${String(d.no).padStart(3, "0")}`;
    const folder = `${safeName(site ? `${site.number ? `${site.number} ` : ""}${site.name}` : "Ohne Baustelle")}/${safeName(`${no} ${d.title}`)}`;
    await addFiles(out, `${folder}/Mangel`, d.files, missing);
    await addFiles(out, `${folder}/Behebung`, d.fixFiles ?? [], missing);
    list.push([site?.name ?? "", no, d.title, d.location, DEFECT_STATUS[d.status].label, PRIORITY[d.priority], person(data, d.ownerId), d.due, String(d.files.length), String((d.fixFiles ?? []).length), person(data, d.fixedBy ?? ""), fmtDateTime(d.fixedAt), d.description]);
  }
  const photos = out.length;
  out.push({ path: "Mängelliste.csv", data: new TextEncoder().encode(csv(list)) });
  return { out, photos, missing: missing.n };
}

export async function saveZip(out: Entry[], name: string) {
  downloadBlob(await makeZip(out), `${safeName(name)}.zip`);
}
