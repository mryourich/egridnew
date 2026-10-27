import type { Metadata } from "next";
import { ProjectList } from "@/teamgrid/projects";

export const metadata: Metadata = { title: "Projekte" };

export default function Page() {
  return <ProjectList />;
}
