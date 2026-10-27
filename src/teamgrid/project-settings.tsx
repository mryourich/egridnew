"use client";

import { Archive, Pencil, Trash2, UserPlus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { fmtDate, fmtMoney, PROJECT_STATUS } from "@/core/format";
import { byRole, ROLLE_LABEL, teamOf } from "@/core/roles";
import { personName, useStore } from "@/core/store";
import type { Project } from "@/core/types";
import { Avatar, Button, IconButton, PageHead, Toggle } from "@/core/ui";
import { access } from "./model";
import { ProjectForm } from "./projects";

/** Project data, team (who sees the project) and rules. */
export function ProjectSettings({ project: p }: { project: Project }) {
  const { data, save, remove, notify } = useStore();
  const router = useRouter();
  const { manage } = access(data, p);
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState("");
  const team = teamOf(p);
  const candidates = data.people.filter((x) => x.active && !team.includes(x.id)).sort(byRole);
  const role = (id: string) => (id === p.managerId ? "Projektleitung" : id === p.createdBy ? "Angelegt" : "Eingeladen");

  const invite = (id: string) => {
    if (!id) return;
    save("projects", { ...p, memberIds: [...p.memberIds, id] }, `${personName(data, id)} eingeladen`);
    notify(`${personName(data, id)} sieht das Projekt jetzt`);
    setAdding("");
  };

  return (
    <div className="page narrow">
      <PageHead kicker="Projekt" title="Projekt-Einstellungen" sub={p.name} />

      <section className="panel">
        <header className="panel-head">
          <h2>Projektdaten</h2>
          {manage && (
            <Button size="sm" icon={<Pencil size={14} />} onClick={() => setEditing(true)}>
              Bearbeiten
            </Button>
          )}
        </header>
        <dl className="facts">
          <dt>Projektnummer</dt>
          <dd>{p.number || "–"}</dd>
          <dt>Status</dt>
          <dd>{PROJECT_STATUS[p.status].label}</dd>
          <dt>Auftraggeber</dt>
          <dd>{p.client || "–"}</dd>
          <dt>Ort</dt>
          <dd>{p.location || "–"}</dd>
          <dt>Zeitraum</dt>
          <dd>{[fmtDate(p.start), fmtDate(p.due)].filter(Boolean).join(" – ") || "–"}</dd>
          <dt>Projektleitung</dt>
          <dd>{personName(data, p.managerId) || "–"}</dd>
          <dt>Budget</dt>
          <dd>{fmtMoney(p.budget) || "–"}</dd>
          {p.description && (
            <>
              <dt>Beschreibung</dt>
              <dd>{p.description}</dd>
            </>
          )}
        </dl>
      </section>

      <section className="panel">
        <header className="panel-head">
          <h2>Projektteam</h2>
          <span className="muted">Nur diese Leute (und ihre Vorgesetzten) sehen das Projekt.</span>
        </header>
        <ul className="list">
          {team.map((id) => {
            const x = data.people.find((y) => y.id === id);
            if (!x) return null;
            const fixed = id === p.managerId || id === p.createdBy;
            return (
              <li key={id}>
                <Avatar id={id} size={28} />
                <span>
                  <strong>{x.name}</strong>
                  <small>
                    {x.title || ROLLE_LABEL[x.rolle]} · {role(id)}
                  </small>
                </span>
                {manage && !fixed && (
                  <IconButton label="Aus dem Projekt nehmen" onClick={() => save("projects", { ...p, memberIds: p.memberIds.filter((m) => m !== id) }, `${x.name} aus dem Projekt genommen`)}>
                    <X size={15} />
                  </IconButton>
                )}
              </li>
            );
          })}
        </ul>
        {manage && candidates.length > 0 && (
          <div className="invite">
            <UserPlus size={16} />
            <select value={adding} onChange={(e) => setAdding(e.target.value)} aria-label="Person einladen">
              <option value="">Person einladen …</option>
              {candidates.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name} · {ROLLE_LABEL[x.rolle]}
                </option>
              ))}
            </select>
            <Button variant="primary" size="sm" disabled={!adding} onClick={() => invite(adding)}>
              Einladen
            </Button>
          </div>
        )}
      </section>

      <section className="panel">
        <header className="panel-head">
          <h2>Regeln</h2>
        </header>
        <div className="toggles">
          <Toggle label="Foto zum Abschließen" hint="Ein offener Punkt kann nur mit mindestens einem Foto erledigt werden." checked={p.settings.photoRequired} disabled={!manage} onChange={(v) => save("projects", { ...p, settings: { ...p.settings, photoRequired: v } })} />
          <Toggle label="Mängel schließt die Projektleitung" hint="Das Team meldet Mängel und arbeitet sie ab; als behoben setzt sie nur, wer das Projekt führt." checked={p.settings.defectApproval} disabled={!manage} onChange={(v) => save("projects", { ...p, settings: { ...p.settings, defectApproval: v } })} />
        </div>
      </section>

      {manage && (
        <section className="panel danger-zone">
          <header className="panel-head">
            <h2>Projekt abschließen</h2>
          </header>
          <div className="danger-row">
            <span>
              <strong>{p.status === "archived" ? "Wieder aktivieren" : "Archivieren"}</strong>
              <small>{p.status === "archived" ? "Das Projekt erscheint wieder in der Liste." : "Fertige Projekte wandern ins Archiv – nichts geht verloren."}</small>
            </span>
            <Button icon={<Archive size={15} />} onClick={() => (save("projects", { ...p, status: p.status === "archived" ? "active" : "archived" }, p.status === "archived" ? "Projekt reaktiviert" : "Projekt archiviert"), notify(p.status === "archived" ? "Wieder aktiv" : "Archiviert"))}>
              {p.status === "archived" ? "Aktivieren" : "Archivieren"}
            </Button>
          </div>
          <div className="danger-row">
            <span>
              <strong>Löschen</strong>
              <small>Löscht das Projekt mit allen Punkten, Mängeln, Fotos und Dokumenten – endgültig.</small>
            </span>
            <Button
              variant="danger"
              icon={<Trash2 size={15} />}
              onClick={() => {
                if (window.prompt(`Zum Löschen den Projektnamen eingeben:\n${p.name}`)?.trim() !== p.name) return;
                remove("projects", p.id);
                notify(`„${p.name}“ gelöscht`);
                router.push("/projekte");
              }}
            >
              Löschen
            </Button>
          </div>
        </section>
      )}

      {editing && <ProjectForm project={p} onClose={() => setEditing(false)} />}
    </div>
  );
}
