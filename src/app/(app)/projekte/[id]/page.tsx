"use client";

import { ArrowLeft, Pencil } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { DocumentsTab, IssuesTab, OverviewTab, ProjectPlanningTab, ReportsTab, ScheduleTab } from "@/components/project-tabs";
import { useEditor } from "@/components/shell";
import { Badge, Dot, Empty, PageHeader, Tabs } from "@/components/ui";
import { fmt } from "@/lib/date";
import * as L from "@/lib/labels";
import { useStore } from "@/lib/store";

type Tab = "overview" | "planning" | "schedule" | "issues" | "reports" | "documents";

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const { data } = useStore();
  const openEditor = useEditor();
  const [tab, setTab] = useState<Tab>("overview");
  const project = data.projects.find((p) => p.id === id);

  if (!project) {
    return (
      <div className="page">
        <Empty>
          Projekt nicht gefunden. <Link href="/projekte">Zur Projektliste</Link>
        </Empty>
      </div>
    );
  }

  const of = <T extends { projectId: string }>(list: T[]) => list.filter((x) => x.projectId === project.id);
  const openIssues = of(data.issues).filter((i) => i.status !== "erledigt").length;

  return (
    <div className="page">
      <Link href="/projekte" className="back-link">
        <ArrowLeft size={14} /> Projekte
      </Link>
      <PageHeader
        title={
          <span className="title-with-dot">
            <Dot color={project.color} /> {project.name}
          </span>
        }
        subtitle={
          <>
            {project.code} · {project.client} · {project.location} · {fmt(project.start)} – {fmt(project.end)}{" "}
            <Badge tone={L.projectStatus[project.status].tone}>{L.projectStatus[project.status].label}</Badge>
          </>
        }
        actions={
          <button className="btn" type="button" onClick={() => openEditor({ kind: "project", item: project })}>
            <Pencil size={14} /> Bearbeiten
          </button>
        }
      />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "overview", label: "Übersicht" },
          { value: "planning", label: "Einsatzplanung", count: new Set(of(data.assignments).filter((a) => a.resourceType === "employee").map((a) => a.resourceId)).size },
          { value: "schedule", label: "Terminplan" },
          { value: "issues", label: "Mängel", count: openIssues },
          { value: "reports", label: "Tagesberichte", count: of(data.reports).length },
          { value: "documents", label: "Dokumente", count: of(data.documents).length }
        ]}
      />
      <div className="tab-panel">
        {tab === "overview" && <OverviewTab project={project} goTo={(t) => setTab(t === "team" ? "planning" : t === "schedule" || t === "issues" ? t : "overview")} />}
        {tab === "planning" && <ProjectPlanningTab project={project} />}
        {tab === "schedule" && <ScheduleTab project={project} />}
        {tab === "issues" && <IssuesTab projectId={project.id} />}
        {tab === "reports" && <ReportsTab project={project} />}
        {tab === "documents" && <DocumentsTab project={project} />}
      </div>
    </div>
  );
}
