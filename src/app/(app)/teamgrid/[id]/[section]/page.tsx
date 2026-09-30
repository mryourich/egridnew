"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { IssuesTab, ReportsTab, ResourceList } from "@/components/project-tabs";
import { PhotoGallery, SiteStructure } from "@/components/site";
import { SiteGantt } from "@/components/site-gantt";
import { Empty } from "@/components/ui";
import { siteSections, type SiteSection } from "@/lib/sections";
import { currentUser, roleOf, useStore } from "@/lib/store";

export default function SiteSectionPage() {
  const { id, section } = useParams<{ id: string; section: SiteSection }>();
  const { data } = useStore();
  const role = roleOf(currentUser(data));
  const project = data.projects.find((p) => p.id === id);
  const def = siteSections.find((s) => s.key === section);
  if (!project) return null;
  if (!def || !def.roles.includes(role)) {
    return (
      <Empty>
        Dieser Bereich ist für deine Rolle nicht verfügbar. <Link href={`/teamgrid/${id}`}>Zur Baustelle</Link>
      </Empty>
    );
  }

  switch (section) {
    case "plan":
      return <SiteGantt project={project} />;
    case "struktur":
      return <SiteStructure project={project} />;
    case "fotos":
      return <PhotoGallery project={project} />;
    case "maengel":
      return <IssuesTab projectId={project.id} />;
    case "berichte":
      return <ReportsTab project={project} />;
    case "team":
      return <ResourceList project={project} readOnly />;
  }
}
