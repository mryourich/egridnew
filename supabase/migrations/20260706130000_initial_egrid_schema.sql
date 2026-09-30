-- VYSNpro initial Supabase schema
-- Run this in the Supabase SQL Editor or via `supabase db push`.

create extension if not exists pgcrypto;

do $$
begin
  create type public.workspace_role as enum ('owner', 'admin', 'manager', 'member', 'viewer');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.member_status as enum ('active', 'invited', 'disabled');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.project_status as enum ('active', 'planning', 'handover', 'paused', 'archived');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.open_point_type as enum ('area', 'section', 'subsection', 'task');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.work_item_status as enum ('open', 'in_progress', 'done');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.defect_priority as enum ('high', 'medium', 'low');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.document_kind as enum ('photo', 'protocol', 'plan', 'report', 'file');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.document_status as enum ('approved', 'review', 'draft');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.attachment_kind as enum ('photo', 'file');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.report_status as enum ('ready', 'draft', 'sent');
exception when duplicate_object then null;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text not null default '',
  avatar_url text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  plan text not null default 'professional',
  region text not null default 'eu',
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.workspace_role not null default 'member',
  status public.member_status not null default 'active',
  invited_email text,
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create table if not exists public.people (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  full_name text not null,
  role_title text,
  team text,
  status text not null default 'active',
  location text,
  avatar_url text,
  documents_count integer not null default 0,
  documents_due integer not null default 0,
  score integer not null default 0 check (score between 0 and 100),
  last_seen_label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  client text,
  location text,
  status public.project_status not null default 'planning',
  progress integer not null default 0 check (progress between 0 and 100),
  due_date date,
  manager_id uuid references public.people(id) on delete set null,
  manager_name text,
  team_size integer not null default 0,
  budget_amount numeric(14, 2),
  budget_currency text not null default 'EUR',
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_project_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.site_projects(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  role text,
  created_at timestamptz not null default now(),
  unique (project_id, person_id)
);

create table if not exists public.open_points (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.site_projects(id) on delete cascade,
  parent_id uuid references public.open_points(id) on delete cascade,
  type public.open_point_type not null,
  title text not null,
  description text not null default '',
  status public.work_item_status not null default 'open',
  done boolean not null default false,
  sort_order integer not null default 0,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint open_points_no_self_parent check (id <> parent_id)
);

create table if not exists public.open_point_assignees (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  open_point_id uuid not null references public.open_points(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (open_point_id, person_id)
);

create table if not exists public.site_defects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.site_projects(id) on delete cascade,
  open_point_id uuid references public.open_points(id) on delete set null,
  title text not null,
  description text not null default '',
  owner_id uuid references public.people(id) on delete set null,
  owner_name text,
  priority public.defect_priority not null default 'medium',
  status public.work_item_status not null default 'open',
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.site_projects(id) on delete cascade,
  title text not null,
  owner_id uuid references public.people(id) on delete set null,
  owner_name text,
  due_date date,
  done boolean not null default false,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_notes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.site_projects(id) on delete cascade,
  text text not null,
  pinned boolean not null default false,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.site_projects(id) on delete cascade,
  name text not null,
  kind public.document_kind not null default 'file',
  status public.document_status not null default 'draft',
  storage_bucket text,
  storage_path text,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_reports (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.site_projects(id) on delete cascade,
  name text not null,
  target text,
  status public.report_status not null default 'draft',
  storage_bucket text,
  storage_path text,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid references public.site_projects(id) on delete cascade,
  open_point_id uuid references public.open_points(id) on delete cascade,
  defect_id uuid references public.site_defects(id) on delete cascade,
  document_id uuid references public.site_documents(id) on delete cascade,
  kind public.attachment_kind not null default 'file',
  file_name text not null,
  mime_type text,
  size_bytes bigint,
  storage_bucket text not null default 'egrid-attachments',
  storage_path text not null,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.site_projects(id) on delete cascade,
  photo_required boolean not null default true,
  auto_reports boolean not null default true,
  customer_portal boolean not null default false,
  defect_approval boolean not null default true,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (project_id)
);

create index if not exists workspace_members_workspace_idx on public.workspace_members(workspace_id);
create index if not exists workspace_members_user_idx on public.workspace_members(user_id);
create index if not exists people_workspace_idx on public.people(workspace_id);
create index if not exists site_projects_workspace_idx on public.site_projects(workspace_id);
create index if not exists open_points_project_parent_idx on public.open_points(project_id, parent_id, sort_order);
create index if not exists open_points_workspace_idx on public.open_points(workspace_id);
create index if not exists open_point_assignees_open_point_idx on public.open_point_assignees(open_point_id);
create index if not exists site_defects_project_idx on public.site_defects(project_id);
create index if not exists site_defects_open_point_idx on public.site_defects(open_point_id);
create index if not exists site_tasks_project_idx on public.site_tasks(project_id);
create index if not exists site_notes_project_idx on public.site_notes(project_id);
create index if not exists site_documents_project_idx on public.site_documents(project_id);
create index if not exists site_reports_project_idx on public.site_reports(project_id);
create index if not exists attachments_workspace_idx on public.attachments(workspace_id);
create index if not exists attachments_open_point_idx on public.attachments(open_point_id);
create index if not exists attachments_defect_idx on public.attachments(defect_id);

create or replace function public.is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members member
    where member.workspace_id = target_workspace_id
      and member.user_id = auth.uid()
      and member.status = 'active'
  );
$$;

create or replace function public.has_workspace_role(target_workspace_id uuid, allowed_roles public.workspace_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members member
    where member.workspace_id = target_workspace_id
      and member.user_id = auth.uid()
      and member.status = 'active'
      and member.role = any(allowed_roles)
  );
$$;

create or replace function public.can_read_profile(profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select profile_id = auth.uid()
    or exists (
      select 1
      from public.workspace_members mine
      join public.workspace_members theirs on theirs.workspace_id = mine.workspace_id
      where mine.user_id = auth.uid()
        and theirs.user_id = profile_id
        and mine.status = 'active'
        and theirs.status = 'active'
    );
$$;

create or replace function public.can_create_workspace_member(
  target_workspace_id uuid,
  target_user_id uuid,
  target_role public.workspace_role,
  target_status public.member_status
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (
    target_user_id = auth.uid()
    and target_role = 'owner'
    and target_status = 'active'
    and exists (
      select 1
      from public.workspaces workspace
      where workspace.id = target_workspace_id
        and workspace.created_by = auth.uid()
    )
    and not exists (
      select 1
      from public.workspace_members member
      where member.workspace_id = target_workspace_id
    )
  )
  or public.has_workspace_role(target_workspace_id, array['owner','admin']::public.workspace_role[]);
$$;

grant execute on function public.is_workspace_member(uuid) to authenticated;
grant execute on function public.has_workspace_role(uuid, public.workspace_role[]) to authenticated;
grant execute on function public.can_read_profile(uuid) to authenticated;
grant execute on function public.can_create_workspace_member(uuid, uuid, public.workspace_role, public.member_status) to authenticated;

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.people enable row level security;
alter table public.site_projects enable row level security;
alter table public.site_project_members enable row level security;
alter table public.open_points enable row level security;
alter table public.open_point_assignees enable row level security;
alter table public.site_defects enable row level security;
alter table public.site_tasks enable row level security;
alter table public.site_notes enable row level security;
alter table public.site_documents enable row level security;
alter table public.site_reports enable row level security;
alter table public.attachments enable row level security;
alter table public.site_settings enable row level security;

drop policy if exists "Profiles are visible to self and workspace peers" on public.profiles;
create policy "Profiles are visible to self and workspace peers"
on public.profiles for select
to authenticated
using (public.can_read_profile(id));

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
on public.profiles for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "Workspace members can read workspaces" on public.workspaces;
create policy "Workspace members can read workspaces"
on public.workspaces for select
to authenticated
using (public.is_workspace_member(id));

drop policy if exists "Authenticated users can create workspaces" on public.workspaces;
create policy "Authenticated users can create workspaces"
on public.workspaces for insert
to authenticated
with check (created_by = auth.uid());

drop policy if exists "Workspace admins can update workspaces" on public.workspaces;
create policy "Workspace admins can update workspaces"
on public.workspaces for update
to authenticated
using (public.has_workspace_role(id, array['owner','admin']::public.workspace_role[]))
with check (public.has_workspace_role(id, array['owner','admin']::public.workspace_role[]));

drop policy if exists "Workspace owners can delete workspaces" on public.workspaces;
create policy "Workspace owners can delete workspaces"
on public.workspaces for delete
to authenticated
using (public.has_workspace_role(id, array['owner']::public.workspace_role[]));

drop policy if exists "Workspace members can read memberships" on public.workspace_members;
create policy "Workspace members can read memberships"
on public.workspace_members for select
to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "Users can create own bootstrap membership" on public.workspace_members;
create policy "Users can create own bootstrap membership"
on public.workspace_members for insert
to authenticated
with check (public.can_create_workspace_member(workspace_id, user_id, role, status));

drop policy if exists "Workspace admins can update memberships" on public.workspace_members;
create policy "Workspace admins can update memberships"
on public.workspace_members for update
to authenticated
using (public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_role[]))
with check (public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_role[]));

drop policy if exists "Workspace admins can delete memberships" on public.workspace_members;
create policy "Workspace admins can delete memberships"
on public.workspace_members for delete
to authenticated
using (public.has_workspace_role(workspace_id, array['owner','admin']::public.workspace_role[]));

drop policy if exists "Workspace members can read people" on public.people;
create policy "Workspace members can read people"
on public.people for select to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "Workspace members can write people" on public.people;
create policy "Workspace members can write people"
on public.people for all to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists "Workspace members can read site projects" on public.site_projects;
create policy "Workspace members can read site projects"
on public.site_projects for select to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "Workspace members can write site projects" on public.site_projects;
create policy "Workspace members can write site projects"
on public.site_projects for all to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists "Workspace members can manage site project members" on public.site_project_members;
create policy "Workspace members can manage site project members"
on public.site_project_members for all to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists "Workspace members can manage open points" on public.open_points;
create policy "Workspace members can manage open points"
on public.open_points for all to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists "Workspace members can manage open point assignees" on public.open_point_assignees;
create policy "Workspace members can manage open point assignees"
on public.open_point_assignees for all to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists "Workspace members can manage site defects" on public.site_defects;
create policy "Workspace members can manage site defects"
on public.site_defects for all to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists "Workspace members can manage site tasks" on public.site_tasks;
create policy "Workspace members can manage site tasks"
on public.site_tasks for all to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists "Workspace members can manage site notes" on public.site_notes;
create policy "Workspace members can manage site notes"
on public.site_notes for all to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists "Workspace members can manage site documents" on public.site_documents;
create policy "Workspace members can manage site documents"
on public.site_documents for all to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists "Workspace members can manage site reports" on public.site_reports;
create policy "Workspace members can manage site reports"
on public.site_reports for all to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists "Workspace members can manage attachments" on public.attachments;
create policy "Workspace members can manage attachments"
on public.attachments for all to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists "Workspace members can manage site settings" on public.site_settings;
create policy "Workspace members can manage site settings"
on public.site_settings for all to authenticated
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'profiles',
    'workspaces',
    'workspace_members',
    'people',
    'site_projects',
    'open_points',
    'site_defects',
    'site_tasks',
    'site_notes',
    'site_documents',
    'site_reports',
    'site_settings'
  ]
  loop
    execute format('drop trigger if exists set_%I_updated_at on public.%I', table_name, table_name);
    execute format('create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()', table_name, table_name);
  end loop;
end $$;

insert into storage.buckets (id, name, public)
values ('egrid-attachments', 'egrid-attachments', false)
on conflict (id) do nothing;

drop policy if exists "Workspace members can read VYSNpro attachments" on storage.objects;
create policy "Workspace members can read VYSNpro attachments"
on storage.objects for select
to authenticated
using (
  bucket_id = 'egrid-attachments'
  and (storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$'
  and public.is_workspace_member(((storage.foldername(name))[1])::uuid)
);

drop policy if exists "Workspace members can upload VYSNpro attachments" on storage.objects;
create policy "Workspace members can upload VYSNpro attachments"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'egrid-attachments'
  and (storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$'
  and public.is_workspace_member(((storage.foldername(name))[1])::uuid)
);

drop policy if exists "Workspace members can update VYSNpro attachments" on storage.objects;
create policy "Workspace members can update VYSNpro attachments"
on storage.objects for update
to authenticated
using (
  bucket_id = 'egrid-attachments'
  and (storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$'
  and public.is_workspace_member(((storage.foldername(name))[1])::uuid)
)
with check (
  bucket_id = 'egrid-attachments'
  and (storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$'
  and public.is_workspace_member(((storage.foldername(name))[1])::uuid)
);

drop policy if exists "Workspace members can delete VYSNpro attachments" on storage.objects;
create policy "Workspace members can delete VYSNpro attachments"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'egrid-attachments'
  and (storage.foldername(name))[1] ~* '^[0-9a-f-]{36}$'
  and public.is_workspace_member(((storage.foldername(name))[1])::uuid)
);
