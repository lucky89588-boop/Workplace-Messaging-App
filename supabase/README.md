# Bridging Abilities Staff Supabase Setup

This directory contains the additive database foundation for Bridging Abilities Staff. It is deliberately separate from the workspace's empty Drizzle schema so Supabase remains the source of truth for these tables and Row Level Security policies.

## Run the migration

1. In the Supabase dashboard, open **SQL Editor** for the connected project.
2. Create a new query and paste the contents of `migrations/202608210001_staff_data_foundation.sql`.
3. Run it as a project owner, then create another query and run `migrations/202608210002_staff_onboarding.sql`.
4. Confirm the `ba_` tables appear in the Table Editor and `ba_profiles` has the onboarding columns. The migrations create no staff accounts, conversations, or messages.

The Replit Supabase connection is intentionally limited to the project data REST API, so schema changes must be run through the Supabase SQL Editor or your existing migration pipeline.

## Activate the first administrator

Use Supabase Auth to create the first staff user with a password they choose privately. The migration creates their matching `ba_profiles` record with a `pending` status. Then, in SQL Editor, replace the placeholders and run:

```sql
update public.ba_profiles
set role = 'admin',
    status = 'active'
where id = '<SUPABASE_AUTH_USER_UUID>';
```

Run this only for the authorised workplace administrator. On their first app sign-in, they will be asked to choose a password again and acknowledge the policy before they can manage staff access.

## Configure secure staff onboarding

The mobile app never receives a Supabase service-role key. The API server performs the following server-only work through the connected Supabase integration:

- creates Supabase Auth users;
- resets passwords;
- reads and updates onboarding state in `ba_profiles`;
- writes audit records.

Before enabling Staff access in a production environment, ensure the Supabase connection available to the **API Server** is authorised for Supabase Admin API operations. A connection limited to an anon/public key cannot create or reset Auth users. Do not copy any service-role credential into Expo configuration, the mobile app, source control, or chat.

When an administrator creates or resets a staff account:

1. The API server generates a cryptographically random temporary password.
2. It returns the value only in that administrator's immediate response; it is not stored in `ba_` tables or audit data.
3. The administrator shares it through an approved secure channel.
4. The staff member has seven days to sign in and choose their own password.

The mobile app deliberately keeps the signed-in session in memory for this onboarding release. It does not persist credentials through the existing local mock-data store.

## Security model

- All application tables are prefixed with `ba_` to avoid touching unrelated project data.
- `anon` receives no access to the new tables.
- `authenticated` requests are filtered by Row Level Security.
- Only active staff who have changed any temporary password and accepted the policy can see the organisation announcement channel or member conversations.
- Managers and administrators can publish announcements and manage emergency contacts; only administrators can manage profiles, account requests, and audit-log access.
- The mobile app must use a Supabase Auth access token for requests. Never place a service-role key in Expo, app configuration, or source control.

## App/API boundary

`artifacts/api-server/src/services/supabaseStaffGateway.ts` defines the server-side boundary for staff data. `artifacts/api-server/src/services/supabaseAdminGateway.ts` contains the separate server-only onboarding boundary. The Expo app calls the API server through the shared generated client and passes only its ordinary Supabase session token.