"use client";

import { AlertTriangle, Camera, ChevronRight, PenLine } from "lucide-react";
import Link from "next/link";
import { addDays, fmt, isWeekend, today, weekdayLong, weekdayShort } from "@/lib/date";
import { useEditor } from "@/components/shell";
import { useStore } from "@/lib/store";
import type { Project } from "@/lib/types";
import { activePeople, canPlan, dayText, me, visibleSites } from "./access";
import { Face, PageHead } from "./kit";

function hello() {
  const h = new Date().getHours();
  return h < 11 ? "Guten Morgen" : h < 18 ? "Hallo" : "Guten Abend";
}

/** The start: who does what today – and what is open for me. */
export function Today() {
  const { data, save, notify } = useStore();
  const t = today();
  const user = me(data);
  const planner = canPlan(data);
  const sites = new Set(visibleSites(data).map((p) => p.id));

  const mineOpenPoints = data.siteNodes.filter(
    (n) => n.assigneeId === user?.id && n.status !== "erledigt" && sites.has(n.projectId) && !data.siteNodes.some((k) => k.parentId === n.id)
  );
  const mineOpenIssues = data.issues.filter((i) => i.assigneeId === user?.id && i.status !== "erledigt" && sites.has(i.projectId));
  const siteName = (id: string) => data.projects.find((p) => p.id === id)?.name ?? "";

  return (
    <div className="v-page narrow">
      <PageHead title={`${hello()}, ${user?.name.split(" ")[0] ?? ""}`} sub={`${weekdayLong(t)}, ${fmt(t)}`} />

      {planner ? <TeamToday /> : <MyDay />}

      {(mineOpenPoints.length > 0 || mineOpenIssues.length > 0) && (
        <section className="v-card">
          <h2 className="v-card-title">Für dich offen</h2>
          <ul className="v-list">
            {mineOpenPoints.slice(0, 6).map((n) => (
              <li key={n.id}>
                <input
                  type="checkbox"
                  className="v-check"
                  aria-label={`${n.title} erledigt`}
                  onChange={() => {
                    save("siteNodes", { ...n, status: "erledigt" }, `„${n.title}“ erledigt`);
                    notify("Erledigt ✓");
                  }}
                />
                <Link href={`/projekte/${n.projectId}/struktur?punkt=${n.id}`} className="v-list-main">
                  <strong>{n.title}</strong>
                  <small>{siteName(n.projectId)}</small>
                </Link>
              </li>
            ))}
            {mineOpenIssues.slice(0, 6).map((i) => (
              <li key={i.id}>
                <span className="v-list-ic warn">
                  <AlertTriangle size={16} />
                </span>
                <Link href={`/projekte/${i.projectId}/maengel`} className="v-list-main">
                  <strong>{i.title}</strong>
                  <small>Mangel · {siteName(i.projectId)}</small>
                </Link>
                {i.due && <span className={`v-due ${i.due < t ? "late" : ""}`}>bis {fmt(i.due).slice(0, 6)}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/** Office and leaders: every person, one line. */
function TeamToday() {
  const { data } = useStore();
  const t = today();
  const people = activePeople(data);
  const rows = people.map((e) => ({ e, d: dayText(data, e.id, t) }));
  const free = rows.filter((r) => r.d.am.kind === "free" || r.d.pm.kind === "free");
  const away = rows.filter((r) => r.d.am.kind === "absence");
  const weekend = isWeekend(t);

  return (
    <section className="v-card">
      <div className="v-card-head">
        <h2 className="v-card-title">Wer macht was heute</h2>
        <Link href="/planung" className="v-link">
          Planung <ChevronRight size={16} />
        </Link>
      </div>
      {!weekend && (
        <p className="v-sum">
          <b>{rows.length - free.length - away.length}</b> eingeteilt · <b>{away.length}</b> abwesend ·{" "}
          <b className={free.length ? "warn" : ""}>{free.length}</b> noch frei
        </p>
      )}
      <ul className="v-list">
        {rows.map(({ e, d }) => (
          <li key={e.id}>
            <Face id={e.id} size={34} />
            <span className="v-list-main">
              <strong>{e.name}</strong>
              <small className={d.am.kind === "free" && d.pm.kind === "free" ? "is-free" : d.am.kind === "absence" ? "is-away" : ""}>{weekend ? "Wochenende" : d.text}</small>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Workers: my site today with the three things I do there, and my week. */
function MyDay() {
  const { data } = useStore();
  const openEditor = useEditor();
  const t = today();
  const user = me(data);
  if (!user) return null;
  const d = dayText(data, user.id, t);
  const halves = d.split ? [{ s: d.am, part: "Vormittag" }, { s: d.pm, part: "Nachmittag" }] : [{ s: d.am, part: "" }];
  // one box per site, with what to do there
  const boxes: { project: Project; lines: string[] }[] = [];
  for (const { s, part } of halves) {
    if (s.kind !== "job" || !s.project) continue;
    const line = [part, s.job.title].filter(Boolean).join(": ");
    const box = boxes.find((b) => b.project.id === s.project!.id);
    if (box) box.lines.push(line);
    else boxes.push({ project: s.project, lines: line ? [line] : [] });
  }
  const other = halves.find(({ s }) => s.kind === "absence" || s.kind === "holiday");
  const week: string[] = [];
  for (let day = addDays(t, 1); week.length < 4; day = addDays(day, 1)) if (!isWeekend(day)) week.push(day);

  return (
    <>
      <section className="v-card v-myday">
        <h2 className="v-card-title">Heute</h2>
        {boxes.length === 0 && <p className="v-myday-text">{other ? d.text : "Für heute ist nichts eingeteilt."}</p>}
        {boxes.map(({ project: p, lines }) => (
          <div key={p.id} className="v-myday-site">
            <Link href={`/projekte/${p.id}`} className="v-myday-name">
              <i style={{ background: p.color }} />
              {p.name}
              <ChevronRight size={16} />
            </Link>
            {lines.length > 0 && (
              <ul className="v-myday-lines">
                {lines.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            )}
            <div className="v-quick">
              <Link href={`/projekte/${p.id}/fotos`} className="v-btn">
                <Camera size={17} /> Foto
              </Link>
              <button type="button" className="v-btn" onClick={() => openEditor({ kind: "issue", item: { projectId: p.id } })}>
                <AlertTriangle size={17} /> Mangel
              </button>
              <Link href={`/projekte/${p.id}/regie?neu=1`} className="v-btn primary">
                <PenLine size={17} /> Regie
              </Link>
            </div>
          </div>
        ))}
      </section>
      <section className="v-card">
        <h2 className="v-card-title">Die nächsten Tage</h2>
        <ul className="v-list compact">
          {week.map((day) => (
            <li key={day}>
              <span className="v-day">{weekdayShort(day)}</span>
              <span className="v-list-main">
                <small>{dayText(data, user.id, day).text}</small>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
