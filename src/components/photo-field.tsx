"use client";

import { Camera, ImagePlus, X } from "lucide-react";
import { useRef } from "react";
import { downscale } from "./ui";

/** Photos of a report: camera on the phone, upload on the PC; they are printed in the PDF. */
export function PhotoField({ photos, onChange, hint = "Die Fotos erscheinen im PDF." }: { photos: string[]; onChange: (photos: string[]) => void; hint?: string }) {
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);
  const add = async (files: FileList | null) => {
    if (!files?.length) return;
    const shots: string[] = [];
    for (const f of Array.from(files)) shots.push(await downscale(f, 1280));
    onChange([...photos, ...shots]);
  };
  return (
    <section className="detail-section photo-field">
      <header>
        <h3>
          Fotos <span className="tab-count">{photos.length}</span>
        </h3>
        <span className="row-inline">
          <button type="button" className="btn btn-sm" onClick={() => gallery.current?.click()}>
            <ImagePlus size={14} /> Bilder hinzufügen
          </button>
          <button type="button" className="btn btn-sm btn-primary" onClick={() => camera.current?.click()}>
            <Camera size={14} /> Kamera
          </button>
        </span>
        <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={(e) => (add(e.target.files), (e.target.value = ""))} />
        <input ref={gallery} type="file" accept="image/*" multiple hidden onChange={(e) => (add(e.target.files), (e.target.value = ""))} />
      </header>
      {photos.length ? (
        <div className="rd-photos">
          {photos.map((src, i) => (
            <figure key={i}>
              <img src={src} alt="" />
              <button type="button" className="icon-btn" aria-label="Foto entfernen" onClick={() => onChange(photos.filter((_, k) => k !== i))}>
                <X size={13} />
              </button>
            </figure>
          ))}
          <button type="button" className="rd-add" onClick={() => gallery.current?.click()} aria-label="Weitere Bilder">
            <ImagePlus size={18} />
          </button>
        </div>
      ) : (
        <button type="button" className="photo-drop" onClick={() => gallery.current?.click()}>
          <ImagePlus size={20} />
          <span>Bilder hinzufügen</span>
          <small>{hint}</small>
        </button>
      )}
    </section>
  );
}
