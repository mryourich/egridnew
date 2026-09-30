import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    status: "ok",
    product: "VYSNpro",
    architecture: "nextjs-app-router",
    modules: ["core", "people", "fleet", "site", "roles", "billing"]
  });
}
