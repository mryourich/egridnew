# VYSNpro Supabase Schema

This folder contains the database schema for the VYSNpro MVP.

## Migration

Run `migrations/20260706130000_initial_egrid_schema.sql` in the Supabase SQL Editor or via the Supabase CLI.
Then run `migrations/20260707100000_client_routing_and_test_seed.sql` in the test Supabase project if you want the seeded test client.

The schema includes:

- Workspace and member management
- People data
- SiteManager projects
- Open Points hierarchy
- Defects linked to Open Points
- Tasks, notes, documents and reports
- Attachments metadata
- Row Level Security policies
- Private Storage bucket `egrid-attachments`
- Client alias view for `/client/[clientId]` routing
- Test client `eww-test`

## Storage Path

Files should be uploaded below the workspace id:

```text
{workspace_id}/{project_id}/{entity}/{file_name}
```

This keeps Storage permissions aligned with workspace membership.

## Client Routing

The app treats `workspaces` as companies/clients. The URL can use either:

```text
/client/{workspace_uuid}
/client/{workspace_slug}
```

For the seeded test environment:

```text
/client/eww-test
/client/eww-test/dashboard
/client/eww-test/sitemanager
/client/eww-test/openpoints
```

Every business table keeps the company boundary through `workspace_id`, and RLS checks membership through `workspace_members`.

## Vercel Environment Variables

Set these in Vercel Project Settings -> Environment Variables:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_EGRID_DEFAULT_CLIENT_ID=eww-test
```

`SUPABASE_SERVICE_ROLE_KEY` must stay server-only. Never expose it in client components.
