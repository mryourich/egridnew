"use client";

import { Camera, Download, FileText, ImagePlus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { downscale } from "@/components/ui";
import { exifInfo } from "@/lib/exif";
import { today } from "@/lib/date";
import { employeeName, fmtStamp, uid, useStore } from "@/lib/store";
import type { Photo } from "@/lib/types";
import { canRemove, me } from "./access";
import { Empty, Sheet } from "./kit";

export function nowLocal() {
  const n = new Date();
  return `${today()}T${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}`;
}

/** Camera or upload – newest first. */
export function Photos({ projectId }: { projectId: string }) {
  const { data, save, notify } = useStore();
  const camera = useRef<HTMLInputElement>(null);
  const upload = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<Photo | null>(null);
  const [busy, setBusy] = useState(false);
  const photos = data.photos.filter((p) => p.projectId === projectId).sort((a, b) => b.takenAt.localeCompare(a.takenAt));

  const add = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    for (const file of Array.from(files)) {
      const [dataUrl, exif] = await Promise.all([downscale(file, 1280), exifInfo(file)]);
      save("photos", { id: uid("f"), projectId, nodeId: "", dataUrl, caption: "", takenAt: exif.takenAt ?? nowLocal(), authorId: data.currentUserId }, "Foto hinzugefügt");
    }
    setBusy(false);
    notify(files.length > 1 ? `${files.length} Fotos gespeichert` : "Foto gespeichert");
  };

  return (
    <div className="v-tab">
      <div className="v-actions">
        <button type="button" className="v-btn primary big" onClick={() => camera.current?.click()} disabled={busy}>
          <Camera size={19} /> Foto aufnehmen
        </button>
        <button type="button" className="v-btn big" onClick={() => upload.current?.click()} disabled={busy}>
          <ImagePlus size={19} /> Hochladen
        </button>
        <span className="v-grow" />
        {photos.length > 0 && (
          <a className="v-link" href={`/fotobericht/${projectId}`} target="_blank" rel="noreferrer">
            <FileText size={16} /> Fotobericht (PDF)
          </a>
        )}
        <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={(e) => (add(e.target.files), (e.target.value = ""))} />
        <input ref={upload} type="file" accept="image/*" multiple hidden onChange={(e) => (add(e.target.files), (e.target.value = ""))} />
      </div>
      {photos.length === 0 ? (
        <Empty>Noch keine Fotos.</Empty>
      ) : (
        <div className="v-grid">
          {photos.map((p) => (
            <button key={p.id} type="button" className="v-thumb" onClick={() => setView(p)}>
              <img src={p.dataUrl} alt={p.caption || "Foto"} loading="lazy" />
              <span>{fmtStamp(p.takenAt).slice(0, 6)}</span>
            </button>
          ))}
        </div>
      )}
      {view && <PhotoView photo={view} onClose={() => setView(null)} />}
    </div>
  );
}

function PhotoView({ photo, onClose }: { photo: Photo; onClose: () => void }) {
  const { data, remove } = useStore();
  const mayDelete = canRemove(data) || photo.authorId === me(data)?.id;
  return (
    <Sheet
      title={`${fmtStamp(photo.takenAt)} · ${employeeName(data, photo.authorId)}`}
      onClose={onClose}
      wide
      footer={
        <>
          {mayDelete && (
            <button
              type="button"
              className="v-btn ghost danger"
              onClick={() => {
                remove("photos", photo.id, "Foto gelöscht");
                onClose();
              }}
            >
              <Trash2 size={16} /> Löschen
            </button>
          )}
          <span className="v-grow" />
          <a className="v-btn" href={photo.dataUrl} download={`Foto ${photo.takenAt.replace(":", "-")}.jpg`}>
            <Download size={16} /> Speichern
          </a>
        </>
      }
    >
      <img className="v-photo-big" src={photo.dataUrl} alt={photo.caption || "Foto"} />
      {photo.caption && <p>{photo.caption}</p>}
    </Sheet>
  );
}
