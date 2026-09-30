"use client";

import { AlertTriangle, ArrowLeft, ClipboardList } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { IssuesTab, ReportsTab, TeamTab } from "@/components/project-tabs";
import { useEditor } from "@/components/shell";
import { PhotoAddButton, PhotoDocumentation, SiteStructure } from "@/components/site";
import { Dot, Empty, PageHeader, Tabs } from "@/components/ui";
import { employeeName, useStore } from "@/lib/store";

type Tab = "structure" | "photos" | "issues" | "reports" | "team";

export default function SitePage() {
  const { id } = useParams<{ id: string }>();
  const { data } = useStore();
  const openEditor = useEditor();
  const [tab, setTab] = useState<Tab>("structure");
  const project = data.projects.find((p) => p.id === id);

  if (!project) {
    return (
      <div className="page">
        <Empty>
          Baustelle nicht gefunden. <Link href="/teamgrid">Zur Übersicht</Link>
        </Empty>
      </div>
    );
  }

  const of = <T extends { projectId: string }>(list: T[]) => list.filter((x) => x.projectId === project.id);

  return (
    <div className="page">
      <Link href="/teamgrid" className="back-link">
        <ArrowLeft size={14} /> Baustellen
      </Link>
      <PageHeader
        title={
          <span className="title-with-dot">
            <Dot color={project.color} /> {project.name}
          </span>
        }
        subtitle={`${project.code} · ${project.location} · ${project.client}${project.managerId ? ` · Bauleitung ${employeeName(data, project.managerId)}` : ""}`}
        actions={
          <>
            <PhotoAddButton projectId={project.id} nodeId="" label="Foto" />
            <button className="btn" type="button" onClick={() => openEditor({ kind: "issue", item: { projectId: project.id } })}>
              <AlertTriangle size={15} /> Mangel
            </button>
            <button className="btn btn-primary" type="button" onClick={() => openEditor({ kind: "report", item: { projectId: project.id } })}>
              <ClipboardList size={15} /> Tagesbericht
            </button>
          </>
        }
      />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "structure", label: "Struktur", count: of(data.siteNodes).length },
          { value: "photos", label: "Fotodokumentation", count: of(data.photos).length },
          { value: "issues", label: "Mängel", count: of(data.issues).filter((i) => i.status !== "erledigt").length },
          { value: "reports", label: "Tagesberichte", count: of(data.reports).length },
          { value: "team", label: "Team" }
        ]}
      />
      <div className="tab-panel">
        {tab === "structure" && <SiteStructure project={project} />}
        {tab === "photos" && <PhotoDocumentation project={project} />}
        {tab === "issues" && <IssuesTab projectId={project.id} />}
        {tab === "reports" && <ReportsTab project={project} />}
        {tab === "team" && <TeamTab project={project} />}
      </div>
    </div>
  );
}
