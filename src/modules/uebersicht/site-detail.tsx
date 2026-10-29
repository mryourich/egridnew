"use client";

import { Archive, ArrowRight, CalendarRange, CheckSquare, ClipboardList, HardHat, Package, Pencil, StickyNote, Trash2, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Due, Empty, PageHead, Prio, StatusBadge, useConfirm, Who } from "@/components/app/kit";
import { Button } from "@/components/ui";
import { fmt, today } from "@/lib/date";
import { fmtNum } from "@/lib/format";
import { defectOpen, NOTE_COLORS, SITE_STATUS } from "@/lib/labels";
import { siteStats } from "@/lib/stats";
import { personName, useStore } from "@/lib/store/store";
import { cn } from "@/lib/utils";
import { SiteDialog } from "./site-dialog";

export function SiteDetail({ id }: { id: string }) {
  const { data, save, remove, setSiteId, notify, restore } = useStore();
  const router = useRouter();
  const ask = useConfirm();
  const [editing, setEditing] = useState(false);
  const s = data.sites.find((x) => x.id === id);

  if (!s)
    return (
      <div className="page">
        <Empty
          icon={<HardHat size={28} />}
          title="Baustelle nicht gefunden"
          text="Sie wurde gelöscht oder der Link ist nicht mehr gültig."
          action={
            <Link href="/uebersicht" className="ui-button ui-button-secondary ui-button-size-default">
              Zur Übersicht
            </Link>
          }
        />
      </div>
    );

  const st = siteStats(data, s.id);
  const t = today();
  const on = <T extends { siteId: string }>(l: T[]) => l.filter((x) => x.siteId === s.id);
  /** jumps into a module with this site chosen in the top bar */
  const open = (href: string) => {
    setSiteId(s.id);
    router.push(href);
  };
  const defects = on(data.defects)
    .filter((d) => defectOpen(d.status))
    .sort((a, b) => (a.due || "9999").localeCompare(b.due || "9999"))
    .slice(0, 6);
  const tasks = on(data.tasks)
    .filter((x) => x.status !== "erledigt")
    .sort((a, b) => (a.due || "9999").localeCompare(b.due || "9999"))
    .slice(0, 6);
  const upcoming = on(data.entries)
    .filter((e) => e.end >= t)
    .sort((a, b) => a.start.localeCompare(b.start))
    .slice(0, 6);
  const low = on(data.materials).filter((m) => m.qty < m.minQty);
  const notes = on(data.notes).sort((a, b) => a.order - b.order).slice(0, 4);
  const team = [s.managerId, ...s.memberIds.filter((m) => m !== s.managerId)].filter((x) => data.people.some((p) => p.id === x));

  const archive = () => {
    const was = s.status;
    save("sites", { ...s, status: s.status === "archiviert" ? "aktiv" : "archiviert" });
    notify(was === "archiviert" ? "Baustelle wieder aktiv" : "Baustelle archiviert", { undo: () => save("sites", { ...s, status: was }) });
  };
  const drop = async () => {
    const count = on(data.points).length + on(data.defects).length + on(data.tasks).length + on(data.entries).length + on(data.materials).length + on(data.notes).length;
    if (!(await ask({ title: `„${s.name}“ löschen?`, text: `Alle ${count} Einträge dieser Baustelle (Checkliste, Mängel, Aufgaben, Termine, Material, Notizen) werden mitgelöscht. Archivieren behält sie.` }))) return;
    const before = data;
    remove("sites", s.id);
    router.push("/uebersicht");
    notify("Baustelle gelöscht", { undo: () => restore(before) });
  };

  return (
    <div className="page">
      <PageHead
        crumbs={
          <>
            <Link href="/uebersicht">Übersicht</Link> / <span>{s.number}</span>
          </>
        }
        title={
          <span className="title-with-swatch">
            <span className="swatch" style={{ background: s.color, width: 14, height: 14 }} />
            {s.name}
            <StatusBadge tone={SITE_STATUS[s.status].tone}>{SITE_STATUS[s.status].label}</StatusBadge>
          </span>
        }
        sub={[s.client, s.address].filter(Boolean).join(" · ") || "Kein Auftraggeber eingetragen"}
        actions={
          <>
            <Button variant="secondary" leftIcon={<Pencil size={14} />} onClick={() => setEditing(true)}>
              Bearbeiten
            </Button>
            <Button variant="secondary" leftIcon={<Archive size={14} />} onClick={archive}>
              {s.status === "archiviert" ? "Reaktivieren" : "Archivieren"}
            </Button>
            <Button variant="destructive" leftIcon={<Trash2 size={14} />} onClick={() => void drop()}>
              Löschen
            </Button>
          </>
        }
      />

      <section className="kpis" aria-label="Kennzahlen der Baustelle">
        <button type="button" className="kpi accent" onClick={() => open("/openpoints")}>
          <span>Checkliste</span>
          <strong>{st.progress} %</strong>
          <small>
            {st.pointsDone} von {st.points} Punkten erledigt
          </small>
        </button>
        <button type="button" className={cn("kpi", st.defectsOpen && "signal")} onClick={() => open("/openpoints?ansicht=maengel")}>
          <span>Offene Mängel</span>
          <strong>{st.defectsOpen}</strong>
          <small>{st.defectsHigh} hohe Priorität</small>
        </button>
        <button type="button" className={cn("kpi", st.tasksOver && "signal")} onClick={() => open("/aufgaben?filter=alle")}>
          <span>Offene Aufgaben</span>
          <strong>{st.tasksOpen}</strong>
          <small>{st.tasksOver} überfällig</small>
        </button>
        <button type="button" className={cn("kpi", st.lowStock && "signal")} onClick={() => open("/material")}>
          <span>Material unter Minimum</span>
          <strong>{st.lowStock}</strong>
          <small>{on(data.materials).length} Artikel im Bestand</small>
        </button>
      </section>

      <div className="detail-grid">
        <section className="panel">
          <div className="panel-head">
            <h3>Stammdaten</h3>
          </div>
          <dl className="facts">
            <dt>Baustellen-Nr.</dt>
            <dd>{s.number || "–"}</dd>
            <dt>Auftraggeber</dt>
            <dd>{s.client || "–"}</dd>
            <dt>Adresse</dt>
            <dd>{s.address || "–"}</dd>
            <dt>Zeitraum</dt>
            <dd>
              {fmt(s.start || undefined)} – {fmt(s.end || undefined)}
            </dd>
            <dt>Bauleitung</dt>
            <dd>
              <Who id={s.managerId} />
            </dd>
            <dt>Team</dt>
            <dd className="team-list">{team.length ? team.map((p) => <Who key={p} id={p} />) : "–"}</dd>
            {s.note && (
              <>
                <dt>Notiz</dt>
                <dd style={{ whiteSpace: "pre-wrap" }}>{s.note}</dd>
              </>
            )}
            <dt>Angelegt</dt>
            <dd className="muted">
              {personName(data, s.createdBy) || "–"}
              {s.createdAt ? `, ${fmt(s.createdAt.slice(0, 10))}` : ""}
            </dd>
          </dl>
        </section>

        <Block title="Offene Mängel" icon={<TriangleAlert size={14} />} more="Mängelliste" onMore={() => open("/openpoints?ansicht=maengel")} empty="Keine offenen Mängel.">
          {defects.map((d) => (
            <button type="button" key={d.id} onClick={() => open(`/openpoints?ansicht=maengel&mangel=${d.id}`)}>
              <span className="muted nowrap">M-{String(d.no).padStart(3, "0")}</span>
              <span className="title">{d.title}</span>
              <Prio p={d.priority} />
              <Due due={d.due} />
            </button>
          ))}
        </Block>

        <Block title="Offene Aufgaben" icon={<CheckSquare size={14} />} more="Aufgaben" onMore={() => open("/aufgaben?filter=alle")} empty="Keine offenen Aufgaben.">
          {tasks.map((x) => (
            <button type="button" key={x.id} onClick={() => open(`/aufgaben?aufgabe=${x.id}`)}>
              <span className="title">{x.title}</span>
              <Who id={x.ownerId} />
              <Due due={x.due} />
            </button>
          ))}
        </Block>

        <Block title="Nächste Termine" icon={<CalendarRange size={14} />} more="Kalender" onMore={() => open("/kalender")} empty="Keine Termine geplant.">
          {upcoming.map((e) => (
            <button type="button" key={e.id} onClick={() => open("/kalender")}>
              <span className="swatch" style={{ background: e.color }} />
              <span className="title">{e.title || "Einsatz"}</span>
              <span className="muted nowrap">{personName(data, e.rowId) || data.calendar.rows?.find((r) => r.id === e.rowId)?.name}</span>
              <span className="nowrap">
                {fmt(e.start)}
                {e.end !== e.start && ` – ${fmt(e.end)}`}
              </span>
            </button>
          ))}
        </Block>

        <Block title="Material unter Mindestbestand" icon={<Package size={14} />} more="Material" onMore={() => open("/material")} empty="Alle Artikel über dem Mindestbestand.">
          {low.map((m) => (
            <button type="button" key={m.id} onClick={() => open(`/material?artikel=${m.id}`)}>
              <span className="title">{m.name}</span>
              <span className="signal-text nowrap">
                {fmtNum(m.qty)} / {fmtNum(m.minQty)} {m.unit}
              </span>
              <StatusBadge tone={m.ordered ? "blue" : "amber"}>{m.ordered ? "Bestellt" : "Nicht bestellt"}</StatusBadge>
            </button>
          ))}
        </Block>

        <Block title="Notizen" icon={<StickyNote size={14} />} more="Notizen" onMore={() => open("/notizen")} empty="Keine Notizen zu dieser Baustelle.">
          {notes.map((n) => (
            <button type="button" key={n.id} onClick={() => open(`/notizen?notiz=${n.id}`)}>
              <span className="swatch" style={{ background: NOTE_COLORS[n.color]?.edge }} />
              <span className="title">{n.text}</span>
            </button>
          ))}
        </Block>

        <section className="panel">
          <div className="panel-head">
            <h3>Checkliste</h3>
            <span className="grow" />
            <button type="button" className="more" onClick={() => open("/openpoints")}>
              Öffnen <ArrowRight size={13} />
            </button>
          </div>
          <div className="panel-body">
            {st.points ? (
              <>
                <div className="progress" style={{ height: 8 }}>
                  <i style={{ width: `${st.progress}%` }} />
                </div>
                <p className="muted" style={{ marginTop: 8 }}>
                  {st.pointsDone} erledigt · {st.pointsOpen} offen
                </p>
              </>
            ) : (
              <p className="muted">
                Noch keine Punkte.{" "}
                <button type="button" className="link" onClick={() => open("/openpoints")}>
                  <ClipboardList size={13} /> Checkliste anlegen
                </button>
              </p>
            )}
          </div>
        </section>
      </div>
      {editing && <SiteDialog site={s} onClose={() => setEditing(false)} />}
    </div>
  );
}

function Block({ title, icon, more, onMore, empty, children }: { title: string; icon: ReactNode; more: string; onMore: () => void; empty: string; children: ReactNode[] }) {
  return (
    <section className="panel">
      <div className="panel-head">
        {icon}
        <h3>{title}</h3>
        <span className="grow" />
        <button type="button" className="more" onClick={onMore}>
          {more} <ArrowRight size={13} />
        </button>
      </div>
      {children.length ? <div className="list-rows">{children}</div> : <p className="panel-body muted">{empty}</p>}
    </section>
  );
}
