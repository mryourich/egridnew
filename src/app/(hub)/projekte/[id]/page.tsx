"use client";

import { useParams } from "next/navigation";
import { ProjectPage } from "@/teamgrid/project";

export default function Page() {
  const { id } = useParams<{ id: string }>();
  return <ProjectPage id={id} />;
}
