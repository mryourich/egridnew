"use client";

import { CalendarDays, MoreHorizontal, Pencil, Users } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { InviteDialog } from "@/components/invite";
import { ProjectTabs, useEditor } from "@/components/shell";
import { Empty } from "@/components/ui";
import { inRange, today } from "@/lib/date";
import * as L from "@/lib/labels";
import { siteProgress } from "@/lib/site";
import { employeeName, isManager, myProjects, projectTeam, useStore } from "@/lib/store";

/** Progress ring for the header. */
function Ring({ value }: { value: number }) {
  const r = 16;
  const c = 2 * Math.PI * r;
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" className="ring2" aria-hidden>
      <circle cx="20" cy="20" r={r} fill="none" stroke="#e6ebf3" strokeWidth="4" />
      <circle cx="20" cy="20" r={r} fill="none" stroke="var(--primary)" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${(value / 100) * c} ${c}`} transform="rotate(-90 20 20)" />
    </svg>
  );
}

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

  const t = today();
  const progress = siteProgress(data, project.id);
  const team = projectTeam(data, project);
  const busyToday = new Set(data.jobs.filter((j) => j.projectId === project.id && !j.symbol && inRange(t, j.start, j.end)).map((j) => j.employeeId)).size;
  const manager = isManager(data);

  return (
    <div className="page page-wide proj">
      <section className="ph" style={{ "--c": project.color } as CSSProperties}>
        {project.image && <img className="ph-band" src={project.image} alt="" />}
        <div className="ph-main">
          <span className="ph-code">{project.code}</span>
          <h1>
            {project.name}
            <span className={`status-pill s-${project.status}`}>{L.projectStatus[project.status].label}</span>
          </h1>
          <p>{[project.client, project.location, project.siteManagerId ? `Bauleitung: ${employeeName(data, project.siteManagerId)}` : ""].filter(Boolean).join(" · ")}</p>
        </div>
        <div className="ph-stats">
          <div className="ph-stat">
            <Ring value={progress} />
            <span>
              <b>{progress} %</b>
              <small>Fortschritt</small>
            </span>
          </div>
          <button type="button" className="ph-stat" onClick={() => setInvite(true)} title={team.map((e) => e.name).join(", ")}>
            <Users size={20} />
            <span>
              <b>{team.length}</b>
              <small>Team</small>
            </span>
          </button>
          <Link href={`/projekte/${project.id}/plan`} className="ph-stat">
            <CalendarDays size={20} />
            <span>
              <b>{busyToday}</b>
              <small>heute</small>
            </span>
          </Link>
          {manager && (
            <div className="ph-more" ref={menuRef}>
              <button type="button" className="ph-stat" onClick={() => setMenu((m) => !m)} aria-label="Mehr">
                <MoreHorizontal size={20} />
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
      </section>
      <ProjectTabs projectId={project.id} />
      {children}
      {invite && <InviteDialog project={project} onClose={() => setInvite(false)} />}
    </div>
  );
}
