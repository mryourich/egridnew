/** Bytes of a data URL (base64 or URL-encoded). */
export function dataUrlToBytes(url: string): Uint8Array | string {
  const [meta, body] = url.split(",", 2);
  if (meta.includes(";base64")) {
    const bin = atob(body);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }
  return decodeURIComponent(body);
}

/** File and folder names that work on Windows and macOS. */
export function safeName(name: string, fallback = "Datei") {
  return name.replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim().slice(0, 120) || fallback;
}

/** Offers a blob as a download. */
export function downloadBlob(blob: Blob, filename: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = asciiName(filename);
  a.style.display = "none";
  // attached to the page so every browser keeps the file name
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
}

/** Download names without umlauts and dashes – some browsers otherwise fall back to "download". */
function asciiName(name: string) {
  const map: Record<string, string> = { ä: "ae", ö: "oe", ü: "ue", Ä: "Ae", Ö: "Oe", Ü: "Ue", ß: "ss", "–": "-", "—": "-", "›": "-" };
  return name
    .replace(/[äöüÄÖÜß–—›]/g, (c) => map[c])
    .normalize("NFKD")
    .replace(/[^\x20-\x7e]/g, "");
}
