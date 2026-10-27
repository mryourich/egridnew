"use client";

import { ExternalLink, FileText } from "lucide-react";
import { fmtWhen } from "@/core/format";
import { now, personName, uid, useStore } from "@/core/store";
import type { Project, ReportKind } from "@/core/types";
import { Button, PageHead } from "@/core/ui";
import { Dailies } from "./dailies";
import { access } from "./model";

export const REPORTS: Record<ReportKind, { label: string; text: string; path: string }> = {
  status: { label: "Statusbericht", text: "Fortschritt nach Bereichen, offene Punkte, Mängel und Termine – für Bauherr und Geschäftsführung.", path: "status" },
  defects: { label: "Mängelbericht", text: "Alle offenen Mängel mit Ort, Frist, Zuständigkeit und Fotos.", path: "maengel" },
  points: { label: "Offene-Punkte-Liste", text: "Alle offenen Punkte nach Bereichen – zum Abarbeiten oder für die Begehung.", path: "punkte" },
  photos: { label: "Fotobericht", text: "Alle Fotos des Projekts mit Bereich, Datum und Beschreibung. Einzelne Bereiche wählst du unter „Fotos“.", path: "fotos" }
};

/** Printable reports – "PDF" via the browser's print dialog. */
export function Reports({ project: p }: { project: Project }) {
  const { data, save } = useStore();
  const { work } = access(data, p);
  const made = data.reports.filter((r) => r.projectId === p.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const make = (kind: ReportKind) => {
    // the photo report from here shows every photo (a selection is made under "Fotos")
    if (kind === "photos") window.localStorage.removeItem("vysner:fotobericht");
    window.open(`/druck/${REPORTS[kind].path}/${p.id}`, "_blank", "noopener");
    if (work) save("reports", { id: uid(), projectId: p.id, kind, name: `${REPORTS[kind].label} ${p.name}`, target: "", status: "ready", createdBy: data.meId, createdAt: now() }, `${REPORTS[kind].label} erstellt`);
  };
  return (
    <div className="page narrow">
      <PageHead kicker="Berichte" title="Berichte" sub="Tagesberichte schreiben, Berichte als PDF erstellen – öffnet sich als Druckansicht, dort „Als PDF speichern“ wählen." />
      <Dailies project={p} />
      <div className="panel">
        <header className="panel-head">
          <h2>PDF-Berichte</h2>
        </header>
        <ul className="report-types">
          {(Object.keys(REPORTS) as ReportKind[]).map((k) => (
            <li key={k}>
              <FileText size={18} />
              <span>
                <strong>{REPORTS[k].label}</strong>
                <small>{REPORTS[k].text}</small>
              </span>
              <Button onClick={() => make(k)}>Erstellen</Button>
            </li>
          ))}
        </ul>
      </div>
      <section className="panel">
        <header className="panel-head">
          <h2>Erstellt</h2>
        </header>
        {made.length === 0 ? (
          <p className="panel-empty">Noch keine Berichte erstellt.</p>
        ) : (
          <table className="table">
            <tbody>
              {made.map((r) => (
                <tr key={r.id}>
                  <td>
                    <strong>{REPORTS[r.kind].label}</strong>
                  </td>
                  <td className="muted">
                    {personName(data, r.createdBy)} · {fmtWhen(r.createdAt)}
                  </td>
                  <td className="w-menu">
                    <a className="b-icon" href={`/druck/${REPORTS[r.kind].path}/${p.id}`} target="_blank" rel="noreferrer" title="Neu öffnen (aktueller Stand)">
                      <ExternalLink size={15} />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
