-- eGrid → VYSNER: rechnet die gelesenen eGrid-Zeilen in die VYSNER-Struktur um.
-- Läuft in der VYSNER-Datenbank. Quelle ist import_egrid.raw (tbl, row) – vom Skript vps/30-import.sh befüllt.
-- Beliebig oft wiederholbar: Datensätze aus eGrid werden aktualisiert, in eGrid gelöschte entfernt,
-- in VYSNER neu angelegte Datensätze bleiben unberührt.
-- Fehlende Spalten (andere eGrid-Version) ergeben leere Werte statt eines Fehlers.

\set ON_ERROR_STOP on
begin;

create temporary view r as select tbl, row from import_egrid.raw;
create temporary table run as select now() as at;

-- Hilfen
create or replace function pg_temp.d(v text) returns date language sql immutable as $$ select nullif(v, '')::date $$;
create or replace function pg_temp.ts(v text) returns timestamptz language sql immutable as $$ select nullif(v, '')::timestamptz $$;

-- Login-Id → Mitarbeiter (für "hochgeladen von")
create temporary table who as select distinct on (row->>'user_id') row->>'user_id' as user_id, row->>'id' as person
from r where tbl = 'people' and row->>'user_id' is not null;
create index on who (user_id);

-- Dateien eines Datensatzes als FileRef-Liste
create temporary table att as
select row->>'id' as id, row->>'open_point_id' as point, row->>'defect_id' as defect, row->>'document_id' as document,
  row->>'project_id' as project, row->>'workspace_id' as company, coalesce(row->>'kind', 'file') as kind,
  jsonb_build_object('id', row->>'id', 'name', coalesce(row->>'file_name', 'Datei'), 'mime', coalesce(row->>'mime_type', 'application/octet-stream'),
    'size', coalesce((row->>'size_bytes')::bigint, 0), 'addedBy', coalesce(w.person, ''), 'addedAt', coalesce(row->>'created_at', ''),
    'path', row->>'storage_path') as ref,
  coalesce(row->>'created_at', '') as at
from r left join who w on w.user_id = row->>'created_by'
where tbl = 'attachments' and coalesce(row->>'storage_path', '') <> '';

create temporary table point_files as select point as id, jsonb_agg(ref order by at) as files from att where point is not null and defect is null group by point;
create temporary table defect_files as select defect as id, jsonb_agg(ref order by at) as files from att where defect is not null group by defect;
create temporary table assignees as select row->>'open_point_id' as id, array_agg(distinct row->>'person_id') as ids from r where tbl = 'open_point_assignees' group by 1;
create temporary table site_team as select row->>'project_id' as id, array_agg(distinct row->>'person_id') as ids from r where tbl = 'site_project_members' group by 1;
create index on point_files (id);
create index on defect_files (id);
create index on assignees (id);
create index on site_team (id);

-- ------------------------------------------------------------------ Firmen
insert into public.companies (id, name, settings, imported_at, created_at)
select row->>'id', coalesce(nullif(row->>'name', ''), 'Firma'),
  jsonb_build_object('egridSlug', row->>'slug'), (select at from run), coalesce(pg_temp.ts(row->>'created_at'), now())
from r where tbl = 'workspaces'
on conflict (id) do update set name = excluded.name, imported_at = excluded.imported_at;

-- ------------------------------------------------------------------ Mitarbeiter (E-Mail aus dem eGrid-Login)
create temporary table mail as select row->>'id' as user_id, row->>'email' as email from r where tbl = 'auth.users';

insert into public.people (id, company_id, name, role, email, active, note, imported_at, created_at)
select p.row->>'id', p.row->>'workspace_id', coalesce(nullif(p.row->>'full_name', ''), 'Unbenannt'), coalesce(p.row->>'role_title', ''),
  coalesce(m.email, ''), coalesce(p.row->>'status', 'active') = 'active',
  concat_ws(' · ', nullif(p.row->>'team', ''), nullif(p.row->>'location', '')), (select at from run), coalesce(pg_temp.ts(p.row->>'created_at'), now())
from r p left join mail m on m.user_id = p.row->>'user_id'
where p.tbl = 'people' and exists (select 1 from public.companies c where c.id = p.row->>'workspace_id')
on conflict (id) do update set name = excluded.name, role = excluded.role, email = coalesce(nullif(excluded.email, ''), public.people.email),
  active = excluded.active, imported_at = excluded.imported_at;

-- Zugänge: Inhaber und Admins dürfen freigeben (Leitung)
insert into public.company_members (id, company_id, email, person_id, role, active, imported_at)
select w.row->>'id', w.row->>'workspace_id', lower(coalesce(m.email, w.row->>'invited_email')),
  (select p.row->>'id' from r p where p.tbl = 'people' and p.row->>'user_id' = w.row->>'user_id' and p.row->>'workspace_id' = w.row->>'workspace_id' limit 1),
  case w.row->>'role' when 'owner' then 'owner' when 'admin' then 'admin' else 'member' end,
  coalesce(w.row->>'status', 'active') <> 'disabled', (select at from run)
from r w left join mail m on m.user_id = w.row->>'user_id'
where w.tbl = 'workspace_members' and coalesce(m.email, w.row->>'invited_email') is not null
  and exists (select 1 from public.companies c where c.id = w.row->>'workspace_id')
on conflict (company_id, email) do update set person_id = excluded.person_id, role = excluded.role, active = excluded.active, imported_at = excluded.imported_at;

update public.people p set lead = true
from public.company_members m where m.person_id = p.id and m.role in ('owner', 'admin') and m.imported_at = (select at from run);

-- ------------------------------------------------------------------ Baustellen mit Team
insert into public.sites (id, company_id, name, client, address, status, end_date, manager_id, member_ids, color, imported_at, created_at)
select s.row->>'id', s.row->>'workspace_id', coalesce(nullif(s.row->>'name', ''), 'Baustelle'), coalesce(s.row->>'client', ''), coalesce(s.row->>'location', ''),
  case s.row->>'status' when 'active' then 'aktiv' when 'handover' then 'abnahme' when 'paused' then 'pausiert' when 'archived' then 'archiviert' else 'geplant' end,
  pg_temp.d(s.row->>'due_date'),
  (select id from public.people where id = s.row->>'manager_id'),
  coalesce((select ids from site_team t where t.id = s.row->>'id'), '{}'),
  (array['#0e5a7a', '#3d6b45', '#7a4e0e', '#5a3d7a', '#7a1f2b', '#2f4f6f', '#56606b'])[1 + (row_number() over (order by s.row->>'created_at') - 1)::int % 7],
  (select at from run), coalesce(pg_temp.ts(s.row->>'created_at'), now())
from r s where s.tbl = 'site_projects' and exists (select 1 from public.companies c where c.id = s.row->>'workspace_id')
on conflict (id) do update set name = excluded.name, client = excluded.client, address = excluded.address, status = excluded.status,
  end_date = excluded.end_date, manager_id = excluded.manager_id, member_ids = excluded.member_ids, imported_at = excluded.imported_at;

-- ------------------------------------------------------------------ Checkliste (Bereich › Abschnitt › Unterabschnitt › Punkt)
-- Eltern und Kinder in beliebiger Reihenfolge: die Prüfung auf den übergeordneten Punkt erfolgt erst am Ende
set constraints all deferred;
insert into public.points (id, company_id, site_id, parent_id, type, title, note, status, assignee_ids, sort_order, files, done_at, imported_at, created_at)
select p.row->>'id', p.row->>'workspace_id', p.row->>'project_id', nullif(p.row->>'parent_id', ''),
  case p.row->>'type' when 'area' then 'bereich' when 'section' then 'abschnitt' when 'subsection' then 'unterabschnitt' else 'punkt' end,
  coalesce(nullif(p.row->>'title', ''), 'Punkt'), coalesce(p.row->>'description', ''),
  case when p.row->>'status' = 'done' or p.row->>'done' = 'true' then 'erledigt' when p.row->>'status' = 'in_progress' then 'in_arbeit' else 'offen' end,
  coalesce((select ids from assignees a where a.id = p.row->>'id'), '{}'),
  coalesce((p.row->>'sort_order')::int, 0),
  coalesce((select files from point_files f where f.id = p.row->>'id'), '[]'),
  case when p.row->>'status' = 'done' or p.row->>'done' = 'true' then pg_temp.ts(p.row->>'updated_at') end,
  (select at from run), coalesce(pg_temp.ts(p.row->>'created_at'), now())
from r p where p.tbl = 'open_points' and exists (select 1 from public.sites s where s.id = p.row->>'project_id')
on conflict (id) do update set parent_id = excluded.parent_id, type = excluded.type, title = excluded.title, note = excluded.note,
  status = excluded.status, assignee_ids = excluded.assignee_ids, sort_order = excluded.sort_order, files = excluded.files,
  done_at = excluded.done_at, imported_at = excluded.imported_at;
update public.points x set parent_id = null where parent_id is not null and not exists (select 1 from public.points y where y.id = x.parent_id);

-- ------------------------------------------------------------------ Mängel
insert into public.defects (id, company_id, site_id, no, point_id, title, description, status, priority, owner_id, files, fixed_at, imported_at, created_at)
select d.row->>'id', d.row->>'workspace_id', d.row->>'project_id',
  row_number() over (partition by d.row->>'project_id' order by d.row->>'created_at', d.row->>'id'),
  (select id from public.points where id = d.row->>'open_point_id'),
  coalesce(nullif(d.row->>'title', ''), 'Mangel'), coalesce(d.row->>'description', ''),
  case d.row->>'status' when 'done' then 'behoben' when 'in_progress' then 'in_arbeit' else 'offen' end,
  case d.row->>'priority' when 'high' then 'hoch' when 'low' then 'niedrig' else 'mittel' end,
  (select id from public.people where id = d.row->>'owner_id'),
  coalesce((select files from defect_files f where f.id = d.row->>'id'), '[]'),
  pg_temp.ts(d.row->>'closed_at'), (select at from run), coalesce(pg_temp.ts(d.row->>'created_at'), now())
from r d where d.tbl = 'site_defects' and exists (select 1 from public.sites s where s.id = d.row->>'project_id')
on conflict (id) do update set no = excluded.no, point_id = excluded.point_id, title = excluded.title, description = excluded.description,
  status = excluded.status, priority = excluded.priority, owner_id = excluded.owner_id, files = excluded.files,
  fixed_at = excluded.fixed_at, imported_at = excluded.imported_at;

-- ------------------------------------------------------------------ Aufgaben und Notizen
insert into public.tasks (id, company_id, site_id, title, owner_id, status, due, imported_at, created_at)
select t.row->>'id', t.row->>'workspace_id', t.row->>'project_id', coalesce(nullif(t.row->>'title', ''), 'Aufgabe'),
  (select id from public.people where id = t.row->>'owner_id'),
  case when t.row->>'done' = 'true' then 'erledigt' else 'offen' end, pg_temp.d(t.row->>'due_date'),
  (select at from run), coalesce(pg_temp.ts(t.row->>'created_at'), now())
from r t where t.tbl = 'site_tasks' and exists (select 1 from public.sites s where s.id = t.row->>'project_id')
on conflict (id) do update set title = excluded.title, owner_id = excluded.owner_id, status = excluded.status, due = excluded.due, imported_at = excluded.imported_at;

insert into public.notes (id, company_id, site_id, text, color, sort_order, imported_at, created_at)
select n.row->>'id', n.row->>'workspace_id', n.row->>'project_id', coalesce(n.row->>'text', ''),
  case when n.row->>'pinned' = 'true' then 'red' else 'yellow' end,
  (row_number() over (partition by n.row->>'project_id' order by n.row->>'pinned' desc, n.row->>'created_at' desc))::int,
  (select at from run), coalesce(pg_temp.ts(n.row->>'created_at'), now())
from r n where n.tbl = 'site_notes' and exists (select 1 from public.sites s where s.id = n.row->>'project_id')
on conflict (id) do update set text = excluded.text, color = excluded.color, sort_order = excluded.sort_order, imported_at = excluded.imported_at;

-- ------------------------------------------------------------------ Dokumente
-- Dokumente, eGrid-Berichte (PDF) und lose Anhänge einer Baustelle landen in der Dokumentablage der Baustelle.
create temporary table src_docs as
select x.row->>'id' as id, x.row->>'workspace_id' as company, x.row->>'project_id' as project,
  case x.row->>'kind' when 'photo' then 'Fotos' when 'protocol' then 'Protokolle' when 'plan' then 'Pläne' when 'report' then 'Berichte eGrid' else 'Sonstiges' end as folder,
  jsonb_build_object('id', x.row->>'id', 'name', coalesce(nullif(x.row->>'name', ''), 'Dokument'), 'mime', 'application/octet-stream', 'size', 0,
    'addedBy', coalesce((select person from who where user_id = x.row->>'created_by'), ''), 'addedAt', coalesce(x.row->>'created_at', ''), 'path', x.row->>'storage_path') as file,
  x.row->>'created_at' as at
from r x where x.tbl = 'site_documents' and coalesce(x.row->>'storage_path', '') <> ''
union all
select x.row->>'id', x.row->>'workspace_id', x.row->>'project_id', 'Berichte eGrid',
  jsonb_build_object('id', x.row->>'id', 'name', coalesce(nullif(x.row->>'name', ''), 'Bericht'), 'mime', 'application/pdf', 'size', 0,
    'addedBy', coalesce((select person from who where user_id = x.row->>'created_by'), ''), 'addedAt', coalesce(x.row->>'created_at', ''), 'path', x.row->>'storage_path'),
  x.row->>'created_at'
from r x where x.tbl = 'site_reports' and coalesce(x.row->>'storage_path', '') <> ''
union all
select f.id, f.company, f.project, case when f.kind = 'photo' then 'Fotos' else 'Sonstiges' end, f.ref, f.at
from att f where f.point is null and f.defect is null and f.project is not null;

create index on src_docs ((file->>'path'));

-- Größe und Typ aus dem Dateispeicher, wo bekannt
update src_docs d set file = d.file || jsonb_build_object('size', coalesce((o.row->'metadata'->>'size')::bigint, 0), 'mime', coalesce(o.row->'metadata'->>'mimetype', d.file->>'mime'))
from r o where o.tbl = 'storage.objects' and o.row->>'name' = d.file->>'path';

insert into public.docs (id, company_id, scope, site_id, folder, file, imported_at, created_at)
select d.id, d.company, 'baustelle', d.project, d.folder, d.file, (select at from run), coalesce(pg_temp.ts(d.at), now())
from src_docs d where exists (select 1 from public.sites s where s.id = d.project)
on conflict (id) do update set folder = excluded.folder, file = excluded.file, imported_at = excluded.imported_at;

-- ------------------------------------------------------------------ In eGrid gelöscht → auch hier weg (nur importierte Datensätze)
delete from public.docs where imported_at is not null and imported_at < (select at from run);
delete from public.notes where imported_at is not null and imported_at < (select at from run);
delete from public.tasks where imported_at is not null and imported_at < (select at from run);
delete from public.defects where imported_at is not null and imported_at < (select at from run);
delete from public.points where imported_at is not null and imported_at < (select at from run);
delete from public.sites where imported_at is not null and imported_at < (select at from run);
delete from public.company_members where imported_at is not null and imported_at < (select at from run);
delete from public.people where imported_at is not null and imported_at < (select at from run);

-- ------------------------------------------------------------------ Dateispeicher: Einträge der kopierten Dateien
-- Gleicher Pfad und gleiche Id wie in eGrid, nur im Bucket vysner-files. Nur Spalten, die es hier gibt und
-- die nicht berechnet werden – so passt es zu älteren und neueren Supabase-Versionen.
create temporary table incoming as
select * from jsonb_populate_recordset(null::storage.objects,
  (select coalesce(jsonb_agg(row || jsonb_build_object('bucket_id', 'vysner-files', 'owner', null, 'owner_id', null)), '[]')
   from import_egrid.raw where tbl = 'storage.objects' and row->>'bucket_id' in (select bucket from import_egrid.buckets)));

set local storage.allow_delete_query = 'true';
-- in eGrid gelöscht (früher übernommen, jetzt nicht mehr da) oder gleicher Pfad mit neuer Id → alten Eintrag entfernen.
-- In VYSNER selbst hochgeladene Dateien bleiben unberührt.
create table if not exists import_egrid.seen_objects (id uuid primary key);
delete from storage.objects o using import_egrid.seen_objects s
  where o.id = s.id and o.bucket_id = 'vysner-files' and not exists (select 1 from incoming i where i.id = o.id);
delete from storage.objects o using incoming i where o.bucket_id = 'vysner-files' and o.name = i.name and o.id <> i.id;
truncate import_egrid.seen_objects;
insert into import_egrid.seen_objects select id from incoming;

do $$
declare cols text; sets text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position),
         string_agg(format('%1$I = excluded.%1$I', column_name), ', ') filter (where column_name <> 'id')
    into cols, sets
  from information_schema.columns
  where table_schema = 'storage' and table_name = 'objects' and is_generated = 'NEVER' and column_name not in ('owner', 'owner_id');
  execute format('insert into storage.objects (%1$s) select %1$s from incoming on conflict (id) do update set %2$s', cols, sets);
end $$;

commit;

-- Ergebnis
select 'Firmen' as was, count(*) from public.companies where imported_at is not null
union all select 'Mitarbeiter', count(*) from public.people where imported_at is not null
union all select 'Zugänge', count(*) from public.company_members where imported_at is not null
union all select 'Baustellen', count(*) from public.sites where imported_at is not null
union all select 'Checklistenpunkte', count(*) from public.points where imported_at is not null
union all select 'Mängel', count(*) from public.defects where imported_at is not null
union all select 'Aufgaben', count(*) from public.tasks where imported_at is not null
union all select 'Notizen', count(*) from public.notes where imported_at is not null
union all select 'Dokumente', count(*) from public.docs where imported_at is not null
union all select 'Dateieinträge', count(*) from storage.objects where bucket_id = 'vysner-files';
