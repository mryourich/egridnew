"use client";

import { Camera, Download, FileText, Paperclip, Trash2, X } from "lucide-react";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { download, readAttachment } from "@/core/files";
import { fmtSize, fmtWhen } from "@/core/format";
import { personName, useStore } from "@/core/store";
import type { Attachment } from "@/core/types";
import { Button, IconButton } from "@/core/ui";

/** Photos and files of a point, defect or document; on phones "Foto" opens the camera. */
export function Attachments({ value, onChange, editable }: { value: Attachment[]; onChange: (next: Attachment[]) => void; editable: boolean }) {
  const { data, notify } = useStore();
  const photo = useRef<HTMLInputElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<Attachment | null>(null);
  const [busy, setBusy] = useState(false);

  const add = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    const next = [...value];
    for (const f of Array.from(files)) {
      try {
        next.push(await readAttachment(f, data.meId));
      } catch (e) {
        notify(e instanceof Error ? e.message : "Datei konnte nicht gelesen werden.");
      }
    }
    setBusy(false);
    onChange(next);
  };

  return (
    <div className="att">
      {value.length > 0 && (
        <ul className="att-list">
          {value.map((a) => (
            <li key={a.id}>
              <button type="button" className="att-thumb" onClick={() => (a.kind === "photo" ? setView(a) : download(a))} title={a.name}>
                {a.kind === "photo" ? <img src={a.url} alt={a.name} /> : <FileText size={22} />}
              </button>
              <span className="att-meta">
                <strong title={a.name}>{a.name}</strong>
                <small>
                  {personName(data, a.addedBy)} · {fmtWhen(a.addedAt)} · {fmtSize(a.size)}
                </small>
              </span>
              <IconButton label="Herunterladen" onClick={() => download(a)}>
                <Download size={15} />
              </IconButton>
              {editable && (
                <IconButton label="Entfernen" onClick={() => onChange(value.filter((x) => x.id !== a.id))}>
                  <Trash2 size={15} />
                </IconButton>
              )}
            </li>
          ))}
        </ul>
      )}
      {editable && (
        <div className="att-add">
          <Button size="sm" icon={<Camera size={14} />} onClick={() => photo.current?.click()} disabled={busy}>
            Foto
          </Button>
          <Button size="sm" icon={<Paperclip size={14} />} onClick={() => file.current?.click()} disabled={busy}>
            Datei
          </Button>
          {busy && <small className="muted">wird gelesen …</small>}
          <input ref={photo} type="file" accept="image/*" capture="environment" multiple hidden onChange={(e) => (add(e.target.files), (e.target.value = ""))} />
          <input ref={file} type="file" multiple hidden onChange={(e) => (add(e.target.files), (e.target.value = ""))} />
        </div>
      )}
      {!editable && value.length === 0 && <small className="muted">Keine Anhänge.</small>}
      {view && <Lightbox a={view} onClose={() => setView(null)} />}
    </div>
  );
}

export function Lightbox({ a, onClose }: { a: Attachment; onClose: () => void }) {
  return createPortal(
    <div className="lightbox" onClick={onClose} role="dialog" aria-label={a.name}>
      <img src={a.url} alt={a.name} onClick={(e) => e.stopPropagation()} />
      <div className="lightbox-bar" onClick={(e) => e.stopPropagation()}>
        <span>{a.name}</span>
        <Button size="sm" icon={<Download size={14} />} onClick={() => download(a)}>
          Herunterladen
        </Button>
        <IconButton label="Schließen" onClick={onClose}>
          <X size={18} />
        </IconButton>
      </div>
    </div>,
    document.body
  );
}

export const photosOf = (list: Attachment[]) => list.filter((a) => a.kind === "photo").length;
