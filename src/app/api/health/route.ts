import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    status: "ok",
    product: "VYSNpro",
    modules: ["dashboard", "plantafel", "projekte", "meldungen", "ressourcen", "einstellungen"]
  });
}
