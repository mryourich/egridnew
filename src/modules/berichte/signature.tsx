"use client";

import { Eraser } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Field, Modal } from "@/components/app/kit";
import { Button, Input } from "@/components/ui";
import { now } from "@/lib/store/id";
import type { Signature } from "@/lib/store/types";

/** Finger or pen on the tablet: draws on a canvas, returns a PNG. */
function Pad({ onChange }: { onChange: (png: string) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawn = useRef(false);
  useEffect(() => {
    const c = ref.current!;
    const fit = () => {
      const r = c.getBoundingClientRect();
      c.width = r.width * 2;
      c.height = r.height * 2;
      const g = c.getContext("2d")!;
      g.scale(2, 2);
      g.lineWidth = 2.2;
      g.lineCap = "round";
      g.lineJoin = "round";
      g.strokeStyle = "#111";
      drawn.current = false;
      onChange("");
    };
    fit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const pos = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top] as const;
  };
  const down = (e: React.PointerEvent) => {
    e.preventDefault();
    ref.current!.setPointerCapture(e.pointerId);
    const g = ref.current!.getContext("2d")!;
    const [x, y] = pos(e);
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + 0.1, y + 0.1);
    g.stroke();
  };
  const move = (e: React.PointerEvent) => {
    if (!e.buttons) return;
    const g = ref.current!.getContext("2d")!;
    const [x, y] = pos(e);
    g.lineTo(x, y);
    g.stroke();
    drawn.current = true;
  };
  const up = () => drawn.current && onChange(ref.current!.toDataURL("image/png"));
  const clear = () => {
    const c = ref.current!;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    drawn.current = false;
    onChange("");
  };
  return (
    <div className="sig-pad">
      <canvas ref={ref} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} aria-label="Unterschriftsfeld" />
      <span className="sig-line" aria-hidden />
      <Button type="button" size="sm" variant="ghost" leftIcon={<Eraser size={14} />} onClick={clear}>
        Löschen
      </Button>
    </div>
  );
}

/** Asks for a signature: drawn on the device, name in plain text, place. */
export function SignatureDialog({ title, description, who, defaultName = "", defaultPlace = "", children, confirm = "Unterschreiben", onSign, onClose }: { title: string; description?: ReactNode; who: string; defaultName?: string; defaultPlace?: string; children?: ReactNode; confirm?: string; onSign: (s: Signature) => void; onClose: () => void }) {
  const [png, setPng] = useState("");
  const [name, setName] = useState(defaultName);
  const [place, setPlace] = useState(defaultPlace);
  const [tried, setTried] = useState(false);
  const err = !png ? "Bitte unterschreiben" : !name.trim() ? "Bitte den Namen in Blockbuchstaben eingeben" : "";
  return (
    <Modal
      size="wide"
      title={title}
      description={description}
      onClose={onClose}
      onSubmit={() => (setTried(true), !err && onSign({ png, name: name.trim(), place: place.trim(), at: now() }))}
      footer={
        <>
          <span className="grow" />
          <Button type="button" variant="secondary" onClick={onClose}>
            Abbrechen
          </Button>
          <Button type="submit">{confirm}</Button>
        </>
      }
    >
      {children}
      <div className="field">
        <span>Unterschrift {who}</span>
        <Pad onChange={setPng} />
      </div>
      <div className="form-grid" style={{ marginTop: 12 }}>
        <Field label="Name in Blockbuchstaben" error={tried && !name.trim() ? err : ""}>
          <Input value={name} onChange={(e) => setName(e.target.value.toUpperCase())} autoComplete="off" />
        </Field>
        <Field label="Ort">
          <Input value={place} onChange={(e) => setPlace(e.target.value)} />
        </Field>
      </div>
      {tried && !png && <p className="field-error">Bitte im Feld oben unterschreiben.</p>}
    </Modal>
  );
}
