# Vercel + Supabase Setup

## 1. Supabase vorbereiten

Run the migrations in this order:

1. `supabase/migrations/20260706130000_initial_egrid_schema.sql`
2. `supabase/migrations/20260707100000_client_routing_and_test_seed.sql` for the test environment

The test client is available as:

```text
eww-test
```

## 2. Vercel Environment Variables

Add these variables in Vercel:

```text
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
NEXT_PUBLIC_EGRID_DEFAULT_CLIENT_ID=eww-test
```

Use the same names for Preview and Production, but point Preview to the test Supabase project.

## 3. Routes

Global routes:

```text
/dashboard
/sitemanager
/sitmanager
/openpoints
/maengel
/aufgaben
/dokumentation
```

Client routes:

```text
/client/[clientId]
/client/[clientId]/dashboard
/client/[clientId]/sitemanager
/client/[clientId]/sitmanager
/client/[clientId]/openpoints
/client/[clientId]/maengel
/client/[clientId]/aufgaben
/client/[clientId]/dokumentation
```

`clientId` can be the workspace UUID or workspace slug, for example:

```text
/client/eww-test/dashboard
```

## 4. Test API

After setting the environment variables, this endpoint checks the connection:

```text
/api/client/eww-test/bootstrap
```

Without Supabase variables it returns demo data. With Supabase variables it returns the seeded client and projects from the database.
