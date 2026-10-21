"use client";

import { useParams } from "next/navigation";
import { Suspense } from "react";
import { DocBrowser } from "@/components/documents";
import { MaterialSection } from "@/components/material";
import { PhotoGallery } from "@/components/site";
import { Gantt } from "@/ui/gantt";
import { DefectsSection, ReportsSection } from "@/components/site-sections";
import { SiteStructure } from "@/components/structure";
import { useStore } from "@/lib/store";
import { isField } from "@/ui/access";
import { Regie } from "@/ui/regie";

function Tab() {
  const { id, section } = useParams<{ id: string; section: string }>();
  const { data } = useStore();
  const project = data.projects.find((p) => p.id === id);
  if (!project) return null;
  const office = !isField(data);
  switch (section) {
    case "plan":
      return office ? <Gantt scope={{ kind: "site", project }} /> : <SiteStructure project={project} />;
    case "maengel":
      return <DefectsSection projectId={id} />;
    case "fotos":
      return <PhotoGallery project={project} />;
    case "regie":
      return <Regie projectId={id} />;
    case "material":
      return <MaterialSection project={project} />;
    case "berichte":
      return office ? <ReportsSection project={project} /> : <SiteStructure project={project} />;
    case "dokumente":
      return <DocBrowser projectId={id} />;
    default:
      return <SiteStructure project={project} />;
  }
}

export default function Page() {
  return (
    <div className="v-legacy">
      <Suspense>
        <Tab />
      </Suspense>
    </div>
  );
}
