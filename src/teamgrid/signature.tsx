"use client";

import { Eraser } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/** Signature with the finger or the mouse; reports a PNG data URL ("" when empty). */
export function SignaturePad({ onChange }: { onChange: (v: string) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [has, setHas] = useState(false);
  const clear = () => {
    const c = canvas.current!;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
  };
  useEffect(clear, []);
  const pos = (e: React.PointerEvent) => {
    const c = canvas.current!;
    const r = c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * c.width, y: ((e.clientY - r.top) / r.height) * c.height };
  };
  return (
    <div className="sign-pad">
      <canvas
        ref={canvas}
        width={900}
        height={300}
        onPointerDown={(e) => {
          drawing.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          const ctx = canvas.current!.getContext("2d")!;
          const p = pos(e);
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return;
          const ctx = canvas.current!.getContext("2d")!;
          const p = pos(e);
          ctx.lineWidth = 4;
          ctx.lineCap = "round";
          ctx.strokeStyle = "#0b1530";
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        }}
        onPointerUp={() => {
          if (!drawing.current) return;
          drawing.current = false;
          setHas(true);
          onChange(canvas.current!.toDataURL("image/png"));
        }}
      />
      {!has && <span className="sign-hint">Hier mit dem Finger unterschreiben</span>}
      {has && (
        <button type="button" className="b-btn ghost sm sign-clear" onClick={() => (clear(), setHas(false), onChange(""))}>
          <Eraser size={14} /> Neu
        </button>
      )}
    </div>
  );
}
