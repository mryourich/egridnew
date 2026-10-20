"use client";

import { ChevronRight, Download, Eye, FileArchive, ExternalLink, X, File, FileImage, FileSpreadsheet, FileText, Folder, FolderOpen, FolderPlus, Pencil, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { fmt, today } from "@/lib/date";
import { canDelete, employeeName, isManager, uid, useStore } from "@/lib/store";
import { dataUrlToBytes, downloadBlob, safeName } from "@/lib/files";
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
  const [preview, setPreview] = useState<DocFile | null>(null);
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

  /** ZIP with the folder structure: the given folder (and below) or everything. */
  const [zipping, setZipping] = useState(false);
  const exportZip = async (rootId: string) => {
    const pathOf = (id: string) => {
      const parts: string[] = [];
      for (let f = folders.find((x) => x.id === id); f; f = folders.find((x) => x.id === f!.parentId)) parts.unshift(safeName(f.name, "Ordner"));
      return parts;
    };
    const below = (id: string): string[] => [id, ...kids(id).flatMap((k) => below(k.id))];
    const ids = new Set(rootId ? below(rootId) : folders.map((f) => f.id));
    const list = data.files.filter((f) => f.projectId === projectId && ids.has(f.folderId));
    if (!list.length) return notify("Keine Dateien zum Exportieren");
    setZipping(true);
    try {
      const { default: JSZip } = await import("jszip");
      const zip = new JSZip();
      const cut = rootId ? pathOf(rootId).length - 1 : 0;
      // empty folders are kept, so the structure matches the app
      for (const id of ids) zip.folder(pathOf(id).slice(cut).join("/"));
      for (const f of list) zip.file([...pathOf(f.folderId).slice(cut), safeName(f.name)].join("/"), dataUrlToBytes(f.dataUrl));
      const project = data.projects.find((p) => p.id === projectId);
      const base = project ? `${project.code} ${project.name}` : data.company.name;
      downloadBlob(await zip.generateAsync({ type: "blob" }), `${safeName(base)} Dokumente${rootId ? ` – ${safeName(folders.find((f) => f.id === rootId)?.name ?? "")}` : ""}.zip`);
      notify(`${list.length} Dateien exportiert`);
    } finally {
      setZipping(false);
    }
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
            <button type="button" className="btn" disabled={!current || zipping} onClick={() => exportZip(current)} title="Diesen Ordner mit Unterordnern als ZIP">
              <FileArchive size={15} /> Ordner exportieren
            </button>
            <button type="button" className="btn" disabled={zipping} onClick={() => exportZip("")} title="Alle Ordner und Dateien als ZIP">
              <Download size={15} /> Alles exportieren
            </button>
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
                  <button type="button" className="file-name" onClick={() => setPreview(f)} title="Vorschau">
                    <strong>{f.name}</strong>
                    <small>
                      {size(f.size)} · {fmt(f.addedAt)} · {employeeName(data, f.addedBy)}
                      {q ? ` · ${folders.find((x) => x.id === f.folderId)?.name ?? ""}` : ""}
                    </small>
                  </button>
                  <button type="button" className="icon-btn" onClick={() => setPreview(f)} title="Vorschau">
                    <Eye size={15} />
                  </button>
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
        {preview && <FilePreview file={preview} onClose={() => setPreview(null)} />}
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

/** Data URLs can't be opened as a page in modern browsers – show them via a blob URL instead. */
function useBlobUrl(dataUrl: string) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    let made = "";
    fetch(dataUrl)
      .then((r) => r.blob())
      .then((b) => setUrl((made = URL.createObjectURL(b))))
      .catch(() => setUrl(dataUrl));
    return () => {
      if (made) URL.revokeObjectURL(made);
    };
  }, [dataUrl]);
  return url;
}

/** Preview of a document right in the app: PDF, pictures and text; everything else offers the download. */
function FilePreview({ file, onClose }: { file: DocFile; onClose: () => void }) {
  const url = useBlobUrl(file.dataUrl);
  const [text, setText] = useState<string | null>(null);
  const kind = file.type.includes("pdf") || /\.pdf$/i.test(file.name) ? "pdf" : file.type.startsWith("image/") ? "image" : file.type.startsWith("text/") || /\.(txt|csv|md)$/i.test(file.name) ? "text" : "other";
  useEffect(() => {
    if (kind === "text" && url) fetch(url).then((r) => r.text()).then(setText).catch(() => setText(""));
  }, [kind, url]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);
  return (
    <Portal>
      <div className="preview-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
        <div className="preview" role="dialog" aria-label={`Vorschau ${file.name}`}>
          <header>
            <span className="file-icon">{icon(file)}</span>
            <strong title={file.name}>{file.name}</strong>
            <span className="spacer" />
            {url && (
              <a className="btn btn-sm" href={url} target="_blank" rel="noreferrer">
                <ExternalLink size={14} /> <span className="desktop-only">Neuer Tab</span>
              </a>
            )}
            <a className="btn btn-sm" href={file.dataUrl} download={file.name}>
              <Download size={14} /> <span className="desktop-only">Herunterladen</span>
            </a>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Schließen">
              <X size={18} />
            </button>
          </header>
          <div className={`preview-body pv-${kind}`}>
            {!url ? (
              <p className="muted">Lädt …</p>
            ) : kind === "pdf" ? (
              <iframe src={url} title={file.name} />
            ) : kind === "image" ? (
              <img src={url} alt={file.name} />
            ) : kind === "text" ? (
              <pre>{text ?? "…"}</pre>
            ) : (
              <div className="preview-none">
                {icon(file)}
                <p>Für diesen Dateityp gibt es keine Vorschau.</p>
                <a className="btn btn-primary" href={file.dataUrl} download={file.name}>
                  <Download size={15} /> Herunterladen
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
}
