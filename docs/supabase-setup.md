# Supabase setup

## Apply the migration

Confirm the intended Supabase project name and project ref in Dashboard. In that project’s SQL Editor, apply the complete files in order. Use your migration workflow to record each applied version.

1. [20261120000100_cms_foundation.sql](../supabase/migrations/20261120000100_cms_foundation.sql) creates the six CMS tables, the Gravity site, and the private Storage bucket and object policies.
2. [20261120000200_cms_security_baseline.sql](../supabase/migrations/20261120000200_cms_security_baseline.sql) hardens bucket configuration and removes owner privileges from the membership helper.
3. [20261120000300_cms_works_management.sql](../supabase/migrations/20261120000300_cms_works_management.sql) enables [Stage 7.2 Works management](cms-stage-7-2.md).
4. [20261120000400_cms_media_library.sql](../supabase/migrations/20261120000400_cms_media_library.sql) enables [Stage 7.3 private media management](cms-stage-7-3.md). That stage also requires a server-only `SUPABASE_SECRET_KEY`.

On an existing database, verify the applied versions and run only the pending migrations in order. Each file is a single transaction. A failed baseline migration reports if the required bucket is public or Storage RLS is disabled. Resolve that state in the confirmed project before retrying.

For local development, initialize an isolated Supabase CLI project, copy the migration directory into it, disable auth sign-ups in its config, and run `supabase start`. Use local values from `supabase status`. Running a local reset rebuilds that local database and reapplies migrations. Confirm the target before any remote write or migration.

## Set up the administrator

1. Disable public sign-ups in the project’s Authentication settings. Keep the email/password provider enabled. Leave social providers and anonymous sign-ins disabled.
2. In Authentication → Users, create an email/password user via Dashboard. Confirm the user there if your Dashboard configuration requires it. Copy that user's UUID.
3. Run this statement in the **same project’s** SQL Editor after replacing the sample UUID with the user’s UUID.

```sql
insert into public.admin_users (user_id)
values ('00000000-0000-0000-0000-000000000000'::uuid)
on conflict (user_id) do nothing;
```

To revoke admin access, delete only the corresponding membership row in the SQL Editor. Authentication without that membership grants no CMS access. Manage credentials and resets in Supabase Dashboard.

## Configure Next.js

Copy [the example file](../.env.example) to `.env.local` or set these variables in the deployment environment.

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL from Supabase Connect or API settings |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | The publishable key for that project |

These Next.js variables are intended for client-side use. Supply only the public publishable key (or the local Supabase CLI anon key for a local instance). Keep the service-role key, secret key, database password, and user password outside the app and source control.

Set both values in Vercel for the intended deployment targets and redeploy so Next.js can bundle the public configuration. Set both in Codex Cloud environment settings and allow the intended Supabase hostname if egress rules block it. Refresh the development process after environment changes. Keep Preview deployments pointed to the intended test project when exercising write workflows.

For validation, open `/admin/login` in a fresh browser context. Verify anonymous redirects on both protected routes, then verify that the approved account can open both pages and sign out. A regular authenticated account must be rejected by the app and have no CMS or private Storage access. Test these roles with an isolated project or explicit authorization for the targeted remote project.
