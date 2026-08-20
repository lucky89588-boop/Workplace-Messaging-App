-- Bridging Abilities Staff data foundation
-- This migration is additive and uses a ba_ prefix to avoid touching unrelated
-- Supabase project objects. Run it in the Supabase SQL Editor as a project owner.

begin;

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'ba_staff_role' and typnamespace = 'public'::regnamespace) then
    create type public.ba_staff_role as enum ('staff', 'manager', 'admin');
  end if;
  if not exists (select 1 from pg_type where typname = 'ba_account_status' and typnamespace = 'public'::regnamespace) then
    create type public.ba_account_status as enum ('pending', 'active', 'suspended', 'rejected');
  end if;
  if not exists (select 1 from pg_type where typname = 'ba_conversation_kind' and typnamespace = 'public'::regnamespace) then
    create type public.ba_conversation_kind as enum ('direct', 'group', 'announcement');
  end if;
  if not exists (select 1 from pg_type where typname = 'ba_conversation_visibility' and typnamespace = 'public'::regnamespace) then
    create type public.ba_conversation_visibility as enum ('members', 'organisation');
  end if;
  if not exists (select 1 from pg_type where typname = 'ba_member_role' and typnamespace = 'public'::regnamespace) then
    create type public.ba_member_role as enum ('member', 'owner');
  end if;
  if not exists (select 1 from pg_type where typname = 'ba_message_kind' and typnamespace = 'public'::regnamespace) then
    create type public.ba_message_kind as enum ('text', 'poll', 'event', 'system');
  end if;
  if not exists (select 1 from pg_type where typname = 'ba_receipt_status' and typnamespace = 'public'::regnamespace) then
    create type public.ba_receipt_status as enum ('delivered', 'read');
  end if;
  if not exists (select 1 from pg_type where typname = 'ba_event_response_status' and typnamespace = 'public'::regnamespace) then
    create type public.ba_event_response_status as enum ('going', 'maybe', 'declined');
  end if;
end $$;

create table if not exists public.ba_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text not null check (char_length(trim(display_name)) between 1 and 120),
  job_title text not null default '',
  department text not null default '',
  about text not null default '',
  avatar_initials text not null default '',
  role public.ba_staff_role not null default 'staff',
  status public.ba_account_status not null default 'pending',
  last_active_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.ba_account_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete set null,
  requested_email text not null,
  requested_name text not null check (char_length(trim(requested_name)) between 1 and 120),
  requested_role public.ba_staff_role not null default 'staff',
  status public.ba_account_status not null default 'pending',
  reviewed_by uuid references public.ba_profiles(id) on delete set null,
  reviewed_at timestamptz,
  review_note text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (
    (status = 'pending' and reviewed_at is null)
    or (status in ('active', 'rejected', 'suspended') and reviewed_at is not null)
  )
);

create unique index if not exists ba_account_requests_requested_email_key
  on public.ba_account_requests (lower(requested_email));

create table if not exists public.ba_conversations (
  id uuid primary key default gen_random_uuid(),
  kind public.ba_conversation_kind not null,
  visibility public.ba_conversation_visibility not null default 'members',
  name text not null default '' check (char_length(name) <= 160),
  description text not null default '' check (char_length(description) <= 1000),
  house_reference text not null default '' check (char_length(house_reference) <= 80),
  accent_colour text check (accent_colour is null or accent_colour ~ '^#[0-9A-Fa-f]{6}$'),
  direct_key text unique,
  created_by uuid not null references public.ba_profiles(id) on delete restrict,
  archived_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (
    (kind = 'announcement' and visibility = 'organisation')
    or (kind in ('direct', 'group') and visibility = 'members')
  ),
  check ((kind = 'direct' and direct_key is not null) or (kind <> 'direct' and direct_key is null))
);

create table if not exists public.ba_conversation_members (
  conversation_id uuid not null references public.ba_conversations(id) on delete cascade,
  profile_id uuid not null references public.ba_profiles(id) on delete cascade,
  member_role public.ba_member_role not null default 'member',
  muted_until timestamptz,
  joined_at timestamptz not null default timezone('utc', now()),
  last_read_at timestamptz,
  primary key (conversation_id, profile_id)
);

create table if not exists public.ba_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ba_conversations(id) on delete cascade,
  sender_id uuid references public.ba_profiles(id) on delete set null,
  parent_message_id uuid references public.ba_messages(id) on delete set null,
  kind public.ba_message_kind not null default 'text',
  body text not null default '' check (char_length(body) <= 8000),
  metadata jsonb not null default '{}'::jsonb,
  edited_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check ((kind = 'system' and sender_id is null) or (kind <> 'system' and sender_id is not null))
);

create table if not exists public.ba_message_receipts (
  message_id uuid not null references public.ba_messages(id) on delete cascade,
  profile_id uuid not null references public.ba_profiles(id) on delete cascade,
  status public.ba_receipt_status not null,
  recorded_at timestamptz not null default timezone('utc', now()),
  primary key (message_id, profile_id)
);

create table if not exists public.ba_announcements (
  message_id uuid primary key references public.ba_messages(id) on delete cascade,
  priority smallint not null default 0 check (priority between 0 and 2),
  publish_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz,
  pinned boolean not null default false,
  check (expires_at is null or expires_at > publish_at)
);

create table if not exists public.ba_polls (
  message_id uuid primary key references public.ba_messages(id) on delete cascade,
  question text not null check (char_length(trim(question)) between 1 and 500),
  allow_multiple boolean not null default false,
  closes_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  check (closed_at is null or closed_at >= created_at)
);

create table if not exists public.ba_poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_message_id uuid not null references public.ba_polls(message_id) on delete cascade,
  label text not null check (char_length(trim(label)) between 1 and 240),
  position smallint not null check (position >= 0),
  unique (poll_message_id, position),
  unique (poll_message_id, id)
);

create table if not exists public.ba_poll_votes (
  poll_message_id uuid not null references public.ba_polls(message_id) on delete cascade,
  option_id uuid not null,
  profile_id uuid not null references public.ba_profiles(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (poll_message_id, option_id, profile_id),
  foreign key (poll_message_id, option_id)
    references public.ba_poll_options(poll_message_id, id)
    on delete cascade
);

create table if not exists public.ba_events (
  message_id uuid primary key references public.ba_messages(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 240),
  description text not null default '' check (char_length(description) <= 2000),
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text not null default '' check (char_length(location) <= 240),
  created_at timestamptz not null default timezone('utc', now()),
  check (ends_at is null or ends_at >= starts_at)
);

create table if not exists public.ba_event_responses (
  event_message_id uuid not null references public.ba_events(message_id) on delete cascade,
  profile_id uuid not null references public.ba_profiles(id) on delete cascade,
  response public.ba_event_response_status not null,
  responded_at timestamptz not null default timezone('utc', now()),
  primary key (event_message_id, profile_id)
);

create table if not exists public.ba_emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 160),
  role_description text not null default '' check (char_length(role_description) <= 300),
  phone_number text not null check (char_length(trim(phone_number)) between 3 and 40),
  is_after_hours boolean not null default false,
  is_active boolean not null default true,
  sort_order smallint not null default 0,
  created_by uuid references public.ba_profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.ba_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.ba_profiles(id) on delete set null,
  action text not null check (char_length(trim(action)) between 1 and 160),
  entity_type text not null check (char_length(trim(entity_type)) between 1 and 100),
  entity_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists ba_profiles_status_role_idx on public.ba_profiles (status, role);
create index if not exists ba_conversations_active_idx on public.ba_conversations (archived_at, updated_at desc);
create index if not exists ba_conversation_members_profile_idx on public.ba_conversation_members (profile_id, conversation_id);
create index if not exists ba_messages_conversation_created_idx on public.ba_messages (conversation_id, created_at desc);
create index if not exists ba_messages_parent_idx on public.ba_messages (parent_message_id) where parent_message_id is not null;
create index if not exists ba_message_receipts_profile_idx on public.ba_message_receipts (profile_id, recorded_at desc);
create index if not exists ba_announcements_active_idx on public.ba_announcements (pinned desc, publish_at desc) where expires_at is null;
create index if not exists ba_poll_votes_profile_idx on public.ba_poll_votes (profile_id, poll_message_id);
create index if not exists ba_event_responses_profile_idx on public.ba_event_responses (profile_id, event_message_id);
create index if not exists ba_emergency_contacts_active_idx on public.ba_emergency_contacts (is_active, sort_order, name);
create index if not exists ba_audit_log_entity_idx on public.ba_audit_log (entity_type, entity_id, created_at desc);

create or replace function public.ba_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.ba_has_any_role(required_roles public.ba_staff_role[])
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.ba_profiles
    where id = auth.uid()
      and status = 'active'
      and role = any(required_roles)
  );
$$;

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
  );
$$;

create or replace function public.ba_can_access_conversation(target_conversation_id uuid, target_profile_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select public.ba_is_active_profile(target_profile_id)
    and exists (
      select 1
      from public.ba_conversations conversation
      where conversation.id = target_conversation_id
        and (
          conversation.visibility = 'organisation'
          or exists (
            select 1
            from public.ba_conversation_members member
            where member.conversation_id = conversation.id
              and member.profile_id = target_profile_id
          )
        )
    );
$$;

create or replace function public.ba_can_manage_conversation(target_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select public.ba_is_active_profile()
    and (
      public.ba_has_any_role(array['manager', 'admin']::public.ba_staff_role[])
      or exists (
        select 1
        from public.ba_conversations
        where id = target_conversation_id
          and created_by = auth.uid()
      )
    );
$$;

create or replace function public.ba_can_send_message(target_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select public.ba_can_access_conversation(target_conversation_id)
    and (
      not exists (
        select 1
        from public.ba_conversations
        where id = target_conversation_id
          and kind = 'announcement'
      )
      or public.ba_has_any_role(array['manager', 'admin']::public.ba_staff_role[])
    );
$$;

create or replace function public.ba_record_audit(
  action_name text,
  target_entity_type text,
  target_entity_id uuid default null,
  audit_details jsonb default '{}'::jsonb
)
returns bigint
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  audit_id bigint;
begin
  if not public.ba_has_any_role(array['manager', 'admin']::public.ba_staff_role[]) then
    raise exception 'Not permitted to record management audit events';
  end if;

  insert into public.ba_audit_log (actor_id, action, entity_type, entity_id, details)
  values (auth.uid(), action_name, target_entity_type, target_entity_id, coalesce(audit_details, '{}'::jsonb))
  returning id into audit_id;

  return audit_id;
end;
$$;

create or replace function public.ba_handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.ba_profiles (id, email, display_name)
  values (
    new.id,
    coalesce(new.email, new.id::text || '@no-email.local'),
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Staff member'
    )
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = excluded.display_name,
        updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.ba_set_message_sender()
returns trigger
language plpgsql
set search_path = public, auth
as $$
begin
  if new.kind = 'system' then
    if auth.uid() is not null then
      raise exception 'System messages can only be created by trusted server processes';
    end if;
    new.sender_id = null;
  else
    if auth.uid() is null then
      raise exception 'An authenticated staff identity is required to send a message';
    end if;
    new.sender_id = auth.uid();
  end if;

  return new;
end;
$$;

create or replace function public.ba_validate_message_reply()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.parent_message_id is not null and not exists (
    select 1
    from public.ba_messages parent_message
    where parent_message.id = new.parent_message_id
      and parent_message.conversation_id = new.conversation_id
  ) then
    raise exception 'Replies must belong to the same conversation as their parent message';
  end if;

  return new;
end;
$$;

create or replace function public.ba_validate_poll_vote()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  allows_multiple boolean;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.poll_message_id::text, 0));

  select allow_multiple
  into allows_multiple
  from public.ba_polls
  where message_id = new.poll_message_id;

  if allows_multiple is null then
    raise exception 'Poll does not exist';
  end if;

  if not allows_multiple and exists (
    select 1
    from public.ba_poll_votes
    where poll_message_id = new.poll_message_id
      and profile_id = new.profile_id
      and option_id <> new.option_id
  ) then
    raise exception 'This poll allows one option per staff member';
  end if;

  return new;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'ba_profiles_updated_at' and tgrelid = 'public.ba_profiles'::regclass) then
    create trigger ba_profiles_updated_at before update on public.ba_profiles for each row execute function public.ba_set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'ba_account_requests_updated_at' and tgrelid = 'public.ba_account_requests'::regclass) then
    create trigger ba_account_requests_updated_at before update on public.ba_account_requests for each row execute function public.ba_set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'ba_conversations_updated_at' and tgrelid = 'public.ba_conversations'::regclass) then
    create trigger ba_conversations_updated_at before update on public.ba_conversations for each row execute function public.ba_set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'ba_messages_updated_at' and tgrelid = 'public.ba_messages'::regclass) then
    create trigger ba_messages_updated_at before update on public.ba_messages for each row execute function public.ba_set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'ba_message_sender_set' and tgrelid = 'public.ba_messages'::regclass) then
    create trigger ba_message_sender_set before insert on public.ba_messages for each row execute function public.ba_set_message_sender();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'ba_message_reply_validated' and tgrelid = 'public.ba_messages'::regclass) then
    create trigger ba_message_reply_validated before insert or update on public.ba_messages for each row execute function public.ba_validate_message_reply();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'ba_emergency_contacts_updated_at' and tgrelid = 'public.ba_emergency_contacts'::regclass) then
    create trigger ba_emergency_contacts_updated_at before update on public.ba_emergency_contacts for each row execute function public.ba_set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'ba_poll_vote_validated' and tgrelid = 'public.ba_poll_votes'::regclass) then
    create trigger ba_poll_vote_validated before insert or update on public.ba_poll_votes for each row execute function public.ba_validate_poll_vote();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'ba_after_auth_user_created' and tgrelid = 'auth.users'::regclass) then
    create trigger ba_after_auth_user_created
      after insert on auth.users
      for each row execute procedure public.ba_handle_new_auth_user();
  end if;
end $$;

alter table public.ba_profiles enable row level security;
alter table public.ba_account_requests enable row level security;
alter table public.ba_conversations enable row level security;
alter table public.ba_conversation_members enable row level security;
alter table public.ba_messages enable row level security;
alter table public.ba_message_receipts enable row level security;
alter table public.ba_announcements enable row level security;
alter table public.ba_polls enable row level security;
alter table public.ba_poll_options enable row level security;
alter table public.ba_poll_votes enable row level security;
alter table public.ba_events enable row level security;
alter table public.ba_event_responses enable row level security;
alter table public.ba_emergency_contacts enable row level security;
alter table public.ba_audit_log enable row level security;

revoke all on public.ba_profiles, public.ba_account_requests, public.ba_conversations,
  public.ba_conversation_members, public.ba_messages, public.ba_message_receipts,
  public.ba_announcements, public.ba_polls, public.ba_poll_options, public.ba_poll_votes,
  public.ba_events, public.ba_event_responses, public.ba_emergency_contacts, public.ba_audit_log
from anon, authenticated;
grant select on public.ba_profiles to authenticated;
grant select, update on public.ba_account_requests to authenticated;
grant select, insert, update on public.ba_conversations to authenticated;
grant select, insert, update, delete on public.ba_conversation_members to authenticated;
grant select, insert on public.ba_messages to authenticated;
grant select, insert, update on public.ba_message_receipts to authenticated;
grant select, insert, update on public.ba_announcements to authenticated;
grant select, insert, update on public.ba_polls to authenticated;
grant select, insert, update on public.ba_poll_options to authenticated;
grant select, insert, delete on public.ba_poll_votes to authenticated;
grant select, insert, update on public.ba_events to authenticated;
grant select, insert, update on public.ba_event_responses to authenticated;
grant select, insert, update, delete on public.ba_emergency_contacts to authenticated;
grant select on public.ba_audit_log to authenticated;
revoke all on function public.ba_has_any_role(public.ba_staff_role[]) from public;
revoke all on function public.ba_is_active_profile(uuid) from public;
revoke all on function public.ba_can_access_conversation(uuid, uuid) from public;
revoke all on function public.ba_can_manage_conversation(uuid) from public;
revoke all on function public.ba_can_send_message(uuid) from public;
revoke all on function public.ba_record_audit(text, text, uuid, jsonb) from public;
grant execute on function public.ba_has_any_role(public.ba_staff_role[]) to authenticated;
grant execute on function public.ba_is_active_profile(uuid) to authenticated;
grant execute on function public.ba_can_access_conversation(uuid, uuid) to authenticated;
grant execute on function public.ba_can_manage_conversation(uuid) to authenticated;
grant execute on function public.ba_can_send_message(uuid) to authenticated;
grant execute on function public.ba_record_audit(text, text, uuid, jsonb) to authenticated;

drop policy if exists ba_profiles_select_active on public.ba_profiles;
create policy ba_profiles_select_active on public.ba_profiles
  for select to authenticated
  using (public.ba_is_active_profile() and status = 'active');

drop policy if exists ba_profiles_admin_update on public.ba_profiles;
create policy ba_profiles_admin_update on public.ba_profiles
  for update to authenticated
  using (public.ba_has_any_role(array['admin']::public.ba_staff_role[]))
  with check (public.ba_has_any_role(array['admin']::public.ba_staff_role[]));

drop policy if exists ba_account_requests_management on public.ba_account_requests;
create policy ba_account_requests_management on public.ba_account_requests
  for all to authenticated
  using (public.ba_has_any_role(array['admin']::public.ba_staff_role[]))
  with check (public.ba_has_any_role(array['admin']::public.ba_staff_role[]));

drop policy if exists ba_conversations_select on public.ba_conversations;
create policy ba_conversations_select on public.ba_conversations
  for select to authenticated
  using (public.ba_can_access_conversation(id));

drop policy if exists ba_conversations_create on public.ba_conversations;
create policy ba_conversations_create on public.ba_conversations
  for insert to authenticated
  with check (
    public.ba_is_active_profile()
    and created_by = auth.uid()
    and (kind <> 'announcement' or public.ba_has_any_role(array['manager', 'admin']::public.ba_staff_role[]))
  );

drop policy if exists ba_conversations_manage on public.ba_conversations;
create policy ba_conversations_manage on public.ba_conversations
  for update to authenticated
  using (public.ba_can_manage_conversation(id))
  with check (
    public.ba_can_manage_conversation(id)
    and (
      kind <> 'announcement'
      or public.ba_has_any_role(array['manager', 'admin']::public.ba_staff_role[])
    )
  );

drop policy if exists ba_conversation_members_select on public.ba_conversation_members;
create policy ba_conversation_members_select on public.ba_conversation_members
  for select to authenticated
  using (public.ba_can_access_conversation(conversation_id));

drop policy if exists ba_conversation_members_manage on public.ba_conversation_members;
create policy ba_conversation_members_manage on public.ba_conversation_members
  for all to authenticated
  using (public.ba_can_manage_conversation(conversation_id))
  with check (
    public.ba_can_manage_conversation(conversation_id)
    and public.ba_is_active_profile(profile_id)
  );

drop policy if exists ba_messages_select on public.ba_messages;
create policy ba_messages_select on public.ba_messages
  for select to authenticated
  using (
    deleted_at is null
    and public.ba_can_access_conversation(conversation_id)
  );

drop policy if exists ba_messages_create on public.ba_messages;
create policy ba_messages_create on public.ba_messages
  for insert to authenticated
  with check (
    kind <> 'system'
    and public.ba_can_send_message(conversation_id)
  );

drop policy if exists ba_message_receipts_select on public.ba_message_receipts;
create policy ba_message_receipts_select on public.ba_message_receipts
  for select to authenticated
  using (
    profile_id = auth.uid()
    or exists (
      select 1 from public.ba_messages
      where id = message_id
        and public.ba_can_access_conversation(conversation_id)
    )
  );

drop policy if exists ba_message_receipts_own on public.ba_message_receipts;
create policy ba_message_receipts_own on public.ba_message_receipts
  for all to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

drop policy if exists ba_announcements_select on public.ba_announcements;
create policy ba_announcements_select on public.ba_announcements
  for select to authenticated
  using (
    exists (
      select 1 from public.ba_messages
      where id = message_id
        and public.ba_can_access_conversation(conversation_id)
    )
  );

drop policy if exists ba_announcements_management on public.ba_announcements;
create policy ba_announcements_management on public.ba_announcements
  for all to authenticated
  using (
    public.ba_has_any_role(array['manager', 'admin']::public.ba_staff_role[])
    and exists (
      select 1
      from public.ba_messages message
      join public.ba_conversations conversation on conversation.id = message.conversation_id
      where message.id = message_id
        and conversation.kind = 'announcement'
    )
  )
  with check (
    public.ba_has_any_role(array['manager', 'admin']::public.ba_staff_role[])
    and exists (
      select 1
      from public.ba_messages message
      join public.ba_conversations conversation on conversation.id = message.conversation_id
      where message.id = message_id
        and conversation.kind = 'announcement'
    )
  );

drop policy if exists ba_polls_select on public.ba_polls;
create policy ba_polls_select on public.ba_polls
  for select to authenticated
  using (
    exists (
      select 1 from public.ba_messages
      where id = message_id
        and public.ba_can_access_conversation(conversation_id)
    )
  );

drop policy if exists ba_polls_owner_write on public.ba_polls;
create policy ba_polls_owner_write on public.ba_polls
  for all to authenticated
  using (
    exists (
      select 1 from public.ba_messages
      where id = message_id
        and sender_id = auth.uid()
        and kind = 'poll'
    )
  )
  with check (
    exists (
      select 1 from public.ba_messages
      where id = message_id
        and sender_id = auth.uid()
        and kind = 'poll'
    )
  );

drop policy if exists ba_poll_options_select on public.ba_poll_options;
create policy ba_poll_options_select on public.ba_poll_options
  for select to authenticated
  using (
    exists (
      select 1 from public.ba_messages message
      join public.ba_polls poll on poll.message_id = message.id
      where poll.message_id = poll_message_id
        and public.ba_can_access_conversation(message.conversation_id)
    )
  );

drop policy if exists ba_poll_options_owner_write on public.ba_poll_options;
create policy ba_poll_options_owner_write on public.ba_poll_options
  for all to authenticated
  using (
    exists (
      select 1 from public.ba_messages
      where id = poll_message_id
        and sender_id = auth.uid()
        and kind = 'poll'
    )
  )
  with check (
    exists (
      select 1 from public.ba_messages
      where id = poll_message_id
        and sender_id = auth.uid()
        and kind = 'poll'
    )
  );

drop policy if exists ba_poll_votes_select on public.ba_poll_votes;
create policy ba_poll_votes_select on public.ba_poll_votes
  for select to authenticated
  using (
    exists (
      select 1 from public.ba_messages message
      where message.id = poll_message_id
        and public.ba_can_access_conversation(message.conversation_id)
    )
  );

drop policy if exists ba_poll_votes_own on public.ba_poll_votes;
create policy ba_poll_votes_own on public.ba_poll_votes
  for all to authenticated
  using (profile_id = auth.uid())
  with check (
    profile_id = auth.uid()
    and exists (
      select 1 from public.ba_messages message
      join public.ba_polls poll on poll.message_id = message.id
      where poll.message_id = poll_message_id
        and public.ba_can_access_conversation(message.conversation_id)
        and poll.closed_at is null
        and (poll.closes_at is null or poll.closes_at > timezone('utc', now()))
    )
  );

drop policy if exists ba_events_select on public.ba_events;
create policy ba_events_select on public.ba_events
  for select to authenticated
  using (
    exists (
      select 1 from public.ba_messages
      where id = message_id
        and public.ba_can_access_conversation(conversation_id)
    )
  );

drop policy if exists ba_events_owner_write on public.ba_events;
create policy ba_events_owner_write on public.ba_events
  for all to authenticated
  using (
    exists (
      select 1 from public.ba_messages
      where id = message_id
        and sender_id = auth.uid()
        and kind = 'event'
    )
  )
  with check (
    exists (
      select 1 from public.ba_messages
      where id = message_id
        and sender_id = auth.uid()
        and kind = 'event'
    )
  );

drop policy if exists ba_event_responses_select on public.ba_event_responses;
create policy ba_event_responses_select on public.ba_event_responses
  for select to authenticated
  using (
    exists (
      select 1 from public.ba_messages
      where id = event_message_id
        and public.ba_can_access_conversation(conversation_id)
    )
  );

drop policy if exists ba_event_responses_own on public.ba_event_responses;
create policy ba_event_responses_own on public.ba_event_responses
  for all to authenticated
  using (profile_id = auth.uid())
  with check (
    profile_id = auth.uid()
    and exists (
      select 1 from public.ba_messages
      where id = event_message_id
        and public.ba_can_access_conversation(conversation_id)
    )
  );

drop policy if exists ba_emergency_contacts_select on public.ba_emergency_contacts;
create policy ba_emergency_contacts_select on public.ba_emergency_contacts
  for select to authenticated
  using (public.ba_is_active_profile() and is_active);

drop policy if exists ba_emergency_contacts_management on public.ba_emergency_contacts;
create policy ba_emergency_contacts_management on public.ba_emergency_contacts
  for all to authenticated
  using (public.ba_has_any_role(array['manager', 'admin']::public.ba_staff_role[]))
  with check (public.ba_has_any_role(array['manager', 'admin']::public.ba_staff_role[]));

drop policy if exists ba_audit_log_admin_select on public.ba_audit_log;
create policy ba_audit_log_admin_select on public.ba_audit_log
  for select to authenticated
  using (public.ba_has_any_role(array['admin']::public.ba_staff_role[]));

commit;