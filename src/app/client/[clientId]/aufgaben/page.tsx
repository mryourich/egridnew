import { AppShell } from "@/components/app-shell";

type ClientPageProps = {
  params: Promise<{ clientId: string }>;
};

export default async function ClientTasksPage({ params }: ClientPageProps) {
  const { clientId } = await params;

  return <AppShell autoOpenFirstProject initialClientId={clientId} initialPage="site" initialSiteTab="tasks" />;
}
