"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge, Dot, Empty, PageHeader, Progress } from "@/components/ui";
import { addDays, fmt, inRange, today } from "@/lib/date";
import { siteProgress } from "@/lib/site";
import { employeeName, useStore } from "@/lib/store";

export default function TeamGridPage() {
  const { data } = useStore();
  const router = useRouter();
  const t = today();
  const sites = data.projects.filter((p) => p.status === "aktiv" || p.status === "planung");
  const siteIds = new Set(sites.map((p) => p.id));

  const leaves = data.siteNodes.filter((n) => siteIds.has(n.projectId) && !data.siteNodes.some((k) => k.parentId === n.id));
  const openPoints = leaves.filter((n) => n.status !== "erledigt");
  const overdue = openPoints.filter((n) => n.due && n.due < t);
  const openIssues = data.issues.filter((i) => siteIds.has(i.projectId) && i.status !== "erledigt");
  const weekPhotos = data.photos.filter((p) => siteIds.has(p.projectId) && p.takenAt.slice(0, 10) >= addDays(t, -6));
  const active = sites.filter((p) => p.status === "aktiv");
  const missingReport = active.filter((p) => !data.reports.some((r) => r.projectId === p.id && r.date === t));

  const cues = [
    { label: "Aktive Baustellen", value: active.length, tone: "blue" },
    { label: "Offene Punkte", value: openPoints.length, tone: "blue" },
    { label: "Überfällige Punkte", value: overdue.length, tone: overdue.length ? "red" : "green" },
    { label: "Offene Mängel", value: openIssues.length, tone: openIssues.length ? "amber" : "green", href: "/meldungen" },
    { label: "Fotos (7 Tage)", value: weekPhotos.length, tone: "cyan" },
    { label: "Tagesbericht fehlt heute", value: missingReport.length, tone: missingReport.length ? "amber" : "green" }
  ];

  return (
    <div className="page">
      <PageHeader title="Baustellen" subtitle="Bauleitung · Struktur, Fotodokumentation, Mängel und Tagesberichte je Baustelle" />

      <div className="cues">
        {cues.map((c) =>
          c.href ? (
            <Link key={c.label} href={c.href} className={`cue cue-${c.tone}`}>
              <span>{c.label}</span>
              <strong>{c.value}</strong>
            </Link>
          ) : (
            <div key={c.label} className={`cue cue-${c.tone}`}>
              <span>{c.label}</span>
              <strong>{c.value}</strong>
            </div>
          )
        )}
      </div>

      {sites.length === 0 ? (
        <Empty>Keine aktiven Baustellen.</Empty>
      ) : (
        <div className="card card-flush table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Nr.</th>
                <th>Baustelle</th>
                <th>Ort</th>
                <th>Bauleitung</th>
                <th className="w-progress">Fortschritt</th>
                <th className="num">Offene Punkte</th>
                <th className="num">Mängel</th>
                <th className="num">Heute vor Ort</th>
                <th>Letzter Tagesbericht</th>
              </tr>
            </thead>
            <tbody>
              {sites.map((p) => {
                const progress = siteProgress(data, p.id);
                const points = openPoints.filter((n) => n.projectId === p.id).length;
                const issues = openIssues.filter((i) => i.projectId === p.id).length;
                const onSite = data.assignments.filter((a) => a.projectId === p.id && a.resourceType === "employee" && inRange(t, a.start, a.end)).length;
                const last = data.reports.filter((r) => r.projectId === p.id).sort((a, b) => b.date.localeCompare(a.date))[0];
                return (
                  <tr key={p.id} className="clickable" onClick={() => router.push(`/teamgrid/${p.id}`)}>
                    <td>
                      <Link href={`/teamgrid/${p.id}`} className="link" onClick={(e) => e.stopPropagation()}>
                        {p.code}
                      </Link>
                    </td>
                    <td>
                      <span className="cell-person">
                        <Dot color={p.color} /> <strong>{p.name}</strong>
                      </span>
                    </td>
                    <td>{p.location}</td>
                    <td>{p.managerId ? employeeName(data, p.managerId) : "–"}</td>
                    <td>
                      <span className="cell-progress">
                        <Progress value={progress} color={p.color} /> {progress} %
                      </span>
                    </td>
                    <td className="num">{points}</td>
                    <td className="num">{issues ? <Badge tone="amber">{issues}</Badge> : "–"}</td>
                    <td className="num">{onSite || "–"}</td>
                    <td className={last?.date === t ? "" : "muted"}>{last ? fmt(last.date) : "noch keiner"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
