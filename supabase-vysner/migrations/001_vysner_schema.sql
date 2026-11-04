-- VYSNER – eigene Datenbankstruktur (getrennt von eGrid).
-- Läuft in der eigenen VYSNER-Supabase. Mehrfach ausführbar.
--
-- Aufbau: eine Firma (companies) hat Mitarbeiter (people), Baustellen (sites) und alles,
-- was daran hängt. Die Spalten folgen dem Datenmodell der App (src/lib/store/types.ts).
-- Ids sind Text, damit die Ids der App und die uuids aus eGrid gleichermaßen passen.
-- Listen innerhalb eines Datensatzes (Fotos, Arbeitszeilen, Unterschriften …) liegen als jsonb.
-- imported_at ist bei Datensätzen aus eGrid gesetzt – der Import pflegt nur diese.

create extension if not exists pgcrypto;

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ------------------------------------------------------------------ Firma und Zugang

create table if not exists public.companies (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  address text not null default '',
  legal_form text not null default '',
  seat text not null default '',
  fb_no text not null default '',
  fb_court text not null default '',
  uid text not null default '',
  phone text not null default '',
  email text not null default '',
  web text not null default '',
  -- Module, Aufträge pro Tag, eigene Dokumentordner, Kalender-Layout
  settings jsonb not null default '{}'::jsonb,
  imported_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.people (
  id text primary key default gen_random_uuid()::text,
  company_id text not null references public.companies(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  role text not null default '',
  phone text not null default '',
  email text not null default '',
  active boolean not null default true,
  lead boolean not null default false,
  personnel_no text not null default '',
  first_name text not null default '',
  last_name text not null default '',
  employer text not null default '',
  birth_date date,
  sv_no text not null default '',
  street text not null default '',
  zip text not null default '',
  city text not null default '',
  entry_date date,
  exit_date date,
  employment text not null default '',
  weekly_hours numeric(5, 2),
  trade text not null default '',
  qualifications text[] not null default '{}',
  licenses text not null default '',
  emergency_name text not null default '',
  emergency_phone text not null default '',
  note text not null default '',
  imported_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Wer sich anmelden darf. user_id wird beim ersten Login über die E-Mail verknüpft.
create table if not exists public.company_members (
  id text primary key default gen_random_uuid()::text,
  company_id text not null references public.companies(id) on delete cascade,
  email text not null,
  user_id uuid references auth.users(id) on delete cascade,
  person_id text references public.people(id) on delete set null,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  active boolean not null default true,
  imported_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, email)
);

-- ------------------------------------------------------------------ Baustellen

create table if not exists public.sites (
  id text primary key default gen_random_uuid()::text,
  company_id text not null references public.companies(id) on delete cascade,
  number text not null default '',
  name text not null,
  client text not null default '',
  address text not null default '',
  status text not null default 'geplant' check (status in ('geplant', 'aktiv', 'abnahme', 'pausiert', 'archiviert')),
  start_date date,
  end_date date,
  manager_id text references public.people(id) on delete set null,
  member_ids text[] not null default '{}',
  color text not null default '#0e5a7a',
  note text not null default '',
  created_by text,
  updated_by text,
  imported_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.points (
  id text primary key default gen_random_uuid()::text,
  company_id text not null references public.companies(id) on delete cascade,
  site_id text not null references public.sites(id) on delete cascade,
  parent_id text references public.points(id) on delete cascade deferrable initially immediate,
  type text not null check (type in ('bereich', 'abschnitt', 'unterabschnitt', 'punkt')),
  title text not null,
  note text not null default '',
  status text not null default 'offen' check (status in ('offen', 'in_arbeit', 'erledigt')),
  assignee_ids text[] not null default '{}',
  due date,
  sort_order integer not null default 0,
  files jsonb not null default '[]'::jsonb,
  done_by text,
  done_at timestamptz,
  created_by text,
  updated_by text,
  imported_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.defects (
  id text primary key default gen_random_uuid()::text,
  company_id text not null references public.companies(id) on delete cascade,
  site_id text not null references public.sites(id) on delete cascade,
  no integer not null default 0,
  point_id text references public.points(id) on delete set null,
  title text not null,
  description text not null default '',
  location text not null default '',
  status text not null default 'offen' check (status in ('offen', 'in_arbeit', 'behoben', 'abgenommen')),
  priority text not null default 'mittel' check (priority in ('hoch', 'mittel', 'niedrig')),
  owner_id text references public.people(id) on delete set null,
  due date,
  files jsonb not null default '[]'::jsonb,
  fix_files jsonb not null default '[]'::jsonb,
  fixed_by text,
  fixed_at timestamptz,
  created_by text,
  updated_by text,
  imported_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id text primary key default gen_random_uuid()::text,
  company_id text not null references public.companies(id) on delete cascade,
  -- leer = ohne Baustelle
  site_id text references public.sites(id) on delete cascade,
  title text not null,
  note text not null default '',
  owner_id text references public.people(id) on delete set null,
  status text not null default 'offen' check (status in ('offen', 'in_arbeit', 'erledigt')),
  priority text not null default 'mittel' check (priority in ('hoch', 'mittel', 'niedrig')),
  due date,
  done_at timestamptz,
  created_by text,
  updated_by text,
  imported_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notes (
  id text primary key default gen_random_uuid()::text,
  company_id text not null references public.companies(id) on delete cascade,
  -- leer = persönliche Notiz
  site_id text references public.sites(id) on delete cascade,
  text text not null default '',
  color text not null default 'yellow',
  sort_order integer not null default 0,
  created_by text,
  updated_by text,
  imported_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------------ Planung

create table if not exists public.calendar_entries (
  id text primary key default gen_random_uuid()::text,
  company_id text not null references public.companies(id) on delete cascade,
  site_id text references public.sites(id) on delete cascade,
  -- Zeile: Person oder freie Zeile (Kran, Lieferung …)
  row_id text not null,
  title text not null default '',
  color text not null default '',
  start_date date not null,
  end_date date not null,
  start_pm boolean not null default false,
  end_am boolean not null default false,
  note text not null default '',
  done boolean not null default false,
  symbol boolean not null default false,
  icon text not null default '',
  comment text not null default '',
  links text[] not null default '{}',
  created_by text,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.absences (
  id text primary key default gen_random_uuid()::text,
  company_id text not null references public.companies(id) on delete cascade,
  person_id text not null references public.people(id) on delete cascade,
  type text not null check (type in ('urlaub', 'krank', 'za', 'schulung')),
  start_date date not null,
  end_date date not null,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------------ Material

create table if not exists public.materials (
  id text primary key default gen_random_uuid()::text,
  company_id text not null references public.companies(id) on delete cascade,
  site_id text references public.sites(id) on delete cascade,
  name text not null,
  art_no text not null default '',
  barcode text not null default '',
  qty numeric(14, 3) not null default 0,
  unit text not null default 'Stk',
  min_qty numeric(14, 3) not null default 0,
  supplier text not null default '',
  ordered boolean not null default false,
  ordered_at timestamptz,
  ordered_qty numeric(14, 3),
  requested_qty numeric(14, 3),
  requested_by text,
  requested_at timestamptz,
  note text not null default '',
  -- Buchungen: Entnahme, Zugang, Anforderung, Bestellung, Korrektur
  log jsonb not null default '[]'::jsonb,
  created_by text,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------------ Service

create table if not exists public.customers (
  id text primary key default gen_random_uuid()::text,
  company_id text not null references public.companies(id) on delete cascade,
  no text not null default '',
  name text not null,
  contact text not null default '',
  street text not null default '',
  zip text not null default '',
  city text not null default '',
  phone text not null default '',
  email text not null default '',
  uid text not null default '',
  note text not null default '',
  created_by text,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.service_orders (
  id text primary key default gen_random_uuid()::text,
  company_id text not null references public.companies(id) on delete cascade,
  no text not null default '',
  customer_id text not null references public.customers(id) on delete restrict,
  street text not null default '',
  zip text not null default '',
  city text not null default '',
  title text not null,
  description text not null default '',
  priority text not null default 'mittel' check (priority in ('hoch', 'mittel', 'niedrig')),
  tech_id text references public.people(id) on delete set null,
  date date,
  seq integer not null default 0,
  status text not null default 'offen' check (status in ('offen', 'geplant', 'in_arbeit', 'erledigt', 'freigegeben')),
  times jsonb not null default '[]'::jsonb,
  work_done text not null default '',
  materials jsonb not null default '[]'::jsonb,
  files jsonb not null default '[]'::jsonb,
  created_by text,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------------ Berichte (Bautagesbericht, Regieschein, Servicebericht)

create table if not exists public.reports (
  id text primary key default gen_random_uuid()::text,
  company_id text not null references public.companies(id) on delete cascade,
  kind text not null check (kind in ('bautagesbericht', 'regie', 'service')),
  no text not null,
  status text not null default 'entwurf' check (status in ('entwurf', 'unterschrieben', 'freigegeben', 'zurueck')),
  site_id text references public.sites(id) on delete cascade,
  order_id text references public.service_orders(id) on delete cascade,
  customer_id text references public.customers(id) on delete set null,
  date date not null,
  ordered_by text not null default '',
  reason text not null default '',
  text text not null default '',
  workers jsonb not null default '[]'::jsonb,
  materials jsonb not null default '[]'::jsonb,
  devices jsonb not null default '[]'::jsonb,
  -- Wetter, Temperaturen, Behinderungen, Anweisungen, Besuche, Lieferungen, Übernahme
  details jsonb not null default '{}'::jsonb,
  files jsonb not null default '[]'::jsonb,
  sign_client jsonb,
  sign_contractor jsonb,
  pdf jsonb,
  hash text,
  approved_by text,
  approved_at timestamptz,
  return_note text,
  created_by text,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, no)
);

-- ------------------------------------------------------------------ Dokumente

create table if not exists public.docs (
  id text primary key default gen_random_uuid()::text,
  company_id text not null references public.companies(id) on delete cascade,
  scope text not null check (scope in ('firma', 'baustelle', 'kunde')),
  site_id text references public.sites(id) on delete cascade,
  customer_id text references public.customers(id) on delete cascade,
  folder text not null default 'Sonstiges',
  -- { id, name, mime, size, addedBy, addedAt, path } – path = Ablage im Bucket vysner-files
  file jsonb not null,
  note text not null default '',
  created_by text,
  updated_by text,
  imported_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------------ Indizes und Zeitstempel

create index if not exists people_company_idx on public.people(company_id);
create index if not exists members_user_idx on public.company_members(user_id);
create index if not exists members_email_idx on public.company_members(lower(email));
create index if not exists sites_company_idx on public.sites(company_id);
create index if not exists points_site_idx on public.points(site_id, parent_id, sort_order);
create index if not exists defects_site_idx on public.defects(site_id);
create index if not exists tasks_site_idx on public.tasks(company_id, site_id);
create index if not exists notes_site_idx on public.notes(company_id, site_id);
create index if not exists entries_company_idx on public.calendar_entries(company_id, start_date);
create index if not exists absences_person_idx on public.absences(person_id);
create index if not exists materials_site_idx on public.materials(company_id, site_id);
create index if not exists customers_company_idx on public.customers(company_id);
create index if not exists orders_company_idx on public.service_orders(company_id, date);
create index if not exists reports_company_idx on public.reports(company_id, site_id);
create index if not exists docs_place_idx on public.docs(company_id, scope, site_id, customer_id);

do $$
declare t text;
begin
  foreach t in array array['companies', 'people', 'company_members', 'sites', 'points', 'defects', 'tasks', 'notes',
    'calendar_entries', 'absences', 'materials', 'customers', 'service_orders', 'reports', 'docs']
  loop
    execute format('drop trigger if exists touch on public.%I', t);
    execute format('create trigger touch before update on public.%I for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;

-- ------------------------------------------------------------------ Login mit Mitarbeiter verknüpfen

-- Wer sich zum ersten Mal anmeldet (Einladung per E-Mail), wird über die E-Mail seiner Firma
-- und seinem Mitarbeiter-Eintrag zugeordnet.
create or replace function public.link_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.company_members set user_id = new.id where user_id is null and lower(email) = lower(new.email);
  update public.people p set user_id = new.id
    where p.user_id is null and (lower(p.email) = lower(new.email)
      or p.id in (select person_id from public.company_members where user_id = new.id));
  return new;
end $$;

drop trigger if exists vysner_link_new_user on auth.users;
create trigger vysner_link_new_user after insert on auth.users for each row execute function public.link_new_user();

-- ------------------------------------------------------------------ Rechte (Row Level Security)

-- Mitglied der Firma?
create or replace function public.is_member(c text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from company_members m where m.company_id = c and m.user_id = auth.uid() and m.active);
$$;

-- Eigener Mitarbeiter-Eintrag in der Firma
create or replace function public.my_person(c text)
returns text language sql stable security definer set search_path = public as $$
  select coalesce(
    (select m.person_id from company_members m where m.company_id = c and m.user_id = auth.uid() and m.active and m.person_id is not null limit 1),
    (select p.id from people p where p.company_id = c and p.user_id = auth.uid() limit 1));
$$;

-- Team- oder Bauleitung: sieht alle Baustellen und darf freigeben
create or replace function public.is_lead(c text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from company_members m where m.company_id = c and m.user_id = auth.uid() and m.active and m.role in ('owner', 'admin'))
    or exists (select 1 from people p where p.id = public.my_person(c) and p.lead);
$$;

-- Baustelle sichtbar? Leitung immer, sonst Bauleiter, Team oder wer sie angelegt hat
create or replace function public.can_see_site(s text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from sites x
    where x.id = s and public.is_member(x.company_id)
      and (public.is_lead(x.company_id) or x.manager_id = public.my_person(x.company_id)
        or public.my_person(x.company_id) = any(x.member_ids) or x.created_by = public.my_person(x.company_id)));
$$;

grant execute on function public.is_member(text), public.my_person(text), public.is_lead(text), public.can_see_site(text) to authenticated;

do $$
declare t text;
begin
  foreach t in array array['companies', 'people', 'company_members', 'sites', 'points', 'defects', 'tasks', 'notes',
    'calendar_entries', 'absences', 'materials', 'customers', 'service_orders', 'reports', 'docs']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists vysner_read on public.%I', t);
    execute format('drop policy if exists vysner_write on public.%I', t);
  end loop;
end $$;

-- Firma: lesen alle Mitglieder, ändern nur die Leitung
create policy vysner_read on public.companies for select to authenticated using (public.is_member(id));
create policy vysner_write on public.companies for update to authenticated using (public.is_lead(id)) with check (public.is_lead(id));

-- Zugänge: lesen alle Mitglieder, verwalten nur die Leitung
create policy vysner_read on public.company_members for select to authenticated using (public.is_member(company_id));
create policy vysner_write on public.company_members for all to authenticated using (public.is_lead(company_id)) with check (public.is_lead(company_id));

-- Firmenweite Listen: alle Mitglieder (wie in der App: Stammdaten, Planner, Kunden, Service)
do $$
declare t text;
begin
  foreach t in array array['people', 'calendar_entries', 'absences', 'customers', 'service_orders']
  loop
    execute format('create policy vysner_read on public.%I for select to authenticated using (public.is_member(company_id))', t);
    execute format('create policy vysner_write on public.%I for all to authenticated using (public.is_member(company_id)) with check (public.is_member(company_id))', t);
  end loop;
end $$;

-- Baustellen: nur sichtbare; anlegen darf jedes Mitglied
create policy vysner_read on public.sites for select to authenticated using (public.can_see_site(id) or (public.is_member(company_id) and created_by = public.my_person(company_id)));
create policy vysner_write on public.sites for all to authenticated
  using (public.can_see_site(id))
  with check (public.is_member(company_id));

-- An Baustellen gebunden: nur wer die Baustelle sieht; ohne Baustelle alle Mitglieder
do $$
declare t text;
begin
  foreach t in array array['points', 'defects', 'tasks', 'materials', 'reports', 'docs']
  loop
    execute format($p$create policy vysner_read on public.%I for select to authenticated
      using (public.is_member(company_id) and (site_id is null or public.can_see_site(site_id)))$p$, t);
    execute format($p$create policy vysner_write on public.%I for all to authenticated
      using (public.is_member(company_id) and (site_id is null or public.can_see_site(site_id)))
      with check (public.is_member(company_id) and (site_id is null or public.can_see_site(site_id)))$p$, t);
  end loop;
end $$;

-- Notizen ohne Baustelle sind persönlich
create policy vysner_read on public.notes for select to authenticated
  using (public.is_member(company_id) and (case when site_id is null then created_by = public.my_person(company_id) else public.can_see_site(site_id) end));
create policy vysner_write on public.notes for all to authenticated
  using (public.is_member(company_id) and (case when site_id is null then created_by = public.my_person(company_id) else public.can_see_site(site_id) end))
  with check (public.is_member(company_id) and (site_id is null or public.can_see_site(site_id)));

grant select, insert, update, delete on all tables in schema public to authenticated;
revoke all on all tables in schema public from anon;

-- ------------------------------------------------------------------ Dateien (Storage)

-- Privater Bucket; Pfad beginnt mit der Firmen-Id: {company_id}/…
insert into storage.buckets (id, name, public, file_size_limit)
values ('vysner-files', 'vysner-files', false, 52428800)
on conflict (id) do nothing;

drop policy if exists vysner_files_read on storage.objects;
drop policy if exists vysner_files_write on storage.objects;
drop policy if exists vysner_files_change on storage.objects;
drop policy if exists vysner_files_delete on storage.objects;
create policy vysner_files_read on storage.objects for select to authenticated
  using (bucket_id = 'vysner-files' and public.is_member((storage.foldername(name))[1]));
create policy vysner_files_write on storage.objects for insert to authenticated
  with check (bucket_id = 'vysner-files' and public.is_member((storage.foldername(name))[1]));
create policy vysner_files_change on storage.objects for update to authenticated
  using (bucket_id = 'vysner-files' and public.is_member((storage.foldername(name))[1]));
create policy vysner_files_delete on storage.objects for delete to authenticated
  using (bucket_id = 'vysner-files' and public.is_member((storage.foldername(name))[1]));
