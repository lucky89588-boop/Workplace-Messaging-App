# Bridging Abilities Staff Supabase Setup

This directory contains the additive database foundation for Bridging Abilities Staff. It is deliberately separate from the workspace's empty Drizzle schema so Supabase remains the source of truth for these tables and Row Level Security policies.

## Run the migration

1. In the Supabase dashboard, open **SQL Editor** for the connected project.
2. Create a new query and paste the contents of `migrations/202608210001_staff_data_foundation.sql`.
3. Review the query, then run it as a project owner.
4. Confirm the `ba_` tables appear in the Table Editor. The migration creates no staff accounts, conversations, or messages.

The Replit Supabase connection is intentionally limited to the project data REST API, so schema changes must be run through the Supabase SQL Editor or your existing migration pipeline.

## Activate the first administrator

Use Supabase Auth to invite or create the first staff user. The migration creates their matching `ba_profiles` record with a `pending` status. Then, in SQL Editor, replace the placeholders and run:

```sql
update public.ba_profiles
set role = 'admin',
    status = 'active'
where id = '<SUPABASE_AUTH_USER_UUID>';
```

Run this only for the authorised workplace administrator. Additional staff can be activated by an administrator through the planned management flow.

## Security model

- All application tables are prefixed with `ba_` to avoid touching unrelated project data.
- `anon` receives no access to the new tables.
- `authenticated` requests are filtered by Row Level Security.
- Active staff can see the organisation announcement channel and only the member conversations they belong to.
- Managers and administrators can publish announcements and manage emergency contacts; only administrators can manage profiles, account requests, and audit-log access.
- The mobile app must use a Supabase Auth access token for requests. Never place a service-role key in Expo, app configuration, or source control.

## Connecting the app later

`artifacts/api-server/src/services/supabaseStaffGateway.ts` defines the server-side boundary for Supabase REST calls. Its transport is injected by server configuration so the Expo app can keep using the existing screen contracts while authenticated requests are introduced gradually.