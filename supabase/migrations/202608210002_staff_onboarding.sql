-- Secure staff onboarding state for Bridging Abilities Staff.
-- Run after 202608210001_staff_data_foundation.sql in the Supabase SQL Editor.

begin;

alter table public.ba_profiles
  add column if not exists password_change_required boolean not null default true,
  add column if not exists temporary_password_issued_at timestamptz,
  add column if not exists first_password_set_at timestamptz,
  add column if not exists policy_accepted_at timestamptz,
  add column if not exists policy_version text;

create index if not exists ba_profiles_onboarding_idx
  on public.ba_profiles (status, password_change_required, policy_accepted_at);

create or replace function public.ba_is_active_profile(target_profile_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.ba_profiles
    where id = target_profile_id
      and status = 'active'
      and password_change_required = false
      and policy_accepted_at is not null
  );
$$;

-- Management policies in the foundation use this helper. Require completed
-- onboarding here so an active manager/admin with a temporary password cannot
-- access account requests, audit data, or management operations over REST.
create or replace function public.ba_has_any_role(required_roles public.ba_staff_role[])
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select public.ba_is_active_profile(auth.uid())
    and exists (
      select 1
      from public.ba_profiles
      where id = auth.uid()
        and role = any(required_roles)
    );
$$;

create or replace function public.ba_handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.ba_profiles (
    id,
    email,
    display_name,
    password_change_required
  )
  values (
    new.id,
    coalesce(new.email, new.id::text || '@no-email.local'),
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Staff member'
    ),
    true
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = excluded.display_name,
        updated_at = timezone('utc', now());
  return new;
end;
$$;

-- `authenticated` has select-only table privileges on ba_profiles in the
-- foundation migration. Keep that explicit and make the RLS rule safe if a
-- future change grants profile updates: an unfinished administrator must not
-- be able to use a direct REST call to complete or alter onboarding state.
revoke update on public.ba_profiles from authenticated;

drop policy if exists ba_profiles_admin_update on public.ba_profiles;
create policy ba_profiles_admin_update on public.ba_profiles
  for update to authenticated
  using (
    public.ba_is_active_profile()
    and public.ba_has_any_role(array['admin']::public.ba_staff_role[])
  )
  with check (
    public.ba_is_active_profile()
    and public.ba_has_any_role(array['admin']::public.ba_staff_role[])
  );

commit;