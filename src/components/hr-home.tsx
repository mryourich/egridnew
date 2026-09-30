"use client";

import { CalendarOff, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import { addDays, diffDays, fmt, fmtShort, inRange, today } from "@/lib/date";
import * as L from "@/lib/labels";
import { currentUser, roleLabel, roleOf, useStore, type Role } from "@/lib/store";
import { useEditor } from "./shell";
import { Avatar, Badge, Card, Empty } from "./ui";

/** HR home: people by rights, who is absent, what expires – plus a first-steps guide. */
export function HrHome() {
  const { data } = useStore();
  const openEditor = useEditor();
  const me = currentUser(data);
  const t = today();
  const people = data.employees.filter((e) => e.active);
  const byRole = (r: Role) => people.filter((e) => roleOf(e) === r);
  const absentToday = data.absences.filter((a) => inRange(t, a.start, a.end));
  const upcoming = data.absences.filter((a) => a.start > t && a.start <= addDays(t, 30)).sort((a, b) => a.start.localeCompare(b.start));
  const expiring = people
    .flatMap((e) => e.qualifications.filter((q) => q.validUntil && q.validUntil <= addDays(t, 60)).map((q) => ({ e, q })))
    .sort((a, b) => a.q.validUntil.localeCompare(b.q.validUntil));
  const name = (id: string) => data.employees.find((e) => e.id === id)?.name ?? "–";
  const fresh = people.length < 4;

  return (
    <div className="page">
      <header className="hero">
        <div>
          <h1>Personal</h1>
          <p>
            {me?.name} · {people.length} Mitarbeiter · {fmt(t)}
          </p>
        </div>
        <div className="page-actions">
          <button className="btn" type="button" onClick={() => openEditor({ kind: "absence" })}>
            <CalendarOff size={15} /> Abwesenheit
          </button>
          <button className="btn btn-primary" type="button" onClick={() => openEditor({ kind: "employee" })}>
            <UserPlus size={15} /> Mitarbeiter anlegen
          </button>
        </div>
      </header>

      {fresh && (
        <section className="card steps">
          <h2>So startest du</h2>
          <ol>
            <li className={byRole("pl").length ? "done" : ""}>
              <strong>Mitarbeiter anlegen und Rechte vergeben</strong> – Projektleitung, Bauleitung und Monteure.{" "}
              <button className="link-btn" type="button" onClick={() => openEditor({ kind: "employee" })}>
                Jetzt anlegen
              </button>
            </li>
            <li className={data.absences.length ? "done" : ""}>
              <strong>Urlaube und Krankenstände eintragen</strong> – sie erscheinen sofort in allen Plänen.
            </li>
            <li>
              <strong>Oben rechts auf deinen Namen klicken</strong> und als Projektleiter anmelden: Projekt anlegen, Bauleitung wählen, Leute einplanen.
            </li>
            <li>
              <strong>Als Bauleiter</strong> Aufgaben im Plan verteilen, <strong>als Monteur</strong> „Heute zu tun“ abhaken.
            </li>
          </ol>
        </section>
      )}

      <div className="role-tiles">
        {(["pl", "bl", "monteur", "hr"] as Role[]).map((r) => (
          <Link key={r} href="/ressourcen" className="role-tile">
            <span>{roleLabel[r]}</span>
            <strong>{byRole(r).length}</strong>
            <span className="avatar-stack">
              {byRole(r)
                .slice(0, 6)
                .map((e) => (
                  <Avatar key={e.id} name={e.name} size={22} />
                ))}
            </span>
          </Link>
        ))}
      </div>

      <div className="grid-2">
        <Card title={`Heute abwesend (${absentToday.length})`}>
          {absentToday.length ? (
            <ul className="compact-list">
              {absentToday.map((a) => (
                <li key={a.id}>
                  <button type="button" onClick={() => openEditor({ kind: "absence", item: a })}>
                    <Badge tone={L.absenceType[a.type].tone}>{L.absenceType[a.type].label}</Badge>
                    <strong>{name(a.employeeId)}</strong>
                    <span className="muted">bis {fmtShort(a.end)}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Heute sind alle da.</Empty>
          )}
        </Card>
        <Card title="Nächste Abwesenheiten (30 Tage)">
          {upcoming.length ? (
            <ul className="compact-list">
              {upcoming.map((a) => (
                <li key={a.id}>
                  <button type="button" onClick={() => openEditor({ kind: "absence", item: a })}>
                    <Badge tone={L.absenceType[a.type].tone}>{L.absenceType[a.type].label}</Badge>
                    <strong>{name(a.employeeId)}</strong>
                    <span className="muted">
                      {fmtShort(a.start)} – {fmtShort(a.end)} · in {diffDays(t, a.start)} Tagen
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Keine geplanten Abwesenheiten.</Empty>
          )}
        </Card>
        <Card title="Ablaufende Qualifikationen (60 Tage)">
          {expiring.length ? (
            <ul className="compact-list">
              {expiring.map(({ e, q }) => (
                <li key={e.id + q.name}>
                  <button type="button" onClick={() => openEditor({ kind: "employee", item: e })}>
                    <Badge tone={q.validUntil < t ? "red" : "amber"}>{q.validUntil < t ? "abgelaufen" : fmtShort(q.validUntil)}</Badge>
                    <strong>{q.name}</strong>
                    <span className="muted">{e.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Nichts läuft in den nächsten 60 Tagen ab.</Empty>
          )}
        </Card>
        <Card title="Alle Mitarbeiter">
          <p className="muted small">
            <Users size={13} /> Mitarbeiter, Fahrzeuge und Abwesenheiten verwaltest du unter <Link href="/ressourcen">Personal</Link>.
          </p>
        </Card>
      </div>
    </div>
  );
}
