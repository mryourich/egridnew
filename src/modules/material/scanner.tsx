"use client";

import { Camera, CameraOff, ScanLine } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Field, Modal } from "@/components/app/kit";
import { Button, Input } from "@/components/ui";

type Controls = { stop: () => void };

/**
 * Scan a barcode with the camera (iPhone, iPad, Android, notebook) via zxing.
 * A hand scanner types the code like a keyboard – the field below takes it, Enter confirms.
 */
export function ScanDialog({ onCode, onClose }: { onCode: (code: string) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<"start" | "on" | "off" | "error">("start");
  const [error, setError] = useState("");
  const [manual, setManual] = useState("");
  const done = useRef(false);

  useEffect(() => {
    let controls: Controls | undefined;
    let alive = true;
    const finish = (code: string) => {
      if (done.current) return;
      done.current = true;
      controls?.stop();
      onCode(code.trim());
    };
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setState("off");
        setError("Dieses Gerät oder dieser Browser erlaubt keinen Kamerazugriff. Code bitte eintippen oder mit dem Handscanner erfassen.");
        return;
      }
      try {
        const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([import("@zxing/browser"), import("@zxing/library")]);
        const hints = new Map([[DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.CODE_128, BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.CODE_39, BarcodeFormat.QR_CODE, BarcodeFormat.UPC_A, BarcodeFormat.ITF]]]);
        const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 150 });
        if (!alive || !video.current) return;
        controls = await reader.decodeFromConstraints({ video: { facingMode: { ideal: "environment" } } }, video.current, (result) => {
          if (result) finish(result.getText());
        });
        if (!alive) controls.stop();
        else setState("on");
      } catch (e) {
        if (!alive) return;
        const name = e instanceof Error ? e.name : "";
        setState("error");
        setError(name === "NotAllowedError" ? "Kamerazugriff wurde nicht erlaubt. In den Browser-Einstellungen freigeben oder den Code eintippen." : name === "NotFoundError" ? "Keine Kamera gefunden. Code eintippen oder mit dem Handscanner erfassen." : "Die Kamera konnte nicht gestartet werden. Code eintippen oder mit dem Handscanner erfassen.");
      }
    })();
    return () => {
      alive = false;
      controls?.stop();
    };
  }, [onCode]);

  return (
    <Modal
      title="Barcode scannen"
      description="Kamera auf den Barcode richten – oder Handscanner verwenden"
      onClose={onClose}
      onSubmit={() => manual.trim() && !done.current && ((done.current = true), onCode(manual.trim()))}
      footer={
        <>
          <span className="grow" />
          <Button type="button" variant="secondary" onClick={onClose}>
            Abbrechen
          </Button>
          <Button type="submit" disabled={!manual.trim()}>
            Übernehmen
          </Button>
        </>
      }
    >
      <div className="scan-view">
        <video ref={video} muted playsInline aria-label="Kamerabild" className={state === "on" ? "" : "hidden"} />
        {state === "on" && <span className="scan-frame" aria-hidden />}
        {state === "start" && (
          <p className="scan-msg">
            <Camera size={22} /> Kamera wird gestartet …
          </p>
        )}
        {(state === "off" || state === "error") && (
          <p className="scan-msg">
            <CameraOff size={22} /> {error}
          </p>
        )}
      </div>
      <Field label="Code eingeben oder Handscanner" hint="Handscanner schließen mit Enter ab." className="scan-manual">
        <div className="input-icon">
          <ScanLine size={15} />
          <Input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="z. B. 9120001160204" autoFocus={state !== "on"} inputMode="text" autoComplete="off" />
        </div>
      </Field>
    </Modal>
  );
}
