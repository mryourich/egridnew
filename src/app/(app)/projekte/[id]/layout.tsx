"use client";

import { ChevronLeft, MoreHorizontal, Pencil, Users } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { InviteDialog } from "@/components/invite";
import { ProjectTabs, useEditor } from "@/components/shell";
import { Empty } from "@/components/ui";
import * as L from "@/lib/labels";
import { siteProgress } from "@/lib/site";
import { employeeName, isManager, myProjects, useStore } from "@/lib/store";

export default function SiteLayout({ children }: { children: ReactNode }) {
  const { id } = useParams<{ id: string }>();
  const { data } = useStore();
  const openEditor = useEditor();
  const [invite, setInvite] = useState(false);
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const project = data.projects.find((p) => p.id === id);
  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => !menuRef.current?.contains(e.target as Node) && setMenu(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menu]);

  if (!project || !myProjects(data, data.currentUserId, true).some((p) => p.id === project.id)) {
    return (
      <div className="page">
        <Empty>
          {project ? "Dieses Projekt ist privat – du bist nicht eingeladen." : "Projekt nicht gefunden."} <Link href="/projekte">Zu meinen Projekten</Link>
        </Empty>
      </div>
    );
  }

  const progress = siteProgress(data, project.id);
  const manager = isManager(data);

  return (
    <div className="page page-wide proj">
      <header className="phead">
        <Link href="/projekte" className="phead-back">
          <ChevronLeft size={15} /> Projekte
        </Link>
        <div className="phead-row">
          <div className="phead-title">
            <h1>
              <i style={{ background: project.color }} />
              {project.name}
              {project.status !== "aktiv" && <span className={`status-pill s-${project.status}`}>{L.projectStatus[project.status].label}</span>}
            </h1>
            <p>{[project.code, project.client, project.location, project.siteManagerId ? `Bauleitung ${employeeName(data, project.siteManagerId)}` : ""].filter(Boolean).join(" · ")}</p>
          </div>
          <div className="phead-side">
            <span className="phead-progress" title={`${progress} % der Punkte erledigt`}>
              <span className="bar">
                <span style={{ width: `${progress}%` }} />
              </span>
              <b>{progress} %</b>
            </span>
            {manager && (
              <div className="phead-more" ref={menuRef}>
                <button type="button" className="icon-btn" onClick={() => setMenu((m) => !m)} aria-label="Projekt-Menü">
                  <MoreHorizontal size={18} />
                </button>
                {menu && (
                  <div className="menu ph-menu">
                    <button type="button" className="menu-link" onClick={() => (setMenu(false), openEditor({ kind: "project", item: project }))}>
                      <Pencil size={15} /> Projekt bearbeiten
                    </button>
                    <button type="button" className="menu-link" onClick={() => (setMenu(false), setInvite(true))}>
                      <Users size={15} /> Team einladen
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>
      <ProjectTabs projectId={project.id} />
      {children}
      {invite && <InviteDialog project={project} onClose={() => setInvite(false)} />}
    </div>
  );
}
