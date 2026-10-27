"use client";

import Link from "next/link";
import { canSee } from "@/core/roles";
import { useStore } from "@/core/store";
import { Empty } from "@/core/ui";
import { Defects } from "./defects";
import { Documents } from "./documents";
import { Notes } from "./notes";
import { Overview } from "./overview";
import { ProjectSettings } from "./project-settings";
import { Points } from "./points";
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
  const pages: Record<string, React.ReactNode> = {
    "": <Overview project={project} />,
    punkte: <Points project={project} />,
    maengel: <Defects project={project} />,
    aufgaben: <Tasks project={project} />,
    notizen: <Notes project={project} />,
    dokumente: <Documents project={project} />,
    berichte: <Reports project={project} />,
    einstellungen: <ProjectSettings project={project} />
  };
  return pages[tab] ?? pages[""];
}
