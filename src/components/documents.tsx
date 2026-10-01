"use client";

import { ChevronRight, Download, File, FileImage, FileSpreadsheet, FileText, Folder, FolderOpen, FolderPlus, Pencil, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { fmt, today } from "@/lib/date";
import { canDelete, employeeName, isManager, uid, useStore } from "@/lib/store";
import type { DocFile, DocFolder } from "@/lib/types";
import { Empty, Portal, SearchInput } from "./ui";

const MAX = 4 * 1024 * 1024;

function size(n: number) {
  return n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
}

function icon(f: DocFile) {
  if (f.type.startsWith("image/")) return <FileImage size={18} />;
  if (f.type.includes("pdf") || f.type.includes("word") || f.type.startsWith("text")) return <FileText size={18} />;
  if (f.type.includes("sheet") || f.type.includes("excel") || f.name.match(/\.(xlsx?|csv)$/i)) return <FileSpreadsheet size={18} />;
  return <File size={18} />;
}

const read = (file: globalThis.File) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });

/** Folder tree + file list. projectId "" is the general company store (manuals, guidelines, measuring reports). */
export function DocBrowser({ projectId }: { projectId: string }) {
  const { data, save, remove, notify } = useStore();
  const manager = isManager(data);
  const folders = data.folders.filter((f) => f.projectId === projectId);
  const [current, setCurrent] = useState(folders[0]?.id ?? "");
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [menu, setMenu] = useState<{ x: number; y: number; folder: DocFolder } | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const folder = folders.find((f) => f.id === current);
  const kids = (id: string) => folders.filter((f) => f.parentId === id).sort((a, b) => a.name.localeCompare(b.name, "de"));
  const path: DocFolder[] = [];
  for (let f = folder; f; f = folders.find((x) => x.id === f!.parentId)) path.unshift(f);
  const q = query.toLowerCase();
  const files = data.files
    .filter((f) => f.projectId === projectId && (q ? f.name.toLowerCase().includes(q) : f.folderId === current))
    .sort((a, b) => a.name.localeCompare(b.name, "de", { numeric: true }));
  const countIn = (id: string): number => data.files.filter((f) => f.folderId === id).length + kids(id).reduce((s, k) => s + countIn(k.id), 0);

  const addFolder = (parentId: string) => {
    const name = window.prompt(parentId ? "Name des Unterordners" : "Name des Ordners");
    if (!name?.trim()) return;
    const f: DocFolder = { id: uid("df"), projectId, parentId, name: name.trim() };
    save("folders", f, `Ordner ${f.name} angelegt`);
    if (parentId) setOpen((o) => new Set(o).add(parentId));
    setCurrent(f.id);
  };

  const upload = async (list: FileList | null) => {
    if (!list?.length || !current) return;
    let added = 0;
    for (const file of Array.from(list)) {
      if (file.size > MAX) {
        notify(`${file.name} ist zu groß (max. 4 MB, bis der Cloud-Speicher kommt)`);
        continue;
      }
      save("files", { id: uid("d"), projectId, folderId: current, name: file.name, size: file.size, type: file.type || "application/octet-stream", dataUrl: await read(file), addedAt: today(), addedBy: data.currentUserId }, `Dokument ${file.name}`);
      added++;
    }
    if (added) notify(added > 1 ? `${added} Dateien abgelegt` : "Datei abgelegt");
    if (input.current) input.current.value = "";
  };

  const tree = (parentId: string, depth: number): React.ReactNode =>
    kids(parentId).map((f) => {
      const sub = kids(f.id);
      const isOpen = open.has(f.id) || path.some((p) => p.id === f.id);
      return (
        <li key={f.id}>
          <div
            className={`at-row ${current === f.id ? "on" : ""}`}
            style={{ paddingLeft: 6 + depth * 16 }}
            onClick={() => setCurrent(f.id)}
            onContextMenu={(e) => {
              if (!manager) return;
              e.preventDefault();
              setMenu({ x: e.clientX, y: e.clientY, folder: f });
            }}
          >
            <button
              type="button"
              className="at-toggle"
              style={{ visibility: sub.length ? "visible" : "hidden" }}
              onClick={(e) => {
                e.stopPropagation();
                setOpen((o) => {
                  const n = new Set(o);
                  if (n.has(f.id)) n.delete(f.id);
                  else n.add(f.id);
                  return n;
                });
              }}
              aria-label="Auf/zu"
            >
              <ChevronRight size={14} style={{ transform: isOpen ? "rotate(90deg)" : undefined }} />
            </button>
            {current === f.id ? <FolderOpen size={15} className="at-icon" /> : <Folder size={15} className="at-icon" />}
            <span className="at-title">
              {f.name}
              <small>{countIn(f.id)} Dateien</small>
            </span>
            {manager && (
              <button
                type="button"
                className="at-add"
                title="Unterordner"
                onClick={(e) => {
                  e.stopPropagation();
                  addFolder(f.id);
                }}
              >
                <FolderPlus size={14} />
              </button>
            )}
          </div>
          {isOpen && sub.length > 0 && <ul>{tree(f.id, depth + 1)}</ul>}
        </li>
      );
    });

  return (
    <div className="op docs">
      <aside className="op-areas card">
        <header>
          <span>Ordner</span>
          {manager && (
            <button type="button" className="btn btn-sm btn-ghost" onClick={() => addFolder("")}>
              <FolderPlus size={14} /> Ordner
            </button>
          )}
        </header>
        <ul className="area-tree">{tree("", 0)}</ul>
        {folders.length === 0 && <p className="muted small op-hint">Noch keine Ordner.</p>}
      </aside>

      <section className="op-main">
        <header className="op-head">
          <div>
            <span className="op-kicker">{projectId ? "Projektdokumente" : "Allgemeine Dokumente"}</span>
            <h2>{q ? `Suche „${query}“` : folder?.name ?? "Dokumente"}</h2>
            {!q && path.length > 1 && (
              <small className="muted">
                {path
                  .slice(0, -1)
                  .map((p) => p.name)
                  .join(" › ")}
              </small>
            )}
          </div>
          <span className="row-inline">
            <SearchInput value={query} onChange={setQuery} placeholder="Datei suchen…" />
            <button type="button" className="btn btn-primary" disabled={!current} onClick={() => input.current?.click()}>
              <Upload size={15} /> Hochladen
            </button>
            <input ref={input} type="file" multiple hidden onChange={(e) => upload(e.target.files)} />
          </span>
        </header>
        <div
          className="card card-flush doc-drop"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            upload(e.dataTransfer.files);
          }}
        >
          {files.length === 0 ? (
            <Empty>{q ? "Keine Datei gefunden." : current ? "Ordner ist leer – Dateien hierher ziehen oder „Hochladen“." : "Links einen Ordner wählen."}</Empty>
          ) : (
            <ul className="file-list">
              {files.map((f) => (
                <li key={f.id}>
                  <span className="file-icon">{icon(f)}</span>
                  <a href={f.dataUrl} target="_blank" rel="noreferrer" download={f.type.includes("pdf") || f.type.startsWith("image/") ? undefined : f.name} className="file-name">
                    <strong>{f.name}</strong>
                    <small>
                      {size(f.size)} · {fmt(f.addedAt)} · {employeeName(data, f.addedBy)}
                      {q ? ` · ${folders.find((x) => x.id === f.folderId)?.name ?? ""}` : ""}
                    </small>
                  </a>
                  <a className="icon-btn" href={f.dataUrl} download={f.name} title="Herunterladen">
                    <Download size={15} />
                  </a>
                  {canDelete(data) && (
                    <button type="button" className="icon-btn" title="Löschen" onClick={() => window.confirm(`${f.name} löschen?`) && remove("files", f.id, `Dokument ${f.name} gelöscht`)}>
                      <Trash2 size={15} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className="muted small">Dateien bis 4 MB. Größere Pläne folgen mit dem Cloud-Speicher.</p>
      </section>

      {menu && (
        <Portal>
          <div className="ctx-backdrop" onMouseDown={() => setMenu(null)} />
          <div className="ctx-menu" style={{ left: menu.x, top: menu.y }}>
            <button
              type="button"
              onClick={() => {
                const name = window.prompt("Neuer Name", menu.folder.name);
                if (name?.trim()) save("folders", { ...menu.folder, name: name.trim() });
                setMenu(null);
              }}
            >
              <Pencil size={14} /> Umbenennen
            </button>
            <button type="button" onClick={() => (addFolder(menu.folder.id), setMenu(null))}>
              <FolderPlus size={14} /> Unterordner
            </button>
            {canDelete(data) && (
              <button
                type="button"
                className="danger"
                onClick={() => {
                  const f = menu.folder;
                  setMenu(null);
                  if (countIn(f.id) || kids(f.id).length) return notify("Ordner ist nicht leer");
                  if (window.confirm(`Ordner ${f.name} löschen?`)) {
                    remove("folders", f.id, `Ordner ${f.name} gelöscht`);
                    if (current === f.id) setCurrent(folders.find((x) => x.id !== f.id)?.id ?? "");
                  }
                }}
              >
                <Trash2 size={14} /> Löschen
              </button>
            )}
          </div>
        </Portal>
      )}
    </div>
  );
}
