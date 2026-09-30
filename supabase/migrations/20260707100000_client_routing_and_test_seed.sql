-- VYSNpro client routing and test seed
-- Run this after the initial schema. The seed section is intended for a test Supabase project.

create or replace view public.clients
with (security_invoker = true)
as
select
  id as client_id,
  slug as client_slug,
  name,
  plan,
  region,
  created_at,
  updated_at
from public.workspaces;

grant select on public.clients to authenticated;

comment on view public.clients is 'Client-facing alias for workspaces. Use /client/[client_id] with either client_id or client_slug.';

insert into public.workspaces (id, name, slug, plan, region)
values
  ('11111111-1111-4111-8111-111111111111', 'eww Test Umgebung', 'eww-test', 'professional-test', 'eu')
on conflict (slug) do update
set
  name = excluded.name,
  plan = excluded.plan,
  region = excluded.region,
  updated_at = now();

insert into public.people (id, workspace_id, full_name, role_title, team, status, location, score, last_seen_label)
values
  ('22222222-2222-4222-8222-222222222201', '11111111-1111-4111-8111-111111111111', 'Mario Juric', 'Admin', 'Operations', 'active', 'Wels', 96, 'Heute'),
  ('22222222-2222-4222-8222-222222222202', '11111111-1111-4111-8111-111111111111', 'Ivan Kovac', 'Teamleiter', 'Baustelle', 'active', 'Semmering', 91, 'Heute'),
  ('22222222-2222-4222-8222-222222222203', '11111111-1111-4111-8111-111111111111', 'Anna Hofer', 'Mitarbeiterin', 'Dokumentation', 'active', 'Wels', 89, 'Gestern')
on conflict (id) do update
set
  full_name = excluded.full_name,
  role_title = excluded.role_title,
  team = excluded.team,
  status = excluded.status,
  location = excluded.location,
  score = excluded.score,
  last_seen_label = excluded.last_seen_label,
  updated_at = now();

insert into public.site_projects (id, workspace_id, name, client, location, status, progress, due_date, manager_id, manager_name, team_size, budget_amount, budget_currency)
values
  ('33333333-3333-4333-8333-333333333301', '11111111-1111-4111-8111-111111111111', 'Semmering Basistunnel', 'ÖBB Infrastruktur', 'Mürzzuschlag', 'active', 68, '2026-08-18', '22222222-2222-4222-8222-222222222201', 'Mario Juric', 9, 218400, 'EUR'),
  ('33333333-3333-4333-8333-333333333302', '11111111-1111-4111-8111-111111111111', 'Ladeinfrastruktur Zentrale', 'eww Gruppe', 'Wels', 'planning', 42, '2026-09-30', '22222222-2222-4222-8222-222222222202', 'Ivan Kovac', 5, 74900, 'EUR')
on conflict (id) do update
set
  name = excluded.name,
  client = excluded.client,
  location = excluded.location,
  status = excluded.status,
  progress = excluded.progress,
  due_date = excluded.due_date,
  manager_id = excluded.manager_id,
  manager_name = excluded.manager_name,
  team_size = excluded.team_size,
  budget_amount = excluded.budget_amount,
  budget_currency = excluded.budget_currency,
  updated_at = now();

insert into public.open_points (id, workspace_id, project_id, parent_id, type, title, description, status, done, sort_order)
values
  ('44444444-4444-4444-8444-444444444401', '11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333301', null, 'area', 'Elektroinstallation Tunnelabschnitt Nord', 'Kabelwege, Verteiler und Erstprüfung.', 'in_progress', false, 10),
  ('44444444-4444-4444-8444-444444444402', '11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333301', '44444444-4444-4444-8444-444444444401', 'section', 'Kabeltrassen Ebene 2', 'Montage und Dokumentation.', 'in_progress', false, 20),
  ('44444444-4444-4444-8444-444444444403', '11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333301', '44444444-4444-4444-8444-444444444402', 'subsection', 'Abschnitt B - Querverbindung', 'Fotodokumentation erforderlich.', 'open', false, 30),
  ('44444444-4444-4444-8444-444444444404', '11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333301', '44444444-4444-4444-8444-444444444403', 'task', 'Befestigungspunkte prüfen', 'Alle Konsolen auf festen Sitz prüfen.', 'open', false, 40),
  ('44444444-4444-4444-8444-444444444405', '11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333301', '44444444-4444-4444-8444-444444444403', 'task', 'Fotodokumentation hochladen', 'Aktuelle Fotos aus der Begehung ergänzen.', 'done', true, 50)
on conflict (id) do update
set
  parent_id = excluded.parent_id,
  title = excluded.title,
  description = excluded.description,
  status = excluded.status,
  done = excluded.done,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into public.site_defects (id, workspace_id, project_id, open_point_id, title, description, owner_id, owner_name, priority, status)
values
  ('55555555-5555-4555-8555-555555555501', '11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333301', '44444444-4444-4444-8444-444444444404', 'Kabeltrasse Abschnitt B dokumentieren', 'Befestigungspunkte und Fotobelege fehlen für die Abnahme.', '22222222-2222-4222-8222-222222222202', 'Ivan Kovac', 'high', 'open')
on conflict (id) do update
set
  open_point_id = excluded.open_point_id,
  title = excluded.title,
  description = excluded.description,
  owner_id = excluded.owner_id,
  owner_name = excluded.owner_name,
  priority = excluded.priority,
  status = excluded.status,
  updated_at = now();

insert into public.site_tasks (id, workspace_id, project_id, title, owner_id, owner_name, due_date, done)
values
  ('66666666-6666-4666-8666-666666666601', '11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333301', 'Wochenbericht an Projektleitung senden', '22222222-2222-4222-8222-222222222201', 'Mario Juric', current_date + 1, false)
on conflict (id) do update
set
  title = excluded.title,
  owner_id = excluded.owner_id,
  owner_name = excluded.owner_name,
  due_date = excluded.due_date,
  done = excluded.done,
  updated_at = now();

insert into public.site_settings (workspace_id, project_id, photo_required, auto_reports, customer_portal, defect_approval)
values
  ('11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333301', true, true, false, true),
  ('11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333302', true, true, false, true)
on conflict (project_id) do update
set
  photo_required = excluded.photo_required,
  auto_reports = excluded.auto_reports,
  customer_portal = excluded.customer_portal,
  defect_approval = excluded.defect_approval,
  updated_at = now();

create or replace function public.claim_test_client(target_slug text default 'eww-test')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_workspace_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if target_slug <> 'eww-test' then
    raise exception 'Only the eww-test client can be claimed with this test helper';
  end if;

  select id into target_workspace_id
  from public.workspaces
  where slug = target_slug;

  if target_workspace_id is null then
    raise exception 'Test client not found';
  end if;

  insert into public.profiles (id, email, full_name)
  values (
    auth.uid(),
    coalesce(auth.jwt() ->> 'email', ''),
    coalesce(auth.jwt() ->> 'name', auth.jwt() ->> 'email', 'Test User')
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = excluded.full_name,
    updated_at = now();

  insert into public.workspace_members (workspace_id, user_id, role, status, joined_at)
  values (target_workspace_id, auth.uid(), 'owner', 'active', now())
  on conflict (workspace_id, user_id) do update
  set
    role = excluded.role,
    status = excluded.status,
    joined_at = coalesce(public.workspace_members.joined_at, now()),
    updated_at = now();

  return target_workspace_id;
end;
$$;

grant execute on function public.claim_test_client(text) to authenticated;

comment on function public.claim_test_client(text) is 'Test-only helper. Lets an authenticated user claim the seeded eww-test client in a test Supabase project.';
