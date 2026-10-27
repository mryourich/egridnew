import { defectNo, fmtDate } from "@/core/format";
import type { Attachment, Data } from "@/core/types";
import { pathOf } from "./model";

/** One picture of the project documentation, wherever it was taken. */
export type ProjectPhoto = {
  key: string;
  file: Attachment;
  /** folder path, e.g. ["Tunnel Nord", "Ebene 2"] or ["Mängel", "M-001 Konsole lose"] */
  folder: string[];
  /** where it belongs: a point id, "maengel", "regie", "tagesberichte", "dokumente" or "" */
  group: string;
  /** automatic name: folder parts and a running number */
  name: string;
  caption: string;
  at: string;
  by: string;
  /** loose photo of the gallery (can be renamed and deleted there) */
  photoId?: string;
};

export const PHOTO_GROUPS: Record<string, string> = { maengel: "Mängel", regie: "Regie", tagesberichte: "Tagesberichte", dokumente: "Dokumente", "": "Ohne Bereich" };

/** All photos of a project: gallery, open points, defects (before and after), Regie, daily reports, documents. */
export function projectPhotos(data: Data, projectId: string): ProjectPhoto[] {
  const points = data.points.filter((p) => p.projectId === projectId);
  const out: Omit<ProjectPhoto, "name">[] = [];
  const pics = (list: Attachment[] = []) => list.filter((a) => a.kind === "photo");
  const area = (pointId: string) => (pointId && points.some((p) => p.id === pointId) ? pathOf(points, pointId).map((p) => p.title) : []);

  for (const ph of data.photos.filter((x) => x.projectId === projectId)) {
    const folder = area(ph.pointId);
    out.push({ key: ph.id, file: ph.file, folder: folder.length ? folder : [PHOTO_GROUPS[""]], group: folder.length ? ph.pointId : "", caption: ph.caption, at: ph.file.addedAt || ph.createdAt, by: ph.createdBy, photoId: ph.id });
  }
  for (const p of points) for (const a of pics(p.attachments)) out.push({ key: `${p.id}:${a.id}`, file: a, folder: area(p.id), group: p.id, caption: p.type === "task" ? p.title : "", at: a.addedAt, by: a.addedBy });
  for (const d of data.defects.filter((x) => x.projectId === projectId)) {
    const folder = [PHOTO_GROUPS.maengel, `${defectNo(d.no)} ${d.title}`];
    for (const a of pics(d.attachments)) out.push({ key: `${d.id}:${a.id}`, file: a, folder, group: "maengel", caption: `Vorher · ${d.title}`, at: a.addedAt, by: a.addedBy });
    for (const a of pics(d.fixPhotos)) out.push({ key: `${d.id}:${a.id}`, file: a, folder, group: "maengel", caption: `Behoben · ${d.title}`, at: a.addedAt, by: a.addedBy });
  }
  for (const r of data.regie.filter((x) => x.projectId === projectId))
    for (const a of pics(r.photos)) out.push({ key: `${r.id}:${a.id}`, file: a, folder: [PHOTO_GROUPS.regie, `Nr. ${String(r.no).padStart(2, "0")} ${fmtDate(r.date)}`], group: "regie", caption: r.description.split("\n")[0], at: a.addedAt, by: a.addedBy });
  for (const r of data.dailies.filter((x) => x.projectId === projectId))
    for (const a of pics(r.photos)) out.push({ key: `${r.id}:${a.id}`, file: a, folder: [PHOTO_GROUPS.tagesberichte, fmtDate(r.date)], group: "tagesberichte", caption: "", at: a.addedAt, by: a.addedBy });
  for (const d of data.documents.filter((x) => x.projectId === projectId && x.file.kind === "photo")) out.push({ key: d.id, file: d.file, folder: [PHOTO_GROUPS.dokumente], group: "dokumente", caption: d.name, at: d.file.addedAt, by: d.file.addedBy });

  // running number per folder, by date: "Tunnel Nord - Ebene 2 - 003"
  const count = new Map<string, number>();
  return out
    .sort((a, b) => a.at.localeCompare(b.at) || a.key.localeCompare(b.key))
    .map((x) => {
      const f = x.folder.join(" - ");
      const n = (count.get(f) ?? 0) + 1;
      count.set(f, n);
      return { ...x, name: `${f} - ${String(n).padStart(3, "0")}` };
    });
}
