"use client";

import { Download, FileText, Trash2, Upload } from "lucide-react";
import { useRef } from "react";
import { fmt, today } from "@/lib/date";
import { uid, useStore } from "@/lib/store";
import { canRemove } from "./access";
import { Empty, fileSize, readFile } from "./kit";

const MAX = 8 * 1024 * 1024;

/** Plans, offers, data sheets – one list per site. */
export function Documents({ projectId }: { projectId: string }) {
  const { data, save, remove, notify } = useStore();
  const input = useRef<HTMLInputElement>(null);
  const files = data.files.filter((f) => f.projectId === projectId).sort((a, b) => b.addedAt.localeCompare(a.addedAt) || a.name.localeCompare(b.name, "de"));
  const folder = data.folders.find((f) => f.projectId === projectId)?.id ?? "";

  const add = async (list: FileList | null) => {
    if (!list?.length) return;
    let added = 0;
    for (const file of Array.from(list)) {
      if (file.size > MAX) {
        notify(`${file.name} ist zu groß (max. 8 MB)`);
        continue;
      }
      save("files", { id: uid("d"), projectId, folderId: folder, name: file.name, size: file.size, type: file.type, dataUrl: await readFile(file), addedAt: today(), addedBy: data.currentUserId }, `Dokument ${file.name} hochgeladen`);
      added++;
    }
    if (added) notify(added > 1 ? `${added} Dokumente gespeichert` : "Dokument gespeichert");
  };

  return (
    <div className="v-tab">
      <div className="v-actions">
        <button type="button" className="v-btn primary big" onClick={() => input.current?.click()}>
          <Upload size={19} /> Datei hochladen
        </button>
        <input ref={input} type="file" multiple hidden onChange={(e) => (add(e.target.files), (e.target.value = ""))} />
      </div>
      {files.length === 0 ? (
        <Empty>Noch keine Dokumente – z. B. Pläne, Angebote oder Datenblätter.</Empty>
      ) : (
        <ul className="v-card v-list">
          {files.map((f) => (
            <li key={f.id}>
              <span className="v-list-ic">
                <FileText size={18} />
              </span>
              <a className="v-list-main" href={f.dataUrl} target="_blank" rel="noreferrer">
                <strong>{f.name}</strong>
                <small>
                  {fileSize(f.size)} · {fmt(f.addedAt)}
                </small>
              </a>
              <a className="v-icon" href={f.dataUrl} download={f.name} aria-label="Herunterladen" title="Herunterladen">
                <Download size={18} />
              </a>
              {canRemove(data) && (
                <button type="button" className="v-icon" onClick={() => window.confirm(`„${f.name}“ löschen?`) && remove("files", f.id, `Dokument ${f.name} gelöscht`)} aria-label="Löschen">
                  <Trash2 size={17} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
