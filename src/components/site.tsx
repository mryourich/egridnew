"use client";

import { fileBytes, safeName } from "@/lib/files";
import { Camera, ChevronLeft, ChevronRight, Download, ImagePlus, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { fmt, fmtShort, today } from "@/lib/date";
import { childrenOf, pathLabel, pathOf, photoName, subtreeIds } from "@/lib/site";
import { canDelete, employeeName, uid, useStore } from "@/lib/store";
import type { Photo, Project } from "@/lib/types";
import { downscale, Empty, Portal } from "./ui";

/* ---------------------------------------------------------------- Foto hinzufügen */

export function PhotoAddButton({ projectId, nodeId, label = "Foto", className = "btn", camera = true }: { projectId: string; nodeId: string; label?: string; className?: string; camera?: boolean }) {
  const { data, save, notify } = useStore();
  const input = useRef<HTMLInputElement>(null);

  const add = async (files: FileList | null) => {
    if (!files?.length) return;
    const list = Array.from(files);
    for (const file of list) {
      const dataUrl = await downscale(file, 1024);
      const now = new Date();
      const takenAt = `${today()}T${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const caption = /^(image|img|photo|dsc|pxl)[_-]?\d*/i.test(file.name) ? "" : file.name.replace(/\.[^.]+$/, "");
      save("photos", { id: uid("f"), projectId, nodeId, dataUrl, caption, takenAt, authorId: data.currentUserId }, "Foto hinzugefügt");
    }
    notify(list.length > 1 ? `${list.length} Fotos gespeichert` : "Foto gespeichert");
    if (input.current) input.current.value = "";
  };

  return (
    <>
      <button
        type="button"
        className={className}
        title="Foto hinzufügen"
        onClick={(e) => {
          e.stopPropagation();
          input.current?.click();
        }}
      >
        <Camera size={15} /> {label}
      </button>
      {camera ? (
        <input ref={input} type="file" accept="image/*" capture="environment" hidden onChange={(e) => add(e.target.files)} />
      ) : (
        <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => add(e.target.files)} />
      )}
    </>
  );
}

/* ---------------------------------------------------------------- Lightbox */

export function PhotoLightbox({ photos, index, onClose }: { photos: Photo[]; index: number; onClose: () => void }) {
  const { data, save, remove } = useStore();
  const [i, setI] = useState(index);
  const photo = photos[i];

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setI((x) => Math.max(0, x - 1));
      if (e.key === "ArrowRight") setI((x) => Math.min(photos.length - 1, x + 1));
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [photos.length, onClose]);

  useEffect(() => {
    if (!photo) onClose();
  }, [photo, onClose]);
  if (!photo) return null;

  return (
    <Portal>
    <div className="lightbox-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <button type="button" className="lb-close" onClick={onClose} aria-label="Schließen">
        <X size={22} />
      </button>
      {i > 0 && (
        <button type="button" className="lb-nav lb-prev" onClick={() => setI(i - 1)} aria-label="Vorheriges Foto">
          <ChevronLeft size={28} />
        </button>
      )}
      <figure className="lb-figure">
        <img src={photo.dataUrl} alt={photo.caption} />
        <figcaption>
          <strong className="lb-name">{photoName(data.siteNodes, data.photos, photo)}</strong>
          <input
            className="lb-caption"
            value={photo.caption}
            placeholder="Beschreibung…"
            onChange={(e) => save("photos", { ...photo, caption: e.target.value })}
          />
          <small>
            {photo.nodeId ? pathLabel(data.siteNodes, photo.nodeId) : "Ohne Bereich"} · {fmt(photo.takenAt.slice(0, 10))} {photo.takenAt.slice(11, 16)} · {employeeName(data, photo.authorId)} · {i + 1}/{photos.length}
          </small>
          <span className="lb-actions">
            <a className="btn btn-sm" href={photo.dataUrl} download={`${photoName(data.siteNodes, data.photos, photo)}.jpg`}>
              <Download size={14} /> Laden
            </a>
            {canDelete(data) && (
            <button
              type="button"
              className="btn btn-sm btn-danger-ghost"
              onClick={() => {
                if (!window.confirm("Foto löschen?")) return;
                remove("photos", photo.id, "Foto gelöscht");
                if (i >= photos.length - 1) setI(Math.max(0, i - 1));
              }}
            >
              <Trash2 size={14} /> Löschen
            </button>
            )}
          </span>
        </figcaption>
      </figure>
      {i < photos.length - 1 && (
        <button type="button" className="lb-nav lb-next" onClick={() => setI(i + 1)} aria-label="Nächstes Foto">
          <ChevronRight size={28} />
        </button>
      )}
    </div>
    </Portal>
  );
}

export function Thumbs({ photos }: { photos: Photo[] }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <>
      <div className="thumbs">
        {photos.map((p, i) => (
          <button key={p.id} type="button" className="thumb" onClick={() => setOpen(i)} title={p.caption}>
            <img src={p.dataUrl} alt={p.caption} loading="lazy" />
          </button>
        ))}
      </div>
      {open !== null && <PhotoLightbox photos={photos} index={open} onClose={() => setOpen(null)} />}
    </>
  );
}

/* ---------------------------------------------------------------- Fotogalerie */

/** Gallery by area: pick an area in the tree, select photos, export as ZIP or PDF. */
export function PhotoGallery({ project }: { project: Project }) {
  const { data, notify } = useStore();
  const nodes = data.siteNodes.filter((n) => n.projectId === project.id);
  const all = data.photos.filter((p) => p.projectId === project.id);
  const [area, setArea] = useState<string>("all");
  const [selecting, setSelecting] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const ids = area === "all" ? null : area === "none" ? new Set<string>() : new Set(subtreeIds(nodes, area));
  const photos = all
    .filter((p) => (area === "all" ? true : area === "none" ? !p.nodeId || !nodes.some((n) => n.id === p.nodeId) : ids!.has(p.nodeId)))
    .sort((a, b) => photoName(data.siteNodes, data.photos, a).localeCompare(photoName(data.siteNodes, data.photos, b), "de", { numeric: true }));
  const countFor = (id: string) => {
    const sub = new Set(subtreeIds(nodes, id));
    return all.filter((p) => sub.has(p.nodeId)).length;
  };
  const chosen = photos.filter((p) => !selecting || picked.has(p.id));
  const areaName = area === "all" ? "Alle Fotos" : area === "none" ? "Ohne Bereich" : nodes.find((n) => n.id === area)?.title ?? "";

  const toggle = (id: string) =>
    setPicked((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const exportZip = async () => {
    if (!chosen.length) return;
    setBusy(true);
    try {
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      for (const p of chosen) {
        // folders follow the structure: Bereich/Unterpunkt/…/Bereich - Unterpunkt - 001.jpg
        const folders = p.nodeId ? pathOf(data.siteNodes, p.nodeId).map((n) => safeName(n.title)) : ["Ohne Bereich"];
        const ext = p.dataUrl.startsWith("data:image/svg") ? "svg" : p.dataUrl.startsWith("data:image/png") || p.dataUrl.endsWith(".png") ? "png" : "jpg";
        zip.file(`${folders.join("/")}/${safeName(photoName(data.siteNodes, data.photos, p))}.${ext}`, await fileBytes(p.dataUrl));
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${project.code} Fotos ${safeName(areaName)}.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
      notify(`${chosen.length} Fotos exportiert`);
    } finally {
      setBusy(false);
    }
  };

  const exportPdf = () => {
    if (!chosen.length) return;
    window.open(`/fotobericht/${project.id}?ids=${chosen.map((p) => p.id).join(",")}&titel=${encodeURIComponent(areaName)}`, "_blank");
  };

  const walk = (parentId: string, depth: number): React.ReactNode =>
    childrenOf(nodes, parentId).map((n) => {
      const c = countFor(n.id);
      return (
        <li key={n.id}>
          <button type="button" className={area === n.id ? "on" : ""} style={{ paddingLeft: 10 + depth * 14 }} onClick={() => setArea(n.id)}>
            <span>{n.title}</span>
            {c > 0 && <em>{c}</em>}
          </button>
          {nodes.some((k) => k.parentId === n.id) && <ul>{walk(n.id, depth + 1)}</ul>}
        </li>
      );
    });

  return (
    <div className="gallery">
      <aside className="card gallery-tree">
        <ul>
          <li>
            <button type="button" className={area === "all" ? "on" : ""} onClick={() => setArea("all")}>
              <span>Alle Fotos</span>
              <em>{all.length}</em>
            </button>
          </li>
          {walk("", 0)}
          <li>
            <button type="button" className={area === "none" ? "on" : ""} onClick={() => setArea("none")}>
              <span>Ohne Bereich</span>
            </button>
          </li>
        </ul>
      </aside>

      <section className="gallery-main">
        <div className="toolbar">
          <h2 className="gallery-title">
            {areaName} <span className="muted">· {photos.length}</span>
          </h2>
          <span className="spacer" />
          {selecting ? (
            <>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setPicked(new Set(photos.map((p) => p.id)))}>
                Alle
              </button>
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => setPicked(new Set())}>
                Keine
              </button>
              <span className="muted small">{picked.size} ausgewählt</span>
            </>
          ) : null}
          <button type="button" className={`btn btn-sm ${selecting ? "active-toggle" : ""}`} onClick={() => setSelecting((v) => !v)}>
            {selecting ? "Fertig" : "Auswählen"}
          </button>
          <button type="button" className="btn btn-sm" disabled={!chosen.length || busy} onClick={exportZip}>
            <Download size={14} /> ZIP
          </button>
          <button type="button" className="btn btn-sm" disabled={!chosen.length} onClick={exportPdf}>
            <Download size={14} /> PDF
          </button>
          <PhotoAddButton projectId={project.id} nodeId={area === "all" || area === "none" ? "" : area} className="btn btn-sm" label="Hochladen" camera={false} />
          <PhotoAddButton projectId={project.id} nodeId={area === "all" || area === "none" ? "" : area} className="btn btn-sm btn-primary" label="Kamera" />
        </div>
        {photos.length === 0 ? (
          <Empty>
            <ImagePlus size={18} /> Keine Fotos in „{areaName}“.
          </Empty>
        ) : (
          <div className="gallery-grid">
            {photos.map((p, i) => (
              <button
                key={p.id}
                type="button"
                className={`g-item ${selecting ? "selecting" : ""} ${picked.has(p.id) ? "picked" : ""}`}
                onClick={() => (selecting ? toggle(p.id) : setOpen(i))}
                title={p.nodeId ? pathLabel(data.siteNodes, p.nodeId) : p.caption}
              >
                <img src={p.dataUrl} alt={p.caption} loading="lazy" />
                {selecting && <i className="g-check">{picked.has(p.id) ? "✓" : ""}</i>}
                <span className="g-cap">
                  <strong>{photoName(data.siteNodes, data.photos, p)}</strong>
                  <small>
                    {fmtShort(p.takenAt.slice(0, 10))} {p.takenAt.slice(11, 16)}
                    {p.caption ? ` · ${p.caption}` : ""}
                  </small>
                </span>
              </button>
            ))}
          </div>
        )}
      </section>
      {open !== null && <PhotoLightbox photos={photos} index={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
