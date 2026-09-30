import { AppShell } from "@/components/app-shell";

type ClientPageProps = {
  params: Promise<{ clientId: string }>;
};

export default async function ClientDashboardPage({ params }: ClientPageProps) {
  const { clientId } = await params;

  return <AppShell initialClientId={clientId} initialPage="dashboard" />;
}
