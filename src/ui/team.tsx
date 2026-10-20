"use client";

import { Phone, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { fmt, today } from "@/lib/date";
import { employeeName, uid, useStore } from "@/lib/store";
import type { Absence, AbsenceType, Employee } from "@/lib/types";
import { ABSENCE, activePeople, canPlan, canRemove, dayText, SIMPLE_ACCESS, SIMPLE_LABEL, simpleRole, type Simple } from "./access";
import { Empty, Face, Field, PageHead, Sheet } from "./kit";

/** The people of the company and who is away. */
export function Team() {
  const { data } = useStore();
  const [person, setPerson] = useState<Partial<Employee> | null>(null);
  const [away, setAway] = useState<Partial<Absence> | null>(null);
  const planner = canPlan(data);
  const t = today();
  const people = activePeople(data);
  const absences = data.absences.filter((a) => a.end >= t && data.employees.some((e) => e.id === a.employeeId && e.active)).sort((a, b) => a.start.localeCompare(b.start));

  return (
    <div className="v-page narrow">
      <PageHead title="Team" sub={`${people.length} ${people.length === 1 ? "Person" : "Personen"} · Monteure kosten nichts extra`}>
        {planner && (
          <button type="button" className="v-btn primary" onClick={() => setPerson({})}>
            <Plus size={17} /> Mitarbeiter
          </button>
        )}
      </PageHead>

      <ul className="v-card v-list">
        {people.map((e) => (
          <li key={e.id}>
            <Face id={e.id} size={38} />
            <button type="button" className="v-list-main" onClick={() => planner && setPerson(e)} disabled={!planner}>
              <strong>{e.name}</strong>
              <small>
                {SIMPLE_LABEL[simpleRole(e)]} · heute: {dayText(data, e.id, t).text}
              </small>
            </button>
            {e.phone && (
              <a className="v-icon" href={`tel:${e.phone.replace(/\s/g, "")}`} aria-label={`${e.name} anrufen`} title={e.phone}>
                <Phone size={17} />
              </a>
            )}
          </li>
        ))}
      </ul>

      <div className="v-card-head v-gap">
        <h2 className="v-card-title">Urlaub und Krankenstand</h2>
        {planner && (
          <button type="button" className="v-btn" onClick={() => setAway({ start: t, end: t, type: "urlaub" })}>
            <Plus size={16} /> Eintragen
          </button>
        )}
      </div>
      {absences.length === 0 ? (
        <Empty>Niemand ist abwesend.</Empty>
      ) : (
        <ul className="v-card v-list">
          {absences.map((a) => (
            <li key={a.id}>
              <Face id={a.employeeId} size={32} />
              <button type="button" className="v-list-main" onClick={() => planner && setAway(a)} disabled={!planner}>
                <strong>{employeeName(data, a.employeeId)}</strong>
                <small>
                  {fmt(a.start)}
                  {a.end !== a.start ? ` – ${fmt(a.end)}` : ""}
                </small>
              </button>
              <span className="v-chip" style={{ color: ABSENCE[a.type].color, background: `${ABSENCE[a.type].color}18` }}>
                {ABSENCE[a.type].label}
              </span>
            </li>
          ))}
        </ul>
      )}

      {person && <PersonSheet person={person} onClose={() => setPerson(null)} />}
      {away && <AbsenceSheet absence={away} onClose={() => setAway(null)} />}
    </div>
  );
}

function PersonSheet({ person, onClose }: { person: Partial<Employee>; onClose: () => void }) {
  const { data, save, notify } = useStore();
  const isNew = !person.id;
  const [name, setName] = useState(person.name ?? "");
  const [role, setRole] = useState<Simple>(isNew ? "monteur" : simpleRole(person as Employee));
  const [phone, setPhone] = useState(person.phone ?? "");
  const [email, setEmail] = useState(person.email ?? "");

  const submit = () => {
    if (!name.trim()) return;
    const base: Employee = isNew
      ? { id: uid("e"), name: "", role: "", department: "", team: "", phone: "", email: "", hourlyRate: 0, qualifications: [], active: true }
      : (person as Employee);
    const item: Employee = { ...base, name: name.trim(), access: SIMPLE_ACCESS[role], role: base.role && !isNew && simpleRole(base) === role ? base.role : SIMPLE_LABEL[role], phone: phone.trim(), email: email.trim() };
    save("employees", item, isNew ? `${item.name} angelegt` : `${item.name} geändert`);
    notify(isNew ? `${item.name} ist im Team` : "Gespeichert");
    onClose();
  };

  return (
    <Sheet
      title={isNew ? "Neuer Mitarbeiter" : person.name}
      onClose={onClose}
      footer={
        <>
          {!isNew && canRemove(data) && person.id !== data.currentUserId && (
            <button
              type="button"
              className="v-btn ghost danger"
              onClick={() => {
                if (!window.confirm(`${person.name} aus dem Team nehmen?`)) return;
                save("employees", { ...(person as Employee), active: false }, `${person.name} ausgetreten`);
                onClose();
              }}
            >
              <Trash2 size={16} /> Aus dem Team
            </button>
          )}
          <span className="v-grow" />
          <button type="button" className="v-btn ghost" onClick={onClose}>
            Abbrechen
          </button>
          <button type="button" className="v-btn primary" onClick={submit} disabled={!name.trim()}>
            {isNew ? "Anlegen" : "Speichern"}
          </button>
        </>
      }
    >
      <Field label="Name">
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Vor- und Nachname" />
      </Field>
      <Field label="Rolle" hint={role === "monteur" ? "Monteure sehen ihre Einteilung und Baustellen und sind kostenlos." : role === "buero" ? "Das Büro sieht alles, plant und gibt Regiescheine frei." : undefined}>
        <div className="v-switch small wrap">
          {(["monteur", "bauleiter", "buero", "chef"] as Simple[]).map((r) => (
            <button key={r} type="button" className={role === r ? "on" : ""} onClick={() => setRole(r)}>
              {SIMPLE_LABEL[r]}
            </button>
          ))}
        </div>
      </Field>
      <div className="v-row2">
        <Field label="Telefon">
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+43 …" />
        </Field>
        <Field label="E-Mail">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
      </div>
    </Sheet>
  );
}

function AbsenceSheet({ absence, onClose }: { absence: Partial<Absence>; onClose: () => void }) {
  const { data, save, remove, notify } = useStore();
  const isNew = !absence.id;
  const people = activePeople(data);
  const [employeeId, setEmployeeId] = useState(absence.employeeId ?? people[0]?.id ?? "");
  const [type, setType] = useState<AbsenceType>(absence.type ?? "urlaub");
  const [start, setStart] = useState(absence.start ?? today());
  const [end, setEnd] = useState(absence.end ?? today());

  return (
    <Sheet
      title={isNew ? "Abwesenheit eintragen" : "Abwesenheit"}
      onClose={onClose}
      footer={
        <>
          {!isNew && canRemove(data) && (
            <button
              type="button"
              className="v-btn ghost danger"
              onClick={() => {
                remove("absences", absence.id!);
                onClose();
              }}
            >
              <Trash2 size={16} /> Löschen
            </button>
          )}
          <span className="v-grow" />
          <button type="button" className="v-btn ghost" onClick={onClose}>
            Abbrechen
          </button>
          <button
            type="button"
            className="v-btn primary"
            disabled={!employeeId}
            onClick={() => {
              save("absences", { id: absence.id ?? uid("ab"), note: absence.note ?? "", employeeId, type, start, end: end < start ? start : end });
              notify(`${ABSENCE[type].label} eingetragen`);
              onClose();
            }}
          >
            Speichern
          </button>
        </>
      }
    >
      <Field label="Wer?">
        <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
          {people.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
      </Field>
      <div className="v-switch small wrap">
        {(["urlaub", "krank", "za", "schulung"] as AbsenceType[]).map((k) => (
          <button key={k} type="button" className={type === k ? "on" : ""} onClick={() => setType(k)}>
            {ABSENCE[k].label}
          </button>
        ))}
      </div>
      <div className="v-row2">
        <Field label="Von">
          <input type="date" value={start} onChange={(e) => e.target.value && setStart(e.target.value)} />
        </Field>
        <Field label="Bis">
          <input type="date" value={end} min={start} onChange={(e) => e.target.value && setEnd(e.target.value)} />
        </Field>
      </div>
    </Sheet>
  );
}
