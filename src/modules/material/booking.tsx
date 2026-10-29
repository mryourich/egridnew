"use client";

import { Minus, PackageMinus, PackagePlus, Plus, ScanLine } from "lucide-react";
import { useRef, useState } from "react";
import { Modal } from "@/components/app/kit";
import { Button, IconButton, Input } from "@/components/ui";
import { fmtNum, parseNum } from "@/lib/format";
import { siteName, useStore } from "@/lib/store/store";
import type { MaterialItem } from "@/lib/store/types";
import { cn } from "@/lib/utils";
import { book, isLow } from "./stock";

/**
 * After a scan: how many were taken (or delivered)? Booking updates the stock and the log right away,
 * "Buchen & weiter scannen" goes straight back to the camera.
 */
export function BookDialog({ item, onClose, onNext }: { item: MaterialItem; onClose: () => void; onNext: () => void }) {
  const { data, save, notify } = useStore();
  const m = data.materials.find((x) => x.id === item.id) ?? item;
  const [qty, setQty] = useState("1");
  // hand scanners send Enter after the code – that key must not book right away
  const opened = useRef(Date.now());
  const [kind, setKind] = useState<"entnahme" | "zugang">("entnahme");
  const n = parseNum(qty);
  const valid = Number.isFinite(n) && n > 0;
  const after = valid ? Math.max(0, kind === "entnahme" ? m.qty - n : m.qty + n) : m.qty;
  const step = (d: number) => setQty(String(Math.max(1, Math.round(((valid ? n : 0) + d) * 100) / 100)).replace(".", ","));
  const submit = (next: boolean) => {
    if (!valid || Date.now() - opened.current < 600) return;
    const out = book(m, kind, n, data.meId);
    save("materials", out);
    const low = isLow(out) && !out.ordered;
    notify(`${kind === "entnahme" ? "Entnahme" : "Zugang"} ${fmtNum(n)} ${m.unit} ${m.name} · Bestand ${fmtNum(out.qty)} ${m.unit}${low ? " · unter Mindestbestand!" : ""}`, low ? { tone: "error" } : undefined);
    if (next) onNext();
    else onClose();
  };
  return (
    <Modal
      title={m.name}
      description={`${siteName(data, m.siteId)} · ${m.barcode}`}
      onClose={onClose}
      onSubmit={() => submit(true)}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>
            Abbrechen
          </Button>
          <span className="grow" />
          <Button type="button" variant="secondary" disabled={!valid} onClick={() => submit(false)}>
            Buchen
          </Button>
          <Button type="submit" disabled={!valid} leftIcon={<ScanLine size={15} />}>
            Buchen & weiter scannen
          </Button>
        </>
      }
    >
      <div className="book">
        <div className="seg book-kind" role="radiogroup" aria-label="Buchung">
          <button type="button" role="radio" aria-checked={kind === "entnahme"} className={cn(kind === "entnahme" && "on")} onClick={() => setKind("entnahme")}>
            <PackageMinus size={16} /> Entnahme
          </button>
          <button type="button" role="radio" aria-checked={kind === "zugang"} className={cn(kind === "zugang" && "on")} onClick={() => setKind("zugang")}>
            <PackagePlus size={16} /> Zugang
          </button>
        </div>
        <div className="book-qty">
          <IconButton label="Weniger" size="lg" onClick={() => step(-1)}>
            <Minus size={18} />
          </IconButton>
          <Input value={qty} onChange={(e) => setQty(e.target.value)} inputMode="decimal" aria-label="Menge" autoFocus onFocus={(e) => e.currentTarget.select()} />
          <span className="unit">{m.unit}</span>
          <IconButton label="Mehr" size="lg" onClick={() => step(1)}>
            <Plus size={18} />
          </IconButton>
        </div>
        <p className="book-after">
          Bestand {fmtNum(m.qty)} → <strong className={cn(after < m.minQty && "signal-text")}>{fmtNum(after)} {m.unit}</strong>
          <small className="muted"> · Mindestbestand {fmtNum(m.minQty)}</small>
        </p>
        {kind === "entnahme" && valid && n > m.qty && <p className="signal-text">Mehr als der gebuchte Bestand – der Bestand wird auf 0 gesetzt.</p>}
      </div>
    </Modal>
  );
}
