"use client";

import { Download, RotateCcw, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Card, PageHeader } from "@/components/ui";
import { today } from "@/lib/date";
import { isManager, useStore } from "@/lib/store";
import type { Data } from "@/lib/types";

export default function SettingsPage() {
  const { data, setCompany, replaceAll, reset, notify } = useStore();
  const admin = isManager(data);
  const [name, setName] = useState(data.company.name);
  const [address, setAddress] = useState(data.company.address);
  useEffect(() => {
    setName(data.company.name);
    setAddress(data.company.address);
  }, [data.company.name, data.company.address]);
  const file = useRef<HTMLInputElement>(null);

  const exportData = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `vysner-sicherung-${today()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importData = async (f: File | undefined) => {
    if (!f) return;
    try {
      const parsed = JSON.parse(await f.text()) as Data;
      if (!Array.isArray(parsed.projects) || !Array.isArray(parsed.employees)) throw new Error();
      if (!window.confirm("Alle aktuellen Daten durch die Sicherung ersetzen?")) return;
      replaceAll(parsed);
      notify("Sicherung eingespielt");
    } catch {
      notify("Datei ist keine gültige VYSNER-Sicherung");
    }
  };

  const counts = [
    ["Projekte", data.projects.length],
    ["Mitarbeiter", data.employees.length],
    ["Material", data.materials.length],
    ["Aufgaben", data.jobs.length],
    ["Mängel", data.issues.length],
    ["Fotos", data.photos.length],
    ["Tagesberichte", data.reports.length]
  ] as const;

  return (
    <div className="page page-narrow">
      <PageHeader title="Einstellungen" subtitle="Firmendaten und Datensicherung" />
      <div className="stack">
        <Card title="Firma">
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              setCompany({ ...data.company, name, address });
              notify("Firmendaten gespeichert");
            }}
          >
            <div className="form-grid">
              <div className="field field-full">
                <label htmlFor="c-name">Firmenname</label>
                <input id="c-name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="field field-full">
                <label htmlFor="c-addr">Adresse</label>
                <input id="c-addr" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
            </div>
            <footer className="form-footer">
              <span className="spacer" />
              <button className="btn btn-primary" type="submit">
                Speichern
              </button>
            </footer>
          </form>
        </Card>

        {admin ? (
        <Card title="Daten">
          <p className="muted">
            Im Demo-Modus werden alle Daten nur in diesem Browser gespeichert. Erstelle regelmäßig eine Sicherung, um sie auf ein anderes Gerät zu übertragen.
          </p>
          <div className="stat-inline">
            {counts.map(([label, value]) => (
              <span key={label}>
                <strong>{value}</strong> {label}
              </span>
            ))}
          </div>
          <div className="row-inline wrap">
            <button className="btn" type="button" onClick={exportData}>
              <Download size={15} /> Sicherung herunterladen
            </button>
            <button className="btn" type="button" onClick={() => file.current?.click()}>
              <Upload size={15} /> Sicherung einspielen
            </button>
            <input ref={file} type="file" accept="application/json" hidden onChange={(e) => importData(e.target.files?.[0])} />
            <button
              className="btn"
              type="button"
              onClick={() => {
                if (window.confirm("Aktuelle Daten durch die Demo-Firma ersetzen?")) {
                  reset("demo");
                  notify("Demo-Firma geladen");
                }
              }}
            >
              <RotateCcw size={15} /> Demo-Firma laden
            </button>
            <button
              className="btn btn-danger-ghost"
              type="button"
              onClick={() => {
                if (window.confirm("ALLE Daten löschen und leer starten? Es bleibt nur der Bauleitungs-Zugang.")) {
                  reset("empty");
                  notify("Alles gelöscht – leer gestartet");
                }
              }}
            >
              <RotateCcw size={15} /> Alles löschen (leer starten)
            </button>
          </div>
        </Card>
        ) : (
          <Card title="Daten">
            <p className="muted">Datensicherung und Löschen sind der Bauleitung vorbehalten.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
