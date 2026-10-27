import { now, uid } from "./store";
import type { Attachment } from "./types";

const MAX_FILE = 8 * 1024 * 1024;

/** Reads a picked file; photos are scaled down so the device storage lasts. */
export async function readAttachment(file: File, by: string): Promise<Attachment> {
  if (file.size > MAX_FILE) throw new Error(`„${file.name}“ ist größer als 8 MB.`);
  const photo = file.type.startsWith("image/") && !file.type.includes("svg");
  const url = photo ? await shrink(file) : await asDataUrl(file);
  return { id: uid(), name: file.name, kind: photo ? "photo" : "file", mime: photo ? "image/jpeg" : file.type || "application/octet-stream", size: Math.round((url.length * 3) / 4), url, addedBy: by, addedAt: now() };
}

function asDataUrl(file: Blob) {
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

async function shrink(file: File, max = 1600) {
  const src = await asDataUrl(file);
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = src;
  });
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * scale);
  c.height = Math.round(img.height * scale);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.82);
}

/** Saves a stored file under its name. */
export function download(a: Pick<Attachment, "url" | "name">) {
  const link = document.createElement("a");
  link.href = a.url;
  link.download = a.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

/** Bytes of a stored file: data URL inline, anything else (e.g. demo pictures) is fetched. */
export async function fileBytes(url: string): Promise<Uint8Array | string> {
  if (url.startsWith("data:")) {
    const [meta, body] = url.split(",", 2);
    if (!meta.includes(";base64")) return decodeURIComponent(body);
    const bin = atob(body);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }
  return new Uint8Array(await (await fetch(url)).arrayBuffer());
}

/** File and folder names that work on Windows and macOS. */
export function safeName(name: string, fallback = "Datei") {
  return name.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim().slice(0, 120) || fallback;
}

/** Offers a blob as a download. */
export function downloadBlob(blob: Blob, filename: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.style.display = "none";
  // attached to the page so every browser keeps the file name
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
}

/** Extension of a stored picture. */
export const extOf = (url: string, mime = "") => (mime.includes("png") || url.startsWith("data:image/png") || url.endsWith(".png") ? "png" : "jpg");
