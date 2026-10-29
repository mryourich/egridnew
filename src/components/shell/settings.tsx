"use client";

import { Download, Plus, RotateCcw, Trash2, Upload } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { BlurInput, Field, Modal, useConfirm } from "@/components/app/kit";
import { Button, IconButton, Switch, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui";
import { DATA_VERSION } from "@/lib/store/seed";
import { uid, useStore } from "@/lib/store/store";
import type { Data, Person } from "@/lib/store/types";

export function SettingsDialog({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState("team");
  return (
    <Modal size="wide" title="Einstellungen" description="Betrieb, Mitarbeiter und Daten dieses Geräts" onClose={onClose}>
      <Tabs defaultValue="team" value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="team">Mitarbeiter</TabsTrigger>
          <TabsTrigger value="firma">Firmendaten</TabsTrigger>
          <TabsTrigger value="module">Funktionen</TabsTrigger>
          <TabsTrigger value="daten">Daten</TabsTrigger>
        </TabsList>
        <div style={{ marginTop: 16 }}>
          <TabsContent value="team">
            <People onDone={onClose} />
          </TabsContent>
          <TabsContent value="firma">
            <Company />
          </TabsContent>
          <TabsContent value="module">
            <Modules />
          </TabsContent>
          <TabsContent value="daten">
            <DataTab onDone={onClose} />
          </TabsContent>
        </div>
      </Tabs>
    </Modal>
  );
}

function People({ onDone }: { onDone: () => void }) {
  const { data, save, remove, notify } = useStore();
  const ask = useConfirm();
  const people = [...data.people].sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name, "de"));
  const set = (p: Person, patch: Partial<Person>) => save("people", { ...p, ...patch });
  const add = () => {
    const id = uid();
    save("people", { id, name: "Neuer Mitarbeiter", role: "Monteur", phone: "", active: true });
    setTimeout(() => document.querySelector<HTMLInputElement>(`[data-person="${id}"]`)?.select(), 30);
  };
  const drop = async (p: Person) => {
    if (p.id === data.meId) return notify("Der angemeldete Benutzer kann nicht gelöscht werden.", { tone: "error" });
    if (await ask({ title: `${p.name} löschen?`, text: "Zuweisungen werden entfernt, Einträge im Kalender gelöscht. Wer nur pausiert, wird besser auf „inaktiv“ gestellt." })) {
      remove("people", p.id);
      notify(`${p.name} gelöscht`);
    }
  };
  return (
    <div className="settings-people">
      <div className="toolbar" style={{ marginBottom: 8 }}>
        <span className="muted">
          {people.filter((p) => p.active).length} aktiv · Personalnummer, Adresse, SV-Nr. und Qualifikationen unter{" "}
          <Link href="/stammdaten" onClick={onDone}>
            Stammdaten
          </Link>
        </span>
        <span className="grow" />
        <Button size="sm" leftIcon={<Plus size={14} />} onClick={add}>
          Mitarbeiter
        </Button>
      </div>
      <div className="ui-table-wrap">
        <table className="ui-table">
          <thead>
            <tr>
              <th className="ui-table-head">Name</th>
              <th className="ui-table-head">Funktion</th>
              <th className="ui-table-head">Telefon</th>
              <th className="ui-table-head">Aktiv</th>
              <th className="ui-table-head" aria-label="Aktionen" />
            </tr>
          </thead>
          <tbody>
            {people.map((p) => (
              <tr key={p.id} className="ui-table-row">
                <td className="ui-table-cell">
                  <BlurInput data-person={p.id} value={p.name} aria-label="Name" onSave={(v) => (v ? set(p, { name: v }) : notify("Name darf nicht leer sein", { tone: "error" }))} />
                </td>
                <td className="ui-table-cell">
                  <BlurInput value={p.role} aria-label="Funktion" list="roles" onSave={(v) => set(p, { role: v })} />
                </td>
                <td className="ui-table-cell">
                  <BlurInput value={p.phone} aria-label="Telefon" type="tel" onSave={(v) => set(p, { phone: v })} />
                </td>
                <td className="ui-table-cell">
                  <Switch checked={p.active} aria-label="Aktiv" disabled={p.id === data.meId} onChange={(e) => set(p, { active: e.target.checked })} />
                </td>
                <td className="ui-table-cell num">
                  <IconButton label="Löschen" variant="danger" size="sm" onClick={() => void drop(p)}>
                    <Trash2 size={14} />
                  </IconButton>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <datalist id="roles">
        {["Bauleiter", "Projektleiter", "Polier", "Vorarbeiter", "Monteur", "Elektriker", "Techniker", "Lehrling", "Büro", "Subunternehmer"].map((r) => (
          <option key={r} value={r} />
        ))}
      </datalist>
    </div>
  );
}

function Company() {
  const { data, restore } = useStore();
  const w = data.workspace;
  const set = (patch: Partial<Data["workspace"]>) => restore({ ...data, workspace: { ...data.workspace, ...patch } });
  return (
    <div className="form-grid">
      <p className="span-2 muted">Diese Angaben stehen auf Bautagesberichten, Regiescheinen und Arbeitsberichten (Firmenangaben nach § 14 UGB).</p>
      <Field label="Firmenwortlaut" className="span-2">
        <BlurInput value={w.name} onSave={(v) => v && set({ name: v })} />
      </Field>
      <Field label="Rechtsform" hint="z. B. GmbH, OG, KG, e.U.">
        <BlurInput value={w.legalForm ?? ""} onSave={(v) => set({ legalForm: v })} />
      </Field>
      <Field label="Sitz">
        <BlurInput value={w.seat ?? ""} onSave={(v) => set({ seat: v })} placeholder="z. B. Linz" />
      </Field>
      <Field label="Firmenbuchnummer">
        <BlurInput value={w.fbNo ?? ""} onSave={(v) => set({ fbNo: v })} placeholder="FN 123456 a" />
      </Field>
      <Field label="Firmenbuchgericht">
        <BlurInput value={w.fbCourt ?? ""} onSave={(v) => set({ fbCourt: v })} placeholder="Landesgericht Linz" />
      </Field>
      <Field label="UID-Nummer">
        <BlurInput value={w.uid ?? ""} className="mono" onSave={(v) => set({ uid: v.replace(/\s/g, "").toUpperCase() })} placeholder="ATU12345678" />
      </Field>
      <Field label="Adresse">
        <BlurInput value={w.address} onSave={(v) => set({ address: v })} placeholder="Straße, PLZ Ort" />
      </Field>
      <Field label="Telefon">
        <BlurInput value={w.phone ?? ""} type="tel" onSave={(v) => set({ phone: v })} />
      </Field>
      <Field label="E-Mail">
        <BlurInput value={w.email ?? ""} type="email" onSave={(v) => set({ email: v })} />
      </Field>
      <Field label="Website" className="span-2">
        <BlurInput value={w.web ?? ""} onSave={(v) => set({ web: v })} />
      </Field>
    </div>
  );
}

function Modules() {
  const { data, restore } = useStore();
  const w = data.workspace;
  const set = (patch: Partial<Data["workspace"]>) => restore({ ...data, workspace: { ...data.workspace, ...patch } });
  return (
    <div className="form-grid">
      <label className="check-row span-2">
        <Switch checked={!!w.modules?.service} onChange={(e) => set({ modules: { ...w.modules, service: e.target.checked } })} />
        <span>
          <strong>Service & Kundendienst</strong>
          <br />
          <small className="muted">Kunden, Serviceaufträge, Disposition je Techniker, „Mein Tag“ am Tablet, Übernahmebestätigung mit Unterschrift</small>
        </span>
      </label>
      {w.modules?.service && (
        <Field label="Aufträge je Techniker und Tag (Richtwert)">
          <BlurInput value={String(w.maxPerDay ?? 10)} inputMode="numeric" onSave={(v) => set({ maxPerDay: Math.max(1, Math.min(30, Number(v) || 10)) })} />
        </Field>
      )}
      <p className="span-2 muted">Freigeben dürfen Mitarbeiter mit „Darf Berichte freigeben“ in den Stammdaten.</p>
    </div>
  );
}

function DataTab({ onDone }: { onDone: () => void }) {
  const { data, reset, restore, notify } = useStore();
  const ask = useConfirm();
  const file = useRef<HTMLInputElement>(null);
  const exportJson = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `vysner-baustelle-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
  };
  const importJson = async (f: File | undefined) => {
    if (!f) return;
    try {
      const d = JSON.parse(await f.text()) as Data;
      if (d.version !== DATA_VERSION || !Array.isArray(d.sites) || !Array.isArray(d.people)) throw new Error();
      if (!(await ask({ title: "Sicherung einspielen?", text: "Die aktuellen Daten auf diesem Gerät werden ersetzt.", confirm: "Einspielen" }))) return;
      restore({ ...d, demo: undefined });
      notify("Sicherung eingespielt");
      onDone();
    } catch {
      notify("Die Datei ist keine gültige VYSNER-Sicherung.", { tone: "error" });
    }
  };
  return (
    <div className="settings-data">
      <p className="muted" style={{ marginBottom: 16 }}>
        Alle Daten werden in diesem Browser gespeichert (Fotos und Dateien in IndexedDB). Eine Sicherung als Datei schützt vor Verlust beim Löschen der Browserdaten.
      </p>
      <div className="list-rows panel">
        <div>
          <span className="title">
            <strong>Sicherung herunterladen</strong>
            <br />
            <small className="muted">Alle Baustellen, Punkte, Mängel, Aufgaben, Termine, Notizen und Material als JSON</small>
          </span>
          <Button variant="secondary" size="sm" leftIcon={<Download size={14} />} onClick={exportJson}>
            Herunterladen
          </Button>
        </div>
        <div>
          <span className="title">
            <strong>Sicherung einspielen</strong>
            <br />
            <small className="muted">Ersetzt die Daten auf diesem Gerät</small>
          </span>
          <Button variant="secondary" size="sm" leftIcon={<Upload size={14} />} onClick={() => file.current?.click()}>
            Datei wählen
          </Button>
          <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => (void importJson(e.target.files?.[0]), (e.target.value = ""))} />
        </div>
        <div>
          <span className="title">
            <strong>Beispielbetrieb laden</strong>
            <br />
            <small className="muted">Vier Baustellen mit Checklisten, Mängeln, Terminen und Material</small>
          </span>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RotateCcw size={14} />}
            onClick={async () => {
              if (await ask({ title: "Beispielbetrieb laden?", text: "Die aktuellen Daten werden ersetzt.", confirm: "Laden" })) (reset("demo"), notify("Beispielbetrieb geladen"), onDone());
            }}
          >
            Laden
          </Button>
        </div>
        <div>
          <span className="title">
            <strong>Leer starten</strong>
            <br />
            <small className="muted">Löscht alle Daten auf diesem Gerät</small>
          </span>
          <Button
            variant="destructive"
            size="sm"
            leftIcon={<Trash2 size={14} />}
            onClick={async () => {
              if (await ask({ title: "Alle Daten löschen?", confirm: "Alles löschen" })) (reset("empty"), notify("Alle Daten gelöscht"), onDone());
            }}
          >
            Alles löschen
          </Button>
        </div>
      </div>
    </div>
  );
}
