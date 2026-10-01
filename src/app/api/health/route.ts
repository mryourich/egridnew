import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    status: "ok",
    product: "VYSNpro",
    modules: ["baustellen", "plan", "struktur", "fotos", "maengel", "tagesberichte", "team"]
  });
}
