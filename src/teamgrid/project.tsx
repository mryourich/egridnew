"use client";

import Link from "next/link";
import { canSee, isField } from "@/core/roles";
import { useStore } from "@/core/store";
import { Empty } from "@/core/ui";
import { Defects } from "./defects";
import { Documents } from "./documents";
import { Gantt } from "./gantt";
import { MaterialList } from "./material";
import { Notes } from "./notes";
import { OpenPoints } from "./open-points";
import { Photos } from "./photos";
import { ProjectSettings } from "./project-settings";
import { RegieList } from "./regie";
import { Reports } from "./reports";
import { SiteDashboard, SiteStatusBar } from "./site";
import { Tasks } from "./tasks";

/** One project of the SiteManager: the tab from the address decides the page. */
export function ProjectPage({ id, tab = "" }: { id: string; tab?: string }) {
  const { data } = useStore();
  const project = data.projects.find((p) => p.id === id);
  if (!project || !canSee(data, project))
    return (
      <Empty title="Projekt nicht gefunden" action={<Link href="/projekte" className="primary-action">Zur Projektauswahl</Link>}>
        Entweder gibt es das Projekt nicht mehr, oder du bist (noch) nicht eingeladen.
      </Empty>
    );
  const field = isField(data);
  if (tab === "") return <SiteDashboard project={project} />;
  if (tab === "punkte") return <OpenPoints project={project} />;
  const pages: Record<string, React.ReactNode> = {
    plan: field ? null : <Gantt scope={{ kind: "site", project }} />,
    maengel: <Defects project={project} />,
    fotos: <Photos project={project} />,
    regie: <RegieList project={project} />,
    material: <MaterialList project={project} />,
    aufgaben: <Tasks project={project} />,
    notizen: <Notes project={project} />,
    dokumente: <Documents project={project} />,
    berichte: field ? null : <Reports project={project} />,
    einstellungen: <ProjectSettings project={project} />
  };
  const page = pages[tab];
  if (!page) return <SiteDashboard project={project} />;
  return (
    <div className="site-workspace">
      <SiteStatusBar project={project} />
      {page}
    </div>
  );
}
