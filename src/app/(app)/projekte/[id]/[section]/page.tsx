"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { DefectsSection, ReportsSection } from "@/components/site-sections";
import { ProjectOverview } from "@/components/project-overview";
import { TimesSection } from "@/components/times";
import { PlansSection } from "@/components/plans";
import { DocBrowser } from "@/components/documents";
import { MaterialSection } from "@/components/material";
import { PhotoGallery } from "@/components/site";
import { SiteStructure } from "@/components/structure";
import { SiteGantt } from "@/components/site-gantt";
import { Empty } from "@/components/ui";
import { sectionsFor, type SiteSection } from "@/lib/sections";
import { currentUser, roleOf, useStore } from "@/lib/store";

export default function SiteSectionPage() {
  const { id, section } = useParams<{ id: string; section: SiteSection }>();
  const { data } = useStore();
  const role = roleOf(currentUser(data));
  const project = data.projects.find((p) => p.id === id);
  const def = sectionsFor(data, role).find((s) => s.key === section);
  if (!project) return null;
  if (!def || !def.roles.includes(role)) {
    return (
      <Empty>
        Dieser Bereich ist für deine Rolle oder eure Lizenz nicht verfügbar. <Link href={`/projekte/${id}`}>Zum Projekt</Link>
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
      return <DefectsSection projectId={project.id} />;
    case "berichte":
      return <ReportsSection project={project} />;
    case "material":
      return <MaterialSection project={project} />;
    case "dokumente":
      return <DocBrowser projectId={project.id} />;
    case "plaene":
      return <PlansSection project={project} />;
    case "zeiten":
      return <TimesSection project={project} />;
    case "uebersicht":
      return <ProjectOverview project={project} />;
  }
}
