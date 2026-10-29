"use client";

import { Download, Plus, Search, Trash2, UserRound, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Avatar, BlurInput, BlurTextarea, Empty, Field, Modal, PageHead, Seg, SidePanel, SortHead, StatusBadge, useConfirm } from "@/components/app/kit";
import { Button, IconButton, Input, Select, Switch } from "@/components/ui";
import { fmt, inRange, today } from "@/lib/date";
import { fmtNum, parseNum } from "@/lib/format";
import { EMPLOYMENT, EMPLOYMENTS, LEAD_POSITIONS } from "@/lib/labels";
import { PositionSelect } from "@/components/app/position-select";
import { personName, siteName, uid, useStore } from "@/lib/store/store";
import type { Employment, Person } from "@/lib/store/types";
import { useQuery } from "@/lib/use-query";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/zip";

type Show = "aktiv" | "inaktiv" | "alle";
type SortKey = "no" | "name" | "role" | "company" | "employment" | "entry";

const nameParts = (p: Person) => {
  const [first = "", ...rest] = p.name.split(" ");
  return { first: p.firstName ?? first, last: p.lastName ?? rest.join(" ") };
};

/** Next free personnel number of the own staff (numeric). */
function nextNo(people: Person[]) {
  const n = Math.max(1000, ...people.map((p) => Number(p.personnelNo) || 0));
  return String(n + 1);
}

/** AT social security number: 10 digits, the 4th is a check digit. */
export function svValid(sv: string) {
  const d = sv.replace(/\s/g, "");
  if (!/^\d{10}$/.test(d)) return false;
  const w = [3, 7, 9, 0, 5, 8, 4, 2, 1, 6];
  const sum = [...d].reduce((s, c, i) => s + Number(c) * w[i], 0) % 11;
  return sum === Number(d[3]);
}

/** Master data of all employees: personnel number, contact, employment, qualifications. */
export function People() {
  const { data, siteId } = useStore();
  const q = useQuery();
  const [show, setShow] = useState<Show>("aktiv");
  const [employment, setEmployment] = useState("");
  const [company, setCompany] = useState("");
  const [term, setTerm] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "no", dir: 1 });
  const [creating, setCreating] = useState(false);
  const openId = q.get("person");
  const own = data.workspace.name;
  const companyOf = (p: Person) => p.company || own;
  const companies = [...new Set(data.people.map(companyOf))].sort((a, b) => (a === own ? -1 : b === own ? 1 : a.localeCompare(b, "de")));
  const t = term.trim().toLowerCase();

  const rows = useMemo(() => {
    const list = data.people.filter(
      (p) =>
        (show === "alle" || (show === "aktiv") === p.active) &&
        (!employment || p.employment === employment) &&
        (!company || companyOf(p) === company) &&
        (!t || [p.name, p.personnelNo, p.role, p.trade, p.company, p.email, p.phone, p.city, ...(p.qualifications ?? [])].join(" ").toLowerCase().includes(t))
    );
    const val = (p: Person): string | number =>
      sort.key === "no" ? (p.personnelNo ?? "zzz").padStart(8, "0") : sort.key === "name" ? `${nameParts(p).last} ${nameParts(p).first}`.toLowerCase() : sort.key === "role" ? p.role.toLowerCase() : sort.key === "company" ? companyOf(p).toLowerCase() : sort.key === "employment" ? EMPLOYMENTS.indexOf(p.employment ?? "vollzeit") : p.entryDate || "9999";
    return list.sort((a, b) => {
      const x = val(a);
      const y = val(b);
      return (x < y ? -1 : x > y ? 1 : 0) * sort.dir;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.people, show, employment, company, t, sort]);

  const exportCsv = () => {
    const head = ["Pers.-Nr.", "Vorname", "Nachname", "Funktion", "Gewerk", "Firma", "Beschäftigung", "Wochenstunden", "Eintritt", "Austritt", "Geburtsdatum", "SV-Nr.", "Telefon", "E-Mail", "Straße", "PLZ", "Ort", "Qualifikationen", "Führerschein", "Aktiv"];
    const lines = rows.map((p) => [p.personnelNo ?? "", nameParts(p).first, nameParts(p).last, p.role, p.trade ?? "", companyOf(p), EMPLOYMENT[p.employment ?? "vollzeit"], p.weeklyHours ? fmtNum(p.weeklyHours) : "", fmt(p.entryDate || undefined), fmt(p.exitDate || undefined), fmt(p.birthDate || undefined), p.svNo ?? "", p.phone, p.email ?? "", p.street ?? "", p.zip ?? "", p.city ?? "", (p.qualifications ?? []).join(", "), p.licenses ?? "", p.active ? "ja" : "nein"]);
    const csv = "﻿" + [head, ...lines].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\r\n");
    downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), `Mitarbeiter ${fmt(today())}.csv`);
  };

  const t0 = today();
  const whereToday = (id: string) => data.entries.find((e) => e.rowId === id && !e.symbol && inRange(t0, e.start, e.end));
  const awayToday = (id: string) => data.absences.find((a) => a.personId === id && inRange(t0, a.start, a.end));

  return (
    <div className="page">
      <PageHead
        title="Stammdaten"
        sub={`Mitarbeiter · ${data.people.filter((p) => p.active).length} aktiv${siteId ? " · Baustellenauswahl gilt hier nicht" : ""}`}
        actions={
          <>
            <Button variant="secondary" leftIcon={<Download size={15} />} onClick={exportCsv} disabled={!rows.length}>
              Export (CSV)
            </Button>
            <Button leftIcon={<Plus size={15} />} onClick={() => setCreating(true)}>
              Mitarbeiter anlegen
            </Button>
          </>
        }
      />
      <div className="toolbar">
        <Seg<Show>
          label="Status"
          value={show}
          onChange={setShow}
          options={[
            { value: "aktiv", label: "Aktiv" },
            { value: "inaktiv", label: "Inaktiv" },
            { value: "alle", label: "Alle" }
          ]}
        />
        <Select value={employment} onChange={(e) => setEmployment(e.target.value)} aria-label="Beschäftigung" className="filter-select">
          <option value="">Alle Beschäftigungsarten</option>
          {EMPLOYMENTS.map((k) => (
            <option key={k} value={k}>
              {EMPLOYMENT[k]}
            </option>
          ))}
        </Select>
        <Select value={company} onChange={(e) => setCompany(e.target.value)} aria-label="Firma" className="filter-select">
          <option value="">Alle Firmen</option>
          {companies.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        <label className="search">
          <Search size={14} />
          <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Name, Pers.-Nr., Qualifikation" aria-label="Mitarbeiter durchsuchen" />
        </label>
        <span className="count">{rows.length} Mitarbeiter</span>
      </div>
      <section className="panel">
        {rows.length ? (
          <div className="table-scroll">
            <table className="ui-table">
              <thead>
                <tr>
                  <SortHead k="no" sort={sort} onSort={setSort}>
                    Pers.-Nr.
                  </SortHead>
                  <SortHead k="name" sort={sort} onSort={setSort}>
                    Name
                  </SortHead>
                  <SortHead k="role" sort={sort} onSort={setSort}>
                    Funktion
                  </SortHead>
                  <SortHead k="company" sort={sort} onSort={setSort}>
                    Firma
                  </SortHead>
                  <SortHead k="employment" sort={sort} onSort={setSort}>
                    Beschäftigung
                  </SortHead>
                  <SortHead k="entry" sort={sort} onSort={setSort}>
                    Eintritt
                  </SortHead>
                  <th className="ui-table-head">Telefon</th>
                  <th className="ui-table-head">Heute</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => {
                  const job = whereToday(p.id);
                  const away = awayToday(p.id);
                  return (
                    <tr key={p.id} className={cn("ui-table-row clickable", !p.active && "done", openId === p.id && "selected")} onClick={() => q.set({ person: p.id })}>
                      <td className="ui-table-cell mono">{p.personnelNo || <span className="muted">–</span>}</td>
                      <td className="ui-table-cell">
                        <span className="who">
                          <Avatar id={p.id} size={24} />
                          <span className="point-cell">
                            <strong>{p.name}</strong>
                            <small>{p.trade || p.email || ""}</small>
                          </span>
                        </span>
                      </td>
                      <td className="ui-table-cell">{p.role || "–"}</td>
                      <td className="ui-table-cell muted">{companyOf(p)}</td>
                      <td className="ui-table-cell">
                        {EMPLOYMENT[p.employment ?? "vollzeit"]}
                        {p.weeklyHours ? <small className="muted"> · {fmtNum(p.weeklyHours)} h</small> : null}
                      </td>
                      <td className="ui-table-cell nowrap">{fmt(p.entryDate || undefined)}</td>
                      <td className="ui-table-cell nowrap">{p.phone ? <a href={`tel:${p.phone.replace(/\s/g, "")}`} onClick={(e) => e.stopPropagation()}>{p.phone}</a> : <span className="muted">–</span>}</td>
                      <td className="ui-table-cell">{!p.active ? <span className="muted">inaktiv</span> : away ? <StatusBadge tone="neutral">Abwesend</StatusBadge> : job ? <span className="muted nowrap">{siteName(data, job.siteId)}</span> : <span className="muted">nicht eingeplant</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="panel-body">
            <Empty inline icon={<UserRound size={26} />} title="Keine Mitarbeiter für diesen Filter" text="Status, Firma oder Suche anpassen." />
          </div>
        )}
      </section>
      {creating && <NewPerson onClose={() => setCreating(false)} onCreated={(id) => (setCreating(false), q.set({ person: id }))} />}
      {openId && <PersonPanel id={openId} onClose={() => q.set({ person: null })} />}
    </div>
  );
}

function NewPerson({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const { data, save, notify } = useStore();
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [no, setNo] = useState(() => nextNo(data.people));
  const [role, setRole] = useState("Monteur");
  const [employment, setEmployment] = useState<Employment>("vollzeit");
  const [company, setCompany] = useState("");
  const [entry, setEntry] = useState(today());
  const [tried, setTried] = useState(false);
  const external = employment === "leiharbeiter" || employment === "subunternehmer";
  const errs = {
    name: !first.trim() || !last.trim() ? "Vor- und Nachname eingeben" : "",
    no: no.trim() && data.people.some((p) => p.personnelNo === no.trim()) ? "Personalnummer ist schon vergeben" : "",
    company: external && !company.trim() ? "Firma des Leiharbeiters / Subunternehmers" : ""
  };
  const submit = () => {
    setTried(true);
    if (Object.values(errs).some(Boolean)) return;
    const id = uid();
    save("people", { id, name: `${first.trim()} ${last.trim()}`, firstName: first.trim(), lastName: last.trim(), personnelNo: no.trim(), role, lead: LEAD_POSITIONS.includes(role), phone: "", active: true, employment, company: external ? company.trim() : "", entryDate: entry, weeklyHours: employment === "teilzeit" ? 20 : employment === "subunternehmer" ? undefined : 38.5, qualifications: [] });
    notify(`${first.trim()} ${last.trim()} angelegt`);
    onCreated(id);
  };
  const e = (k: keyof typeof errs) => (tried ? errs[k] : "");
  return (
    <Modal
      title="Mitarbeiter anlegen"
      description="Weitere Angaben danach im Stammblatt"
      onClose={onClose}
      onSubmit={submit}
      footer={
        <>
          <span className="grow" />
          <Button type="button" variant="secondary" onClick={onClose}>
            Abbrechen
          </Button>
          <Button type="submit">Anlegen</Button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Vorname" error={e("name")}>
          <Input value={first} onChange={(ev) => setFirst(ev.target.value)} autoFocus />
        </Field>
        <Field label="Nachname">
          <Input value={last} onChange={(ev) => setLast(ev.target.value)} />
        </Field>
        <Field label="Personalnummer" error={e("no")}>
          <Input value={no} onChange={(ev) => setNo(ev.target.value)} className="mono" />
        </Field>
        <Field label="Funktion">
          <PositionSelect value={role} onChange={setRole} />
        </Field>
        <Field label="Beschäftigung">
          <Select value={employment} onChange={(ev) => setEmployment(ev.target.value as Employment)}>
            {EMPLOYMENTS.map((k) => (
              <option key={k} value={k}>
                {EMPLOYMENT[k]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Eintritt">
          <Input type="date" value={entry} onChange={(ev) => setEntry(ev.target.value)} />
        </Field>
        {external && (
          <Field label="Firma" className="span-2" error={e("company")}>
            <Input value={company} onChange={(ev) => setCompany(ev.target.value)} placeholder="z. B. Elektro Schmid OG" />
          </Field>
        )}
      </div>
    </Modal>
  );
}


function PersonPanel({ id, onClose }: { id: string; onClose: () => void }) {
  const { data, save, remove, notify, restore } = useStore();
  const ask = useConfirm();
  const [qual, setQual] = useState("");
  const p = data.people.find((x) => x.id === id);
  if (!p) return null;
  const set = (patch: Partial<Person>) => save("people", { ...p, ...patch });
  const { first, last } = nameParts(p);
  const setName = (f: string, l: string) => {
    if (!f || !l) return notify("Vor- und Nachname dürfen nicht leer sein", { tone: "error" });
    set({ firstName: f, lastName: l, name: `${f} ${l}` });
  };
  const setNo = (v: string) => {
    if (v && data.people.some((x) => x.id !== p.id && x.personnelNo === v)) return notify(`Personalnummer ${v} ist schon vergeben`, { tone: "error" });
    set({ personnelNo: v });
  };
  const addQual = () => {
    const v = qual.trim();
    if (!v || (p.qualifications ?? []).includes(v)) return setQual("");
    set({ qualifications: [...(p.qualifications ?? []), v] });
    setQual("");
  };
  const drop = async () => {
    if (p.id === data.meId) return notify("Der angemeldete Benutzer kann nicht gelöscht werden.", { tone: "error" });
    if (!(await ask({ title: `${p.name} löschen?`, text: "Zuweisungen werden entfernt, Einsätze im Planner gelöscht. Ausgeschiedene besser auf „inaktiv“ stellen – die Stammdaten bleiben dann erhalten." }))) return;
    const before = data;
    remove("people", p.id);
    onClose();
    notify(`${p.name} gelöscht`, { undo: () => restore(before) });
  };
  const t0 = today();
  const next = data.entries
    .filter((e) => e.rowId === p.id && !e.symbol && e.end >= t0)
    .sort((a, b) => a.start.localeCompare(b.start))
    .slice(0, 4);
  const sv = (p.svNo ?? "").replace(/\s/g, "");
  return (
    <SidePanel
      title={p.name}
      sub={[p.personnelNo && `Pers.-Nr. ${p.personnelNo}`, p.role, p.company || data.workspace.name].filter(Boolean).join(" · ")}
      onClose={onClose}
      footer={
        <>
          <Button variant="destructive" size="sm" leftIcon={<Trash2 size={14} />} onClick={() => void drop()}>
            Löschen
          </Button>
          <span className="grow" />
          <Button size="sm" onClick={onClose}>
            Fertig
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <h3 className="span-2 form-section">Person</h3>
        <Field label="Vorname">
          <BlurInput value={first} onSave={(v) => setName(v, last)} />
        </Field>
        <Field label="Nachname">
          <BlurInput value={last} onSave={(v) => setName(first, v)} />
        </Field>
        <Field label="Geburtsdatum">
          <Input type="date" value={p.birthDate ?? ""} onChange={(e) => set({ birthDate: e.target.value })} />
        </Field>
        <Field label="SV-Nummer" hint={sv && !svValid(sv) ? "Prüfziffer passt nicht – bitte kontrollieren" : "10 Stellen, z. B. 1235 140379"}>
          <BlurInput value={p.svNo ?? ""} className="mono" inputMode="numeric" onSave={(v) => set({ svNo: v })} />
        </Field>

        <h3 className="span-2 form-section">Kontakt</h3>
        <Field label="Telefon">
          <BlurInput value={p.phone} type="tel" onSave={(v) => set({ phone: v })} />
        </Field>
        <Field label="E-Mail" hint={p.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email) ? "E-Mail-Adresse prüfen" : undefined}>
          <BlurInput value={p.email ?? ""} type="email" onSave={(v) => set({ email: v })} />
        </Field>
        <Field label="Straße" className="span-2">
          <BlurInput value={p.street ?? ""} onSave={(v) => set({ street: v })} />
        </Field>
        <Field label="PLZ">
          <BlurInput value={p.zip ?? ""} inputMode="numeric" onSave={(v) => set({ zip: v })} />
        </Field>
        <Field label="Ort">
          <BlurInput value={p.city ?? ""} onSave={(v) => set({ city: v })} />
        </Field>
        <Field label="Notfallkontakt">
          <BlurInput value={p.emergencyName ?? ""} placeholder="Name" onSave={(v) => set({ emergencyName: v })} />
        </Field>
        <Field label="Notfall-Telefon">
          <BlurInput value={p.emergencyPhone ?? ""} type="tel" onSave={(v) => set({ emergencyPhone: v })} />
        </Field>

        <h3 className="span-2 form-section">Beschäftigung</h3>
        <Field label="Personalnummer">
          <BlurInput value={p.personnelNo ?? ""} className="mono" onSave={setNo} />
        </Field>
        <Field label="Firma" hint="Leer = eigener Betrieb">
          <BlurInput value={p.company ?? ""} placeholder={data.workspace.name} onSave={(v) => set({ company: v })} />
        </Field>
        <Field label="Funktion" hint={LEAD_POSITIONS.includes(p.role) ? "Leitungsfunktion – darf Berichte freigeben" : undefined}>
          <PositionSelect value={p.role} onChange={(v) => set({ role: v, ...(LEAD_POSITIONS.includes(v) ? { lead: true } : {}) })} />
        </Field>
        <Field label="Gewerk">
          <BlurInput value={p.trade ?? ""} placeholder="z. B. Installateur, Elektro" onSave={(v) => set({ trade: v })} />
        </Field>
        <Field label="Beschäftigung">
          <Select value={p.employment ?? "vollzeit"} onChange={(e) => set({ employment: e.target.value as Employment })}>
            {EMPLOYMENTS.map((k) => (
              <option key={k} value={k}>
                {EMPLOYMENT[k]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Wochenstunden">
          <BlurInput
            value={p.weeklyHours != null ? String(p.weeklyHours).replace(".", ",") : ""}
            inputMode="decimal"
            onSave={(v) => {
              if (!v) return set({ weeklyHours: undefined });
              const n = parseNum(v);
              if (!Number.isFinite(n) || n < 0 || n > 60) return notify("Wochenstunden zwischen 0 und 60", { tone: "error" });
              set({ weeklyHours: n });
            }}
          />
        </Field>
        <Field label="Eintritt">
          <Input type="date" value={p.entryDate ?? ""} onChange={(e) => set({ entryDate: e.target.value })} />
        </Field>
        <Field label="Austritt" error={p.exitDate && p.entryDate && p.exitDate < p.entryDate ? "Austritt liegt vor dem Eintritt" : ""}>
          <Input type="date" value={p.exitDate ?? ""} min={p.entryDate || undefined} onChange={(e) => set({ exitDate: e.target.value })} />
        </Field>
        <label className="check-row span-2">
          <Switch checked={p.active} disabled={p.id === data.meId} onChange={(e) => set({ active: e.target.checked })} /> {p.active ? "Aktiv – erscheint im Planner und bei Zuweisungen" : "Inaktiv – ausgeblendet, Daten bleiben erhalten"}
        </label>

        <label className="check-row span-2">
          <Switch checked={!!p.lead} onChange={(e) => set({ lead: e.target.checked })} /> Darf Berichte freigeben (Team- oder Bauleitung)
        </label>

        <h3 className="span-2 form-section">Qualifikationen</h3>
        <div className="span-2 tags">
          {(p.qualifications ?? []).map((x) => (
            <span key={x} className="tag">
              {x}
              <IconButton label={`${x} entfernen`} size="sm" variant="ghost" onClick={() => set({ qualifications: (p.qualifications ?? []).filter((y) => y !== x) })}>
                <X size={11} />
              </IconButton>
            </span>
          ))}
          <form
            className="tag-add"
            onSubmit={(e) => {
              e.preventDefault();
              addQual();
            }}
          >
            <Input value={qual} onChange={(e) => setQual(e.target.value)} placeholder="z. B. Ersthelfer, Staplerschein" aria-label="Qualifikation hinzufügen" />
            <Button type="submit" size="sm" variant="secondary" disabled={!qual.trim()}>
              Hinzufügen
            </Button>
          </form>
        </div>
        <Field label="Führerscheinklassen">
          <BlurInput value={p.licenses ?? ""} placeholder="z. B. B, BE, C" onSave={(v) => set({ licenses: v })} />
        </Field>
        <div className="field">
          <span>Nächste Einsätze</span>
          {next.length ? (
            <ul className="plain-list">
              {next.map((e) => (
                <li key={e.id}>
                  {siteName(data, e.siteId)} · {fmt(e.start)}
                  {e.end !== e.start && ` – ${fmt(e.end)}`}
                </li>
              ))}
            </ul>
          ) : (
            <small className="muted">Nicht eingeplant</small>
          )}
        </div>
        <Field label="Notiz" className="span-2">
          <BlurTextarea value={p.note ?? ""} rows={3} onSave={(v) => set({ note: v })} />
        </Field>
        <p className="span-2 muted stamp">Personenbezogene Daten – nur für die Personalverwaltung. Gespeichert auf diesem Gerät{personName(data, data.meId) ? `, bearbeitet als ${personName(data, data.meId)}` : ""}.</p>
      </div>
    </SidePanel>
  );
}
