"use client";

import { ChevronLeft, ChevronRight, Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { addDays, today } from "@/lib/date";
import * as L from "@/lib/labels";
import { uid, useStore } from "@/lib/store";
import type { Project } from "@/lib/types";
import { canPlan, canRemove, dayText, me, visibleSites } from "./access";
import { Empty, Field, PageHead, Sheet } from "./kit";

export const TABS = [
  { key: "checkliste", label: "Checkliste" },
  { key: "fotos", label: "Fotos" },
  { key: "maengel", label: "Mängel" },
  { key: "regie", label: "Regie" },
  { key: "material", label: "Material" },
  { key: "tagesbericht", label: "Tagesbericht" },
  { key: "dokumente", label: "Dokumente" }
] as const;
export type TabKey = (typeof TABS)[number]["key"];

/** All sites, one line each. */
export function SiteList() {
  const { data } = useStore();
  const [edit, setEdit] = useState<Partial<Project> | null>(null);
  const [showDone, setShowDone] = useState(false);
  const sites = visibleSites(data);
  const done = visibleSites(data, true).filter((p) => p.status === "abgeschlossen");
  const planner = canPlan(data);
  const t = today();

  return (
    <div className="v-page narrow">
      <PageHead title="Baustellen" sub={`${sites.length} ${sites.length === 1 ? "Baustelle" : "Baustellen"}`}>
        {planner && (
          <button type="button" className="v-btn primary" onClick={() => setEdit({})}>
            <Plus size={17} /> Neue Baustelle
          </button>
        )}
      </PageHead>
      {sites.length === 0 ? (
        <Empty>{planner ? "Noch keine Baustelle. Lege die erste an." : "Du bist noch auf keiner Baustelle eingeteilt."}</Empty>
      ) : (
        <ul className="v-card v-list v-sites">
          {sites.map((p) => {
            const issues = data.issues.filter((i) => i.projectId === p.id && i.status !== "erledigt").length;
            const here = data.employees.filter((e) => e.active && [dayText(data, e.id, t).am, dayText(data, e.id, t).pm].some((s) => s.kind === "job" && s.job.projectId === p.id)).length;
            return (
              <li key={p.id}>
                <Link href={`/projekte/${p.id}`} className="v-site-row">
                  <i style={{ background: p.color }} />
                  <span className="v-list-main">
                    <strong>{p.name}</strong>
                    <small>{[p.client, p.location].filter(Boolean).join(" · ") || "–"}</small>
                  </span>
                  <span className="v-site-facts">
                    {here > 0 && <span>{here} heute</span>}
                    {issues > 0 && <span className="warn">{issues} {issues === 1 ? "Mangel" : "Mängel"}</span>}
                  </span>
                  <ChevronRight size={18} className="v-chev" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {done.length > 0 && (
        <div className="v-done">
          <button type="button" className="v-link" onClick={() => setShowDone((s) => !s)}>
            Abgeschlossene Baustellen ({done.length})
          </button>
          {showDone && (
            <ul className="v-card v-list v-sites">
              {done.map((p) => (
                <li key={p.id}>
                  <Link href={`/projekte/${p.id}`} className="v-site-row">
                    <i style={{ background: "#cbd5e1" }} />
                    <span className="v-list-main">
                      <strong>{p.name}</strong>
                      <small>{p.client}</small>
                    </span>
                    <ChevronRight size={18} className="v-chev" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {edit && <SiteSheet site={edit} onClose={() => setEdit(null)} />}
    </div>
  );
}

/** Name, client, place – that is all a site needs to start. */
export function SiteSheet({ site, onClose }: { site: Partial<Project>; onClose: () => void }) {
  const { data, save, remove, notify } = useStore();
  const router = useRouter();
  const isNew = !site.id;
  const [name, setName] = useState(site.name ?? "");
  const [client, setClient] = useState(site.client ?? "");
  const [location, setLocation] = useState(site.location ?? "");
  const [description, setDescription] = useState(site.description ?? "");

  const submit = () => {
    if (!name.trim()) return;
    const user = me(data);
    const t = today();
    const base: Project = isNew
      ? {
          id: uid("p"),
          code: `B-${String(data.projects.length + 1).padStart(3, "0")}`,
          name: "",
          client: "",
          location: "",
          status: "aktiv",
          color: L.projectColors[data.projects.length % L.projectColors.length],
          start: t,
          end: addDays(t, 90),
          managerId: "",
          siteManagerId: user?.id ?? "",
          description: "",
          createdBy: user?.id ?? "",
          members: []
        }
      : (site as Project);
    const item = { ...base, name: name.trim(), client: client.trim(), location: location.trim(), description: description.trim() };
    save("projects", item, isNew ? `Baustelle ${item.name} angelegt` : `Baustelle ${item.name} geändert`);
    if (isNew) save("folders", { id: uid("fo"), projectId: item.id, parentId: "", name: "Dokumente" });
    notify(isNew ? "Baustelle angelegt" : "Gespeichert");
    onClose();
    if (isNew) router.push(`/projekte/${item.id}`);
  };

  return (
    <Sheet
      title={isNew ? "Neue Baustelle" : "Baustelle bearbeiten"}
      onClose={onClose}
      footer={
        <>
          {!isNew && canRemove(data) && (
            <button
              type="button"
              className="v-btn ghost"
              onClick={() => {
                const done = site.status === "abgeschlossen";
                save("projects", { ...(site as Project), status: done ? "aktiv" : "abgeschlossen" }, `${site.name} ${done ? "wieder geöffnet" : "abgeschlossen"}`);
                notify(done ? "Wieder geöffnet" : "Baustelle abgeschlossen");
                onClose();
              }}
            >
              {site.status === "abgeschlossen" ? "Wieder öffnen" : "Abschließen"}
            </button>
          )}
          {!isNew && canRemove(data) && (
            <button
              type="button"
              className="v-btn ghost danger"
              onClick={() => {
                if (!window.confirm(`„${site.name}“ mit allen Fotos, Mängeln und Berichten löschen?`)) return;
                remove("projects", site.id!, `Baustelle ${site.name} gelöscht`);
                onClose();
                router.push("/projekte");
              }}
            >
              Löschen
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
      <Field label="Name der Baustelle">
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Wohnhaus Berger, Umbau Bad" onKeyDown={(e) => e.key === "Enter" && submit()} />
      </Field>
      <Field label="Kunde">
        <input value={client} onChange={(e) => setClient(e.target.value)} placeholder="Name oder Firma" />
      </Field>
      <Field label="Adresse / Ort">
        <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Straße, Ort" />
      </Field>
      <Field label="Notiz (optional)">
        <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="z. B. Schlüssel beim Hausmeister" />
      </Field>
    </Sheet>
  );
}

/** Header and tabs of one site. */
export function SiteFrame({ id, children }: { id: string; children: ReactNode }) {
  const { data } = useStore();
  const path = usePathname();
  const [edit, setEdit] = useState(false);
  const site = data.projects.find((p) => p.id === id);
  const visible = visibleSites(data, true).some((p) => p.id === id);
  if (!site || !visible)
    return (
      <div className="v-page narrow">
        <Empty>
          Diese Baustelle gibt es nicht oder du bist nicht eingeteilt. <Link href="/projekte">Zu den Baustellen</Link>
        </Empty>
      </div>
    );
  const tab = path.split("/")[3] ?? "checkliste";
  const t = today();
  const here = data.employees.filter((e) => e.active && [dayText(data, e.id, t).am, dayText(data, e.id, t).pm].some((s) => s.kind === "job" && s.job.projectId === id));

  return (
    <div className="v-page">
      <Link href="/projekte" className="v-back">
        <ChevronLeft size={16} /> Baustellen
      </Link>
      <header className="v-site-head">
        <div>
          <h1>
            <i style={{ background: site.color }} />
            {site.name}
            {site.status === "abgeschlossen" && <span className="v-tag">abgeschlossen</span>}
          </h1>
          <p>
            {[site.client, site.location].filter(Boolean).join(" · ")}
            {here.length > 0 && <span className="v-here"> · heute hier: {here.map((e) => e.name.split(" ")[0]).join(", ")}</span>}
          </p>
          {site.description && <p className="v-note">{site.description}</p>}
        </div>
        {canPlan(data) && (
          <button type="button" className="v-btn" onClick={() => setEdit(true)}>
            <Pencil size={16} /> Bearbeiten
          </button>
        )}
      </header>
      <nav className="v-site-tabs" aria-label="Bereiche">
        {TABS.map((x) => (
          <Link key={x.key} href={`/projekte/${id}/${x.key}`} className={tab === x.key ? "on" : ""}>
            {x.label}
          </Link>
        ))}
      </nav>
      {children}
      {edit && <SiteSheet site={site} onClose={() => setEdit(false)} />}
    </div>
  );
}
