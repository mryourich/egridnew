import { NextResponse } from "next/server";
import { projects, workspace } from "@/lib/demo-data";
import { getClientBootstrap, isSupabaseConfigured } from "@/lib/supabase/server";

type ClientApiContext = {
  params: Promise<{ clientId: string }>;
};

export async function GET(_request: Request, context: ClientApiContext) {
  const { clientId } = await context.params;

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      clientId,
      mode: "demo",
      projects,
      workspace
    });
  }

  const bootstrap = await getClientBootstrap(clientId);

  if (!bootstrap) {
    return NextResponse.json({ clientId, error: "Client not found." }, { status: 404 });
  }

  return NextResponse.json({
    clientId,
    mode: "supabase",
    ...bootstrap
  });
}
