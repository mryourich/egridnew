"use client";

import { Pencil } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { EmpAvatar } from "@/components/person";
import { ProjectTabs, useEditor } from "@/components/shell";
import { Empty } from "@/components/ui";
import { inRange, today } from "@/lib/date";
import { siteProgress } from "@/lib/site";
import { employeeName, isManager, myProjects, projectTeam, useStore } from "@/lib/store";

export default function SiteLayout({ children }: { children: ReactNode }) {
  const { id } = useParams<{ id: string }>();
  const { data } = useStore();
  const openEditor = useEditor();
  const project = data.projects.find((p) => p.id === id);

  if (!project || !myProjects(data, data.currentUserId, true).some((p) => p.id === project.id)) {
    return (
      <div className="page">
        <Empty>
          {project ? "Dieses Projekt ist privat – du bist nicht eingeladen." : "Projekt nicht gefunden."} <Link href="/projekte">Zu meinen Projekten</Link>
        </Empty>
      </div>
    );
  }

  const t = today();
  const progress = siteProgress(data, project.id);
  const team = projectTeam(data, project);
  const busyToday = team.filter((e) => data.jobs.some((j) => j.projectId === project.id && j.employeeId === e.id && inRange(t, j.start, j.end)));

  return (
    <div className="page page-wide">
      <section className="site-hero compact" style={{ "--c": project.color } as CSSProperties}>
        {project.image && <img className="sh-image" src={project.image} alt="" />}
        <div className="sh-main">
          <span className="sc-code">{project.code}</span>
          <h1>{project.name}</h1>
          <p className="muted">
            {[project.client, project.location].filter(Boolean).join(" · ")}
            {project.siteManagerId ? ` · Bauleitung ${employeeName(data, project.siteManagerId)}` : ""}
            {isManager(data) && (
              <button type="button" className="link-btn sh-edit" onClick={() => openEditor({ kind: "project", item: project })}>
                <Pencil size={12} /> Bearbeiten
              </button>
            )}
          </p>
        </div>
        <div className="sh-inline">
          <Link href={`/projekte/${project.id}/team`} className="avatar-stack" title={team.map((e) => e.name).join(", ")}>
            {team.slice(0, 6).map((e) => (
              <EmpAvatar key={e.id} id={e.id} size={26} />
            ))}
            <small>
              {team.length} im Team · {busyToday.length} heute eingeplant
            </small>
          </Link>
          <span className="sh-progress">
            <span>
              <i style={{ width: `${progress}%` }} />
            </span>
            <strong>{progress} %</strong>
          </span>
        </div>
      </section>
      <ProjectTabs projectId={project.id} />
      {children}
    </div>
  );
}
