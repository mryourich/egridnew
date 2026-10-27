"use client";

import { Camera, ChevronLeft, ChevronRight, Download, FileDown, FolderDown, ImagePlus, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { download, downloadBlob, extOf, fileBytes, readAttachment, safeName } from "@/core/files";
import { fmtWhen } from "@/core/format";
import { now, personName, uid, useStore } from "@/core/store";
import type { Project } from "@/core/types";
import { Button, Empty, IconButton, PageHead } from "@/core/ui";
import { access, childrenOf } from "./model";
import { PHOTO_GROUPS, projectPhotos, type ProjectPhoto } from "./photo-list";

const GROUPS = ["maengel", "regie", "tagesberichte", "dokumente", ""] as const;

/** Photo documentation: every photo of the project in folders, named automatically – single download, ZIP with folders, photo report as PDF. */
export function Photos({ project: p }: { project: Project }) {
  const { data, save, notify } = useStore();
  const { work } = access(data, p);
  const all = projectPhotos(data, p.id);
  const points = data.points.filter((x) => x.projectId === p.id);
  const [area, setArea] = useState<string>("*");
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const upload = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);

  const below = (id: string) => {
    const ids = new Set([id]);
    for (let grew = true; grew; ) {
      grew = false;
      for (const x of points) if (!ids.has(x.id) && ids.has(x.parentId)) (ids.add(x.id), (grew = true));
    }
    return ids;
  };
  const inArea = (ph: ProjectPhoto, a: string) => (a === "*" ? true : (GROUPS as readonly string[]).includes(a) ? ph.group === a : below(a).has(ph.group));
  const photos = all.filter((ph) => inArea(ph, area)).sort((a, b) => a.name.localeCompare(b.name, "de", { numeric: true }));
  const chosen = photos.filter((ph) => !selecting || picked.has(ph.key));
  const isPoint = points.some((x) => x.id === area);
  const areaName = area === "*" ? "Alle Fotos" : isPoint ? points.find((x) => x.id === area)!.title : PHOTO_GROUPS[area];

  const add = async (files: FileList | null) => {
    if (!files?.length) return;
    const list = Array.from(files);
    for (const f of list) {
      try {
        const file = await readAttachment(f, data.meId);
        const caption = /^(image|img|photo|dsc|pxl)[_-]?\d*/i.test(f.name) ? "" : f.name.replace(/\.[^.]+$/, "");
        save("photos", { id: uid(), projectId: p.id, pointId: isPoint ? area : "", caption, file, createdBy: data.meId, createdAt: now() }, "Foto hinzugefügt");
      } catch (e) {
        notify(e instanceof Error ? e.message : "Foto konnte nicht gelesen werden.");
      }
    }
    notify(list.length > 1 ? `${list.length} Fotos gespeichert` : "Foto gespeichert");
  };

  const zip = async () => {
    if (!chosen.length) return;
    setBusy(true);
    try {
      const { default: JSZip } = await import("jszip");
      const z = new JSZip();
      // folders follow the structure: Bereich/Unterbereich/Bereich - Unterbereich - 001.jpg
      for (const ph of chosen) z.file(`${ph.folder.map((f) => safeName(f)).join("/")}/${safeName(ph.name)}.${extOf(ph.file.url, ph.file.mime)}`, await fileBytes(ph.file.url));
      downloadBlob(await z.generateAsync({ type: "blob" }), `${safeName([p.number, p.name].filter(Boolean).join(" "))} Fotos ${safeName(areaName)}.zip`);
      notify(`${chosen.length} Fotos als ZIP heruntergeladen`);
    } catch {
      notify("ZIP konnte nicht erstellt werden.");
    } finally {
      setBusy(false);
    }
  };
  const report = () => {
    if (!chosen.length) return;
    try {
      window.localStorage.setItem("vysner:fotobericht", JSON.stringify({ projectId: p.id, keys: chosen.map((ph) => ph.key), title: areaName }));
    } catch {
      // without storage the report shows all photos
    }
    window.open(`/druck/fotos/${p.id}`, "_blank");
  };
  const toggle = (key: string) =>
    setPicked((s) => {
      const n = new Set(s);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });

  const count = (a: string) => all.filter((ph) => inArea(ph, a)).length;
  const tree = (parentId: string, depth: number): React.ReactNode =>
    childrenOf(points, parentId)
      .filter((n) => n.type !== "task")
      .map((n) => (
        <li key={n.id}>
          <button type="button" className={area === n.id ? "on" : ""} style={{ paddingLeft: 10 + depth * 14 }} onClick={() => setArea(n.id)}>
            <span>{n.title}</span>
            {count(n.id) > 0 && <em>{count(n.id)}</em>}
          </button>
          {points.some((k) => k.parentId === n.id && k.type !== "task") && <ul>{tree(n.id, depth + 1)}</ul>}
        </li>
      ));

  return (
    <div className="page">
      <PageHead kicker="Fotos" title="Fotodokumentation" sub="Alle Fotos des Projekts – aus Punkten, Mängeln, Regie und Tagesberichten. Namen vergibt VYSNER automatisch.">
        {work && (
          <>
            <Button icon={<ImagePlus size={15} />} onClick={() => upload.current?.click()}>
              Hochladen
            </Button>
            <Button variant="primary" icon={<Camera size={15} />} onClick={() => camera.current?.click()}>
              Kamera
            </Button>
            <input ref={upload} type="file" accept="image/*" multiple hidden onChange={(e) => (add(e.target.files), (e.target.value = ""))} />
            <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={(e) => (add(e.target.files), (e.target.value = ""))} />
          </>
        )}
      </PageHead>

      <div className="split">
        <aside className="panel gallery-tree">
          <ul>
            <li>
              <button type="button" className={area === "*" ? "on" : ""} onClick={() => setArea("*")}>
                <span>Alle Fotos</span>
                <em>{all.length}</em>
              </button>
            </li>
            {tree("", 0)}
            {GROUPS.map((g) => (
              <li key={g} className={g === "maengel" ? "sep" : ""}>
                <button type="button" className={area === g ? "on" : ""} onClick={() => setArea(g)}>
                  <span>{PHOTO_GROUPS[g]}</span>
                  {count(g) > 0 && <em>{count(g)}</em>}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <section className="split-main">
          <div className="toolbar">
            <h2 className="gallery-title">
              {areaName} <span className="muted">· {photos.length}</span>
            </h2>
            <span className="grow" />
            {selecting && (
              <>
                <button type="button" className="link" onClick={() => setPicked(new Set(photos.map((ph) => ph.key)))}>
                  Alle
                </button>
                <button type="button" className="link" onClick={() => setPicked(new Set())}>
                  Keine
                </button>
                <span className="muted small">{picked.size} ausgewählt</span>
              </>
            )}
            <Button size="sm" variant={selecting ? "primary" : "default"} onClick={() => setSelecting((v) => !v)}>
              {selecting ? "Fertig" : "Auswählen"}
            </Button>
            <Button size="sm" icon={<FolderDown size={14} />} disabled={!chosen.length || busy} onClick={zip}>
              {busy ? "Packt …" : "ZIP"}
            </Button>
            <Button size="sm" icon={<FileDown size={14} />} disabled={!chosen.length} onClick={report}>
              Fotobericht PDF
            </Button>
          </div>
          {photos.length === 0 ? (
            <Empty title={`Keine Fotos in „${areaName}“.`}>{work ? "Mit „Hochladen“ oder „Kamera“ hinzufügen." : undefined}</Empty>
          ) : (
            <div className="gallery-grid">
              {photos.map((ph, i) => (
                <div key={ph.key} className={`gal-item ${selecting ? "selecting" : ""} ${picked.has(ph.key) ? "picked" : ""}`}>
                  <button type="button" className="gal-img" onClick={() => (selecting ? toggle(ph.key) : setOpen(i))} title={ph.name}>
                    <img src={ph.file.url} alt={ph.caption || ph.name} loading="lazy" />
                    {selecting && <i className="gal-check">{picked.has(ph.key) ? "✓" : ""}</i>}
                  </button>
                  <span className="gal-cap">
                    <strong title={ph.name}>{ph.name}</strong>
                    <small>
                      {fmtWhen(ph.at)}
                      {ph.caption ? ` · ${ph.caption}` : ""}
                    </small>
                  </span>
                  <IconButton label="Herunterladen" className="gal-dl" onClick={() => download({ url: ph.file.url, name: `${safeName(ph.name)}.${extOf(ph.file.url, ph.file.mime)}` })}>
                    <Download size={14} />
                  </IconButton>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
      {open !== null && <PhotoViewer photos={photos} index={open} project={p} onClose={() => setOpen(null)} />}
    </div>
  );
}

function PhotoViewer({ photos, index, project, onClose }: { photos: ProjectPhoto[]; index: number; project: Project; onClose: () => void }) {
  const { data, save, remove } = useStore();
  const [i, setI] = useState(index);
  const ph = photos[Math.min(i, photos.length - 1)];
  const { manage, work } = access(data, project);
  const loose = ph?.photoId ? data.photos.find((x) => x.id === ph.photoId) : undefined;
  const mayEdit = !!loose && work && (manage || loose.createdBy === data.meId);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest("input")) return;
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setI((x) => Math.max(0, x - 1));
      if (e.key === "ArrowRight") setI((x) => Math.min(photos.length - 1, x + 1));
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [photos.length, onClose]);
  useEffect(() => {
    if (!photos.length) onClose();
  }, [photos.length, onClose]);
  if (!ph) return null;

  return createPortal(
    <div className="viewer" onMouseDown={(e) => e.target === e.currentTarget && onClose()} role="dialog" aria-label={ph.name}>
      <button type="button" className="viewer-close" onClick={onClose} aria-label="Schließen">
        <X size={22} />
      </button>
      {i > 0 && (
        <button type="button" className="viewer-nav prev" onClick={() => setI(i - 1)} aria-label="Vorheriges Foto">
          <ChevronLeft size={28} />
        </button>
      )}
      <figure>
        <img src={ph.file.url} alt={ph.caption || ph.name} />
        <figcaption>
          <strong>{ph.name}</strong>
          {mayEdit ? (
            <input key={loose!.id} className="viewer-caption" defaultValue={loose!.caption} placeholder="Beschreibung …" onBlur={(e) => e.target.value !== loose!.caption && save("photos", { ...loose!, caption: e.target.value })} />
          ) : (
            ph.caption && <span>{ph.caption}</span>
          )}
          <small>
            {fmtWhen(ph.at)} · {personName(data, ph.by)} · {i + 1}/{photos.length}
          </small>
          <span className="viewer-actions">
            <Button size="sm" icon={<Download size={14} />} onClick={() => download({ url: ph.file.url, name: `${safeName(ph.name)}.${extOf(ph.file.url, ph.file.mime)}` })}>
              Herunterladen
            </Button>
            {mayEdit && (
              <Button size="sm" variant="danger" icon={<Trash2 size={14} />} onClick={() => window.confirm("Foto löschen?") && (remove("photos", loose!.id, "Foto gelöscht"), setI(Math.max(0, i - 1)))}>
                Löschen
              </Button>
            )}
          </span>
        </figcaption>
      </figure>
      {i < photos.length - 1 && (
        <button type="button" className="viewer-nav next" onClick={() => setI(i + 1)} aria-label="Nächstes Foto">
          <ChevronRight size={28} />
        </button>
      )}
    </div>,
    document.body
  );
}
