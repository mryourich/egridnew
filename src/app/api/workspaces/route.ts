import { NextResponse } from "next/server";
import {
  activities,
  defects,
  fleetReservations,
  people,
  platformModules,
  projects,
  vehicles,
  workspace
} from "@/lib/demo-data";

export function GET() {
  return NextResponse.json({
    workspace,
    people,
    vehicles,
    fleetReservations,
    projects,
    defects,
    platformModules,
    activities
  });
}
