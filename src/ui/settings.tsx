"use client";

import { Download, RotateCcw, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { today } from "@/lib/date";
import { useStore } from "@/lib/store";
import type { Data } from "@/lib/types";
import { activePeople, canPlan, simpleRole } from "./access";
import { Field, PageHead } from "./kit";

/** Company, licence and the data on this device. */
export function Settings() {
  const { data, setCompany, replaceAll, reset, notify } = useStore();
  const [name, setName] = useState(data.company.name);
  const [address, setAddress] = useState(data.company.address);
  const input = useRef<HTMLInputElement>(null);
  const planner = canPlan(data);
  const people = activePeople(data);
  const workers = people.filter((e) => simpleRole(e) === "monteur").length;

  return (
    <div className="v-page narrow">
      <PageHead title="Einstellungen" />

      <section className="v-card v-pad-card">
        <h2 className="v-card-title">Firma</h2>
        <Field label="Name">
          <input value={name} onChange={(e) => setName(e.target.value)} disabled={!planner} />
        </Field>
        <Field label="Adresse (für die PDFs)">
          <input value={address} onChange={(e) => setAddress(e.target.value)} disabled={!planner} />
        </Field>
        {planner && (
          <button
            type="button"
            className="v-btn primary"
            onClick={() => {
              setCompany({ ...data.company, name: name.trim() || data.company.name, address: address.trim() });
              notify("Gespeichert");
            }}
          >
            Speichern
          </button>
        )}
      </section>

      <section className="v-card v-pad-card">
        <h2 className="v-card-title">Lizenz</h2>
        <p className="v-license">
          <strong>Firmenlizenz – ein Fixpreis</strong>
          <span>
            {people.length - workers} Zugänge für Chef, Büro und Bauleitung · <b>{workers} Monteure kostenlos</b>
          </span>
        </p>
      </section>

      {planner && (
        <section className="v-card v-pad-card">
          <h2 className="v-card-title">Daten</h2>
          <p className="v-hint">Die Daten liegen auf diesem Gerät. Mach ab und zu eine Sicherung.</p>
          <div className="v-actions">
            <button
              type="button"
              className="v-btn"
              onClick={() => {
                const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = `VYSNER Sicherung ${today()}.json`;
                a.click();
                URL.revokeObjectURL(a.href);
              }}
            >
              <Download size={16} /> Sicherung herunterladen
            </button>
            <button type="button" className="v-btn" onClick={() => input.current?.click()}>
              <Upload size={16} /> Sicherung laden
            </button>
            <input
              ref={input}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={async (e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f) return;
                try {
                  const next = JSON.parse(await f.text()) as Data;
                  if (!Array.isArray(next.projects) || !Array.isArray(next.employees)) throw new Error();
                  if (!window.confirm("Alle Daten auf diesem Gerät durch die Sicherung ersetzen?")) return;
                  replaceAll(next);
                  notify("Sicherung geladen");
                } catch {
                  notify("Das ist keine VYSNER-Sicherung.");
                }
              }}
            />
          </div>
          <div className="v-actions">
            <button type="button" className="v-btn ghost" onClick={() => window.confirm("Die Demo-Firma laden? Deine Daten auf diesem Gerät werden ersetzt.") && (reset("demo"), notify("Demo-Firma geladen"))}>
              <RotateCcw size={16} /> Demo-Firma laden
            </button>
            <button type="button" className="v-btn ghost danger" onClick={() => window.confirm("Wirklich alles löschen und leer starten?") && (reset("empty"), notify("Leer gestartet"))}>
              Leer starten
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
