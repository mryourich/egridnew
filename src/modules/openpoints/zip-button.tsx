"use client";

import { FolderDown } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui";
import { saveZip } from "@/lib/photo-export";
import { useStore } from "@/lib/store/store";

type Result = { out: { path: string; data: Blob | Uint8Array }[]; photos: number; missing: number };

/** Builds a ZIP of photos (folders like the structure) and downloads it. */
export function ZipButton({ run, name, label = "Fotodoku (ZIP)", needsPhotos = true }: { run: () => Promise<Result>; name: string; label?: string; needsPhotos?: boolean }) {
  const { notify } = useStore();
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try {
      const r = await run();
      if (!r.photos && needsPhotos) return notify("Hier sind noch keine Fotos vorhanden.");
      await saveZip(r.out, name);
      notify(`${r.photos} ${r.photos === 1 ? "Foto" : "Fotos"} als ZIP gespeichert${r.missing ? ` · ${r.missing} Dateien fehlen auf diesem Gerät` : ""}`);
    } catch {
      notify("ZIP konnte nicht erstellt werden.", { tone: "error" });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Button type="button" variant="secondary" size="sm" leftIcon={<FolderDown size={14} />} disabled={busy} onClick={() => void go()} title="Fotos mit Ordnerstruktur und Liste (CSV) herunterladen">
      {busy ? "Erstellt …" : label}
    </Button>
  );
}
