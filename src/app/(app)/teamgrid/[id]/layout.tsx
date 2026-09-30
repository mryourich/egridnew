"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { IssueButton } from "@/components/issue-sheet";
import { useEditor } from "@/components/shell";
import { PhotoAddButton } from "@/components/site";
import { Avatar, Empty } from "@/components/ui";
import { ClipboardList } from "lucide-react";
import { inRange, today } from "@/lib/date";
import { siteProgress } from "@/lib/site";
import { currentUser, employeeName, myProjects, roleOf, useStore } from "@/lib/store";

export default function SiteLayout({ children }: { children: ReactNode }) {
  const { id } = useParams<{ id: string }>();
  const { data } = useStore();
  const openEditor = useEditor();
  const role = roleOf(currentUser(data));
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
  const progress = siteProgress(data, project.id);
  const teamToday = [...new Set(data.assignments.filter((a) => a.projectId === project.id && a.resourceType === "employee" && inRange(t, a.start, a.end)).map((a) => a.resourceId))];

  return (
    <div className="page">
      <section className="site-hero compact" style={{ "--c": project.color } as CSSProperties}>
        <div className="sh-main">
          <span className="sc-code">{project.code}</span>
          <h1>{project.name}</h1>
          <p className="muted">
            {project.location} · PL {project.managerId ? employeeName(data, project.managerId) : "–"} · BL {project.siteManagerId ? employeeName(data, project.siteManagerId) : "–"}
          </p>
        </div>
        <div className="sh-inline">
          <span className="avatar-stack" title={teamToday.map((x) => employeeName(data, x)).join(", ")}>
            {teamToday.slice(0, 6).map((pid) => (
              <Avatar key={pid} name={employeeName(data, pid)} size={26} />
            ))}
            <small>{teamToday.length} heute vor Ort</small>
          </span>
          <span className="sh-progress">
            <span>
              <i style={{ width: `${progress}%` }} />
            </span>
            <strong>{progress} %</strong>
          </span>
        </div>
        <div className="sh-actions">
          <PhotoAddButton projectId={project.id} nodeId="" label="Foto" camera />
          <IssueButton projectId={project.id} />
          {role !== "monteur" && (
            <button className="btn btn-primary" type="button" onClick={() => openEditor({ kind: "report", item: { projectId: project.id } })}>
              <ClipboardList size={15} /> Tagesbericht
            </button>
          )}
        </div>
      </section>
      {children}
    </div>
  );
}
