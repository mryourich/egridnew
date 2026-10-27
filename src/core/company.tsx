"use client";

import { Download, Plus, RotateCcw, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { assignableRoles, byRole, FIELD, me, ROLLE_INFO, ROLLE_LABEL, ROLLEN, rightsOf, subtree, type Rolle } from "./roles";
import { today } from "./date";
import { uid, useStore } from "./store";
import type { Data, Person } from "./types";
import { Avatar, Button, Empty, Field, Modal, PageHead, SearchBox, Seg, Tag } from "./ui";

type Tab = "benutzer" | "firma" | "daten";

/** Company, people and roles, data – for the admin. */
export function CompanySettings() {
  const { data } = useStore();
  const [tab, setTab] = useState<Tab>("benutzer");
  if (!rightsOf(data).admin)
    return (
      <div className="page narrow">
        <Empty title="Nur für den Admin">Firma, Benutzer und Daten verwaltet der Admin.</Empty>
      </div>
    );
  return (
    <div className="page">
      <PageHead kicker="Einstellungen" title="Firma & Benutzer" sub={data.workspace.name}>
        <Seg<Tab>
          value={tab}
          onChange={setTab}
          options={[
            { value: "benutzer", label: "Benutzer & Rollen" },
            { value: "firma", label: "Firma" },
            { value: "daten", label: "Daten" }
          ]}
        />
      </PageHead>
      {tab === "benutzer" ? <PeopleAdmin /> : tab === "firma" ? <CompanyData /> : <DataAdmin />}
    </div>
  );
}

function PeopleAdmin() {
  const { data } = useStore();
  const [q, setQ] = useState("");
  const [role, setRole] = useState<Rolle | "">("");
  const [edit, setEdit] = useState<Partial<Person> | null>(null);
  const [inactive, setInactive] = useState(false);
  const term = q.trim().toLowerCase();
  const list = data.people
    .filter((p) => p.active !== inactive && (!role || p.rolle === role) && (!term || `${p.name} ${p.title} ${p.email} ${p.phone}`.toLowerCase().includes(term)))
    .sort(byRole);
  const fieldCount = data.people.filter((p) => p.active && FIELD.includes(p.rolle)).length;
  return (
    <>
      <div className="toolbar">
        <SearchBox value={q} onChange={setQ} placeholder="Name, Funktion, Telefon…" />
        <select className="select-sm" value={role} onChange={(e) => setRole(e.target.value as Rolle | "")} aria-label="Rolle">
          <option value="">Alle Rollen</option>
          {ROLLEN.map((r) => (
            <option key={r} value={r}>
              {ROLLE_LABEL[r]}
            </option>
          ))}
        </select>
        <button type="button" className="link" onClick={() => setInactive((x) => !x)}>
          {inactive ? "Aktive anzeigen" : "Ausgetretene"}
        </button>
        <span className="grow" />
        <span className="muted small">
          {data.people.filter((p) => p.active).length} aktiv · {fieldCount} davon Monteure, Lehrlinge, Externe (kostenlos)
        </span>
        <Button variant="primary" icon={<Plus size={15} />} onClick={() => setEdit({})}>
          Benutzer
        </Button>
      </div>
      <div className="panel">
        <table className="table rows-click">
          <thead>
            <tr>
              <th>Name</th>
              <th>Rolle</th>
              <th className="hide-sm">Vorgesetzt</th>
              <th className="hide-md">Kontakt</th>
            </tr>
          </thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id} onClick={() => setEdit(p)}>
                <td>
                  <span className="who">
                    <Avatar id={p.id} size={28} />
                    <span>
                      <strong>{p.name}</strong>
                      <small className="sub">{p.title}</small>
                    </span>
                  </span>
                </td>
                <td>
                  <Tag tone={p.rolle === "admin" || p.rolle === "gf" ? "blue" : FIELD.includes(p.rolle) ? "gray" : "green"}>{ROLLE_LABEL[p.rolle]}</Tag>
                </td>
                <td className="hide-sm">{data.people.find((x) => x.id === p.managerId)?.name ?? <span className="muted">–</span>}</td>
                <td className="hide-md muted">{[p.phone, p.email].filter(Boolean).join(" · ") || "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length === 0 && <p className="panel-empty">Niemand gefunden.</p>}
      </div>
      {edit && <PersonForm person={edit} onClose={() => setEdit(null)} />}
    </>
  );
}

function PersonForm({ person, onClose }: { person: Partial<Person>; onClose: () => void }) {
  const { data, save, notify } = useStore();
  const isNew = !person.id;
  const [v, setV] = useState<Person>({ id: "", name: "", title: "", rolle: "monteur", managerId: data.meId, email: "", phone: "", active: true, ...person });
  const allowed = assignableRoles(data);
  const below = person.id ? subtree(data, person.id) : new Set<string>();
  const bosses = data.people.filter((p) => p.active && !below.has(p.id) && !FIELD.includes(p.rolle)).sort(byRole);
  const self = person.id === me(data)?.id;
  const submit = () => {
    if (!v.name.trim()) return;
    save("people", { ...v, id: v.id || uid(), name: v.name.trim(), title: v.title.trim() || ROLLE_LABEL[v.rolle] });
    notify(isNew ? `${v.name.trim()} angelegt` : "Gespeichert");
    onClose();
  };
  return (
    <Modal
      title={isNew ? "Neuer Benutzer" : v.name}
      kicker="Benutzer & Rollen"
      onClose={onClose}
      wide
      footer={
        <>
          {!isNew && !self && (
            <Button variant={v.active ? "danger" : "default"} onClick={() => setV({ ...v, active: !v.active })}>
              {v.active ? "Austritt eintragen" : "Wieder aktivieren"}
            </Button>
          )}
          <span className="grow" />
          <Button variant="ghost" onClick={onClose}>
            Abbrechen
          </Button>
          <Button variant="primary" onClick={submit} disabled={!v.name.trim()}>
            Speichern
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Name *">
          <input autoFocus value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} placeholder="Vor- und Nachname" />
        </Field>
        <Field label="Funktion">
          <input value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} placeholder="z. B. Elektrotechniker" />
        </Field>
        <div className="b-field span-2">
          <span className="b-label">Rolle</span>
          <div className="role-grid">
            {ROLLEN.map((r) => (
              <button key={r} type="button" className={v.rolle === r ? "on" : ""} disabled={!allowed.includes(r) || (self && r !== v.rolle)} onClick={() => setV({ ...v, rolle: r })}>
                {ROLLE_LABEL[r]}
              </button>
            ))}
          </div>
          <small className="b-hint">{ROLLE_INFO[v.rolle]}</small>
        </div>
        <Field label="Vorgesetzt" hint="Leiter sehen die Projekte ihrer Leute.">
          <select value={v.managerId} onChange={(e) => setV({ ...v, managerId: e.target.value })}>
            <option value="">– niemand (ganz oben) –</option>
            {bosses
              .filter((b) => b.id !== v.id)
              .map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} · {ROLLE_LABEL[b.rolle]}
                </option>
              ))}
          </select>
        </Field>
        <Field label="Telefon">
          <input type="tel" value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} placeholder="+43 …" />
        </Field>
        <Field label="E-Mail" className="span-2" hint="Später kommt hierher die Einladung zum Login.">
          <input type="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} />
        </Field>
      </div>
    </Modal>
  );
}

function CompanyData() {
  const { data, setWorkspace, notify } = useStore();
  const [v, setV] = useState(data.workspace);
  return (
    <div className="panel pad narrow-block">
      <div className="form-grid">
        <Field label="Firmenname" className="span-2">
          <input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} />
        </Field>
        <Field label="Adresse" className="span-2" hint="Steht auf den Berichten.">
          <input value={v.address} onChange={(e) => setV({ ...v, address: e.target.value })} />
        </Field>
      </div>
      <Button variant="primary" onClick={() => (setWorkspace({ ...v, name: v.name.trim() || data.workspace.name }), notify("Gespeichert"))}>
        Speichern
      </Button>
    </div>
  );
}

function DataAdmin() {
  const { data, replaceAll, reset, notify } = useStore();
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="panel pad narrow-block">
      <p className="muted">Die Daten liegen derzeit auf diesem Gerät. Mit der Cloud-Anbindung (Supabase) kommen sie auf den Server – bis dahin ab und zu eine Sicherung herunterladen.</p>
      <div className="actions">
        <Button
          icon={<Download size={15} />}
          onClick={() => {
            const a = document.createElement("a");
            a.href = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: "application/json" }));
            a.download = `VYSNER Sicherung ${today()}.json`;
            a.click();
            URL.revokeObjectURL(a.href);
          }}
        >
          Sicherung herunterladen
        </Button>
        <Button icon={<Upload size={15} />} onClick={() => input.current?.click()}>
          Sicherung laden
        </Button>
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
              if (!Array.isArray(next.projects) || !Array.isArray(next.people)) throw new Error();
              if (!window.confirm("Alle Daten auf diesem Gerät durch die Sicherung ersetzen?")) return;
              replaceAll(next);
              notify("Sicherung geladen");
            } catch {
              notify("Das ist keine VYSNER-Sicherung.");
            }
          }}
        />
      </div>
      <div className="actions">
        <Button variant="ghost" icon={<RotateCcw size={15} />} onClick={() => window.confirm("Die Demo-Firma laden? Die Daten auf diesem Gerät werden ersetzt.") && (reset("demo"), notify("Demo-Firma geladen"))}>
          Demo-Firma laden
        </Button>
        <Button variant="danger" onClick={() => window.confirm("Wirklich alles löschen und leer starten?") && (reset("empty"), notify("Leer gestartet"))}>
          Leer starten
        </Button>
      </div>
    </div>
  );
}
