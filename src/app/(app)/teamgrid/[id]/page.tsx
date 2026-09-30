"use client";

import { AlertTriangle, ArrowLeft, ClipboardList } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, type CSSProperties } from "react";
import { IssuesTab, ReportsTab, ResourceList } from "@/components/project-tabs";
import { useEditor } from "@/components/shell";
import { PhotoAddButton, PhotoDocumentation, SiteStructure } from "@/components/site";
import { SiteGantt } from "@/components/site-gantt";
import { Avatar, Empty, Tabs } from "@/components/ui";
import { fmt, inRange, today } from "@/lib/date";
import { siteProgress } from "@/lib/site";
import { currentUser, employeeName, myProjects, roleOf, useStore } from "@/lib/store";

type Tab = "plan" | "structure" | "photos" | "issues" | "reports" | "team";

export default function SitePage() {
  const { id } = useParams<{ id: string }>();
  const { data } = useStore();
  const openEditor = useEditor();
  const role = roleOf(currentUser(data));
  const [tab, setTab] = useState<Tab>(role === "monteur" ? "structure" : "plan");
  const project = data.projects.find((p) => p.id === id);

  if (!project || !myProjects(data).some((p) => p.id === project.id)) {
    return (
      <div className="page">
        <Empty>
          {project ? "Diese Baustelle ist dir nicht zugeteilt." : "Baustelle nicht gefunden."} <Link href="/teamgrid">Zu meinen Baustellen</Link>
        </Empty>
      </div>
    );
  }

  const t = today();
  const of = <T extends { projectId: string }>(list: T[]) => list.filter((x) => x.projectId === project.id);
  const progress = siteProgress(data, project.id);
  const teamToday = [...new Set(of(data.assignments).filter((a) => a.resourceType === "employee" && inRange(t, a.start, a.end)).map((a) => a.resourceId))];
  const openIssues = of(data.issues).filter((i) => i.status !== "erledigt").length;

  return (
    <div className="page">
      <Link href="/teamgrid" className="back-link">
        <ArrowLeft size={14} /> Meine Baustellen
      </Link>

      <section className="site-hero" style={{ "--c": project.color } as CSSProperties}>
        <div className="sh-main">
          <span className="sc-code">{project.code}</span>
          <h1>{project.name}</h1>
          <p className="muted">
            {project.location} · {project.client} · {fmt(project.start)} – {fmt(project.end)}
          </p>
        </div>
        <dl className="sh-facts">
          <div>
            <dt>Projektleitung</dt>
            <dd>{project.managerId ? employeeName(data, project.managerId) : "–"}</dd>
          </div>
          <div>
            <dt>Bauleitung</dt>
            <dd>{project.siteManagerId ? employeeName(data, project.siteManagerId) : "–"}</dd>
          </div>
          <div>
            <dt>Heute vor Ort</dt>
            <dd>
              <span className="avatar-stack">
                {teamToday.slice(0, 6).map((pid) => (
                  <Avatar key={pid} name={employeeName(data, pid)} size={24} />
                ))}
              </span>
              {!teamToday.length && "niemand"}
            </dd>
          </div>
          <div>
            <dt>Fortschritt</dt>
            <dd className="sh-progress">
              <span>
                <i style={{ width: `${progress}%` }} />
              </span>
              <strong>{progress} %</strong>
            </dd>
          </div>
        </dl>
        <div className="sh-actions">
          <PhotoAddButton projectId={project.id} nodeId="" label="Foto" />
          <button className="btn" type="button" onClick={() => openEditor({ kind: "issue", item: { projectId: project.id } })}>
            <AlertTriangle size={15} /> Mangel
          </button>
          {role !== "monteur" && (
            <button className="btn btn-primary" type="button" onClick={() => openEditor({ kind: "report", item: { projectId: project.id } })}>
              <ClipboardList size={15} /> Tagesbericht
            </button>
          )}
        </div>
      </section>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          ...(role !== "monteur" ? [{ value: "plan" as Tab, label: "Plan", count: of(data.jobs).filter((j) => !j.done && j.end >= t).length }] : []),
          { value: "structure", label: "Struktur", count: of(data.siteNodes).filter((n) => n.status !== "erledigt" && !data.siteNodes.some((k) => k.parentId === n.id)).length },
          { value: "photos", label: "Fotos", count: of(data.photos).length },
          { value: "issues", label: "Mängel", count: openIssues },
          ...(role !== "monteur" ? [{ value: "reports" as Tab, label: "Tagesberichte", count: of(data.reports).length }] : []),
          { value: "team", label: "Team" }
        ]}
      />
      <div className="tab-panel">
        {tab === "plan" && <SiteGantt project={project} />}
        {tab === "structure" && <SiteStructure project={project} />}
        {tab === "photos" && <PhotoDocumentation project={project} />}
        {tab === "issues" && <IssuesTab projectId={project.id} />}
        {tab === "reports" && <ReportsTab project={project} />}
        {tab === "team" && <ResourceList project={project} readOnly />}
      </div>
    </div>
  );
}
