import { NextResponse } from "next/server";
import { defects, projects, workspace } from "@/lib/demo-data";

export function GET() {
  return NextResponse.json({ workspace, projects, defects });
}
