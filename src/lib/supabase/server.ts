type SupabaseRequestOptions = {
  body?: unknown;
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  prefer?: string;
  useServiceRole?: boolean;
};

export type ClientWorkspace = {
  created_at: string;
  id: string;
  name: string;
  plan: string;
  region: string;
  slug: string;
};

export type ClientSiteProject = {
  budget_amount: number | null;
  budget_currency: string;
  client: string | null;
  due_date: string | null;
  id: string;
  location: string | null;
  manager_name: string | null;
  name: string;
  progress: number;
  status: string;
  team_size: number;
  workspace_id: string;
};

export type ClientBootstrap = {
  projects: ClientSiteProject[];
  workspace: ClientWorkspace;
};

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

function getSupabaseKey(useServiceRole = false) {
  if (useServiceRole && supabaseServiceRoleKey) {
    return supabaseServiceRoleKey;
  }

  return supabaseAnonKey;
}

async function supabaseRest<T>(path: string, options: SupabaseRequestOptions = {}) {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase environment variables are missing.");
  }

  const key = getSupabaseKey(options.useServiceRole);
  const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1${path}`, {
    body: options.body ? JSON.stringify(options.body) : undefined,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(options.prefer ? { Prefer: options.prefer } : {})
    },
    method: options.method ?? "GET",
    next: { revalidate: 30 }
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Supabase request failed (${response.status}): ${message}`);
  }

  return (await response.json()) as T;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function clientFilter(clientId: string) {
  return isUuid(clientId) ? `id=eq.${clientId}` : `slug=eq.${encodeURIComponent(clientId)}`;
}

export async function getClientBootstrap(clientId: string): Promise<ClientBootstrap | null> {
  const workspaces = await supabaseRest<ClientWorkspace[]>(
    `/workspaces?select=id,slug,name,plan,region,created_at&${clientFilter(clientId)}&limit=1`,
    { useServiceRole: true }
  );
  const workspace = workspaces[0];

  if (!workspace) {
    return null;
  }

  const projects = await supabaseRest<ClientSiteProject[]>(
    `/site_projects?select=id,workspace_id,name,client,location,status,progress,due_date,manager_name,team_size,budget_amount,budget_currency&workspace_id=eq.${workspace.id}&order=created_at.desc`,
    { useServiceRole: true }
  );

  return {
    projects,
    workspace
  };
}
