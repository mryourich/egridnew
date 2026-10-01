/** Turns an uploaded plan (PDF or picture) into page images the app can show and pin defects on. */
export async function planPages(file: File, maxPages = 12): Promise<{ name: string; dataUrl: string; width: number; height: number }[]> {
  const base = file.name.replace(/\.[^.]+$/, "");
  if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) {
    // legacy build: brings polyfills for browsers on phones that lack the newest JavaScript
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
    const out: { name: string; dataUrl: string; width: number; height: number }[] = [];
    for (let n = 1; n <= Math.min(doc.numPages, maxPages); n++) {
      const page = await doc.getPage(n);
      const first = page.getViewport({ scale: 1 });
      // long side ~2200 px: sharp enough to read, small enough to keep
      const scale = Math.min(4, 2200 / Math.max(first.width, first.height));
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvas, canvasContext: ctx, viewport }).promise;
      out.push({ name: doc.numPages > 1 ? `${base} – Seite ${n}` : base, dataUrl: canvas.toDataURL("image/jpeg", 0.78), width: canvas.width, height: canvas.height });
    }
    await doc.cleanup();
    return out;
  }
  const url = await new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = rej;
    r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = url;
  });
  const scale = Math.min(1, 2400 / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return [{ name: base, dataUrl: canvas.toDataURL("image/jpeg", 0.8), width: canvas.width, height: canvas.height }];
}
