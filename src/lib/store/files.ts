"use client";

import { useEffect, useState } from "react";
import { now, uid } from "./id";
import type { FileRef } from "./types";

/* Photos and files live in IndexedDB (plenty of space); the records only keep a FileRef. */

const DB = "vysner-files";
const STORE = "files";
const MAX = 15 * 1024 * 1024;

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = run(t.objectStore(STORE));
    t.oncomplete = () => resolve(req ? req.result : undefined);
    t.onerror = () => reject(t.error);
  });
}

/** Photos are scaled down to 1600 px so the device storage lasts. */
async function shrink(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/") || file.type.includes("svg") || file.type.includes("gif")) return file;
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((resolve) => c.toBlob((b) => resolve(b ?? file), "image/jpeg", 0.82));
}

/** Stores a picked file and returns its reference. */
export async function storeFile(file: File, by: string): Promise<FileRef> {
  if (file.size > MAX) throw new Error(`„${file.name}“ ist größer als 15 MB.`);
  const blob = await shrink(file);
  const id = uid();
  await tx("readwrite", (s) => s.put(blob, id));
  return { id, name: file.name, mime: blob.type || file.type || "application/octet-stream", size: blob.size, addedBy: by, addedAt: now() };
}

/** Stores a generated file (PDF) under a given id. */
export async function storeBlob(id: string, blob: Blob) {
  await tx("readwrite", (s) => s.put(blob, id));
}

export async function readFile(id: string): Promise<Blob | undefined> {
  try {
    return (await tx<Blob>("readonly", (s) => s.get(id))) ?? undefined;
  } catch {
    return undefined;
  }
}

export async function dropFiles(ids: string[]) {
  try {
    await tx("readwrite", (s) => {
      for (const id of ids) s.delete(id);
    });
  } catch {
    // nothing to clean up
  }
}

/** Object URL of a stored file – revoked when the component goes away. */
export function useFileUrl(ref: Pick<FileRef, "id"> | undefined) {
  const [url, setUrl] = useState("");
  const id = ref?.id;
  useEffect(() => {
    if (!id) return;
    let alive = true;
    let made = "";
    void readFile(id).then((b) => {
      if (!alive || !b) return;
      made = URL.createObjectURL(b);
      setUrl(made);
    });
    return () => {
      alive = false;
      if (made) URL.revokeObjectURL(made);
    };
  }, [id]);
  return url;
}

/** Saves a stored file under its name. */
export async function downloadFile(ref: FileRef) {
  const b = await readFile(ref.id);
  if (!b) return false;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(b);
  a.download = ref.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
  return true;
}

export const isImage = (f: Pick<FileRef, "mime">) => f.mime.startsWith("image/");
