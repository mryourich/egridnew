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
import { Overview } from "./overview";
import { Photos } from "./photos";
import { ProjectSettings } from "./project-settings";
import { Points } from "./points";
import { RegieList } from "./regie";
import { Reports } from "./reports";
import { Tasks } from "./tasks";

/** One project: the tab from the address decides the page. */
export function ProjectPage({ id, tab = "" }: { id: string; tab?: string }) {
  const { data } = useStore();
  const project = data.projects.find((p) => p.id === id);
  if (!project || !canSee(data, project))
    return (
      <div className="page">
        <Empty title="Projekt nicht gefunden" action={<Link href="/projekte" className="b-btn default md">Zu den Projekten</Link>}>
          Entweder gibt es das Projekt nicht mehr, oder du bist (noch) nicht eingeladen.
        </Empty>
      </div>
    );
  const field = isField(data);
  const pages: Record<string, React.ReactNode> = {
    "": <Overview project={project} />,
    punkte: <Points project={project} />,
    plan: field ? null : (
      <div className="page wide">
        <Gantt scope={{ kind: "site", project }} />
      </div>
    ),
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
  return pages[tab] ?? pages[""];
}
