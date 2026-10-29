"use client";

import { Camera, CameraOff, ImagePlus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button, IconButton } from "@/components/ui";
import { Modal } from "./kit";

type Shot = { file: File; url: string };

/**
 * Camera inside the app: take several photos in a row, look at them, drop single ones, then upload all at once.
 * Works with the back camera of iPhone, iPad and Android (HTTPS). Without a camera the photo picker opens instead.
 */
export function CameraCapture({ onDone, onClose, title = "Fotos aufnehmen" }: { onDone: (files: File[]) => void; onClose: () => void; title?: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<"start" | "on" | "error">("start");
  const [shots, setShots] = useState<Shot[]>([]);
  const [flash, setFlash] = useState(false);
  const shotsRef = useRef(shots);
  shotsRef.current = shots;

  useEffect(() => {
    let stream: MediaStream | undefined;
    let alive = true;
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("none");
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1440 } }, audio: false });
        if (!alive || !video.current) return stream.getTracks().forEach((t) => t.stop());
        video.current.srcObject = stream;
        await video.current.play().catch(() => undefined);
        setState("on");
      } catch {
        if (alive) setState("error");
      }
    })();
    return () => {
      alive = false;
      stream?.getTracks().forEach((t) => t.stop());
      shotsRef.current.forEach((s) => URL.revokeObjectURL(s.url));
    };
  }, []);

  const shoot = () => {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    const c = document.createElement("canvas");
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext("2d")!.drawImage(v, 0, 0);
    setFlash(true);
    setTimeout(() => setFlash(false), 120);
    c.toBlob(
      (b) => {
        if (!b) return;
        const stamp = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, "");
        const file = new File([b], `Foto_${stamp}_${shotsRef.current.length + 1}.jpg`, { type: "image/jpeg" });
        setShots((s) => [...s, { file, url: URL.createObjectURL(b) }]);
      },
      "image/jpeg",
      0.85
    );
  };
  const drop = (i: number) =>
    setShots((s) => {
      URL.revokeObjectURL(s[i].url);
      return s.filter((_, j) => j !== i);
    });
  const addPicked = (list: FileList | null) => {
    if (!list?.length) return;
    setShots((s) => [...s, ...Array.from(list).map((file) => ({ file, url: URL.createObjectURL(file) }))]);
  };

  return (
    <Modal
      size="wide"
      title={title}
      description={state === "on" ? "Auslösen, so oft nötig – danach alle auf einmal hochladen" : undefined}
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="secondary" leftIcon={<ImagePlus size={15} />} onClick={() => picker.current?.click()}>
            Aus Galerie
          </Button>
          <span className="grow" />
          <Button type="button" variant="secondary" onClick={onClose}>
            Abbrechen
          </Button>
          <Button type="button" disabled={!shots.length} onClick={() => onDone(shots.map((s) => s.file))}>
            {shots.length ? `${shots.length} ${shots.length === 1 ? "Foto" : "Fotos"} hochladen` : "Hochladen"}
          </Button>
        </>
      }
    >
      <div className="cam-view">
        <video ref={video} muted playsInline className={state === "on" ? "" : "hidden"} aria-label="Kamerabild" />
        {flash && <span className="cam-flash" />}
        {state === "start" && (
          <p className="scan-msg">
            <Camera size={22} /> Kamera wird gestartet …
          </p>
        )}
        {state === "error" && (
          <p className="scan-msg">
            <CameraOff size={22} /> Keine Kamera verfügbar oder Zugriff nicht erlaubt. Fotos über „Aus Galerie“ wählen – am Handy bietet das auch die Kamera an.
          </p>
        )}
        {state === "on" && (
          <button type="button" className="cam-shutter" onClick={shoot} aria-label="Foto aufnehmen">
            <span />
          </button>
        )}
      </div>
      {shots.length > 0 && (
        <div className="cam-strip" aria-label="Aufgenommene Fotos">
          {shots.map((s, i) => (
            <div key={s.url} className="cam-thumb">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.url} alt={`Foto ${i + 1}`} />
              <IconButton label="Foto verwerfen" size="sm" variant="ghost" onClick={() => drop(i)}>
                <X size={12} />
              </IconButton>
            </div>
          ))}
        </div>
      )}
      <input ref={picker} type="file" accept="image/*" multiple hidden onChange={(e) => (addPicked(e.target.files), (e.target.value = ""))} />
    </Modal>
  );
}
