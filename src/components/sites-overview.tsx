"use client";

import { Archive, Plus } from "lucide-react";
import Link from "next/link";
import { isManager, myProjects, useStore } from "@/lib/store";
import { ProjectRow } from "./home";
import { useEditor } from "./shell";
import { Badge, Empty } from "./ui";

/** Site management home: one card per site with what matters today. */
export function SitesOverview() {
  const { data } = useStore();
  const openEditor = useEditor();
  const manager = isManager(data);
  const sites = myProjects(data);
  const done = myProjects(data, data.currentUserId, true).filter((p) => p.status === "abgeschlossen");
  const fresh = manager && (sites.length === 0 || data.employees.length < 3);

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Projekte</h1>
          <p>
            {sites.length} {sites.length === 1 ? "Projekt" : "Projekte"}
          </p>
        </div>
        {manager && (
          <div className="page-actions">
            <button className="btn btn-primary" type="button" onClick={() => openEditor({ kind: "project" })}>
              <Plus size={15} /> Neues Projekt
            </button>
          </div>
        )}
      </header>
      {fresh && (
        <section className="card steps">
          <h2>So startest du</h2>
          <ol>
            <li className={data.employees.length > 1 ? "done" : ""}>
              <strong>Mitarbeiter anlegen</strong> – unter <Link href="/team">Mitarbeiter verwalten</Link> (Menü unten links), mit Profilbild und Rechten.
            </li>
            <li className={sites.length ? "done" : ""}>
              <strong>Projekt anlegen</strong> – es ist privat, bis du jemanden einlädst.{" "}
              <button className="link-btn" type="button" onClick={() => openEditor({ kind: "project" })}>
                Jetzt anlegen
              </button>
            </li>
            <li>
              <strong>Leute einladen</strong> – im Projekt unter „Team“ einfach auf die Profilbilder klicken.
            </li>
            <li>
              <strong>Plan und Struktur füllen</strong> – Aufgaben per Rechtsklick, Bereiche und Punkte zum Abhaken. Oben rechts auf deinen Namen klicken und als Monteur ansehen.
            </li>
          </ol>
        </section>
      )}
      {sites.length === 0 ? (
        !manager && <Empty>Du bist noch in keinem Projekt. Sobald dich jemand einlädt, erscheint es hier.</Empty>
      ) : (
        <ul className="rows box plist">
          {sites.map((p) => (
            <li key={p.id}>
              <ProjectRow data={data} project={p} />
            </li>
          ))}
        </ul>
      )}
      {manager && done.length > 0 && (
        <details className="done-sites">
          <summary>
            <Archive size={14} /> Abgeschlossene Projekte ({done.length})
          </summary>
          <ul className="compact-list">
            {done.map((p) => (
              <li key={p.id}>
                <Link href={`/projekte/${p.id}`}>
                  <Badge>{p.code}</Badge>
                  <strong>{p.name}</strong>
                  <span className="muted">{p.location}</span>
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
