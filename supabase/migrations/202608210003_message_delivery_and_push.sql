-- Reliable message delivery and device notification registrations.
-- Apply after 202608210001_staff_data_foundation.sql.

begin;

alter table public.ba_messages
  add column if not exists client_message_id text;

create unique index if not exists ba_messages_client_message_id_key
  on public.ba_messages (client_message_id)
  where client_message_id is not null;

create table if not exists public.ba_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.ba_profiles(id) on delete cascade,
  expo_push_token text not null,
  platform text not null check (platform in ('ios', 'android')),
  notifications_enabled boolean not null default true,
  last_seen_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (profile_id, expo_push_token)
);

create table if not exists public.ba_notification_jobs (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null unique references public.ba_messages(id) on delete cascade,
  conversation_id uuid not null references public.ba_conversations(id) on delete cascade,
  sender_id uuid not null references public.ba_profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  next_attempt_at timestamptz not null default timezone('utc', now()),
  delivered_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do update set public = false;

create or replace function public.ba_notification_push_tokens(
  target_conversation_id uuid,
  sender_profile_id uuid
)
returns table (expo_push_token text)
language sql
security definer
set search_path = public, auth
as $$
  select subscription.expo_push_token
  from public.ba_push_subscriptions subscription
  join public.ba_profiles profile on profile.id = subscription.profile_id
  left join public.ba_conversation_members member
    on member.conversation_id = target_conversation_id
    and member.profile_id = subscription.profile_id
  join public.ba_conversations conversation on conversation.id = target_conversation_id
  where subscription.profile_id <> sender_profile_id
    and subscription.notifications_enabled
    and profile.status = 'active'
    and (
      conversation.visibility = 'organisation'
      or member.profile_id is not null
    )
    and coalesce(member.muted_until, '-infinity'::timestamptz) <= timezone('utc', now());
$$;

alter table public.ba_push_subscriptions enable row level security;
alter table public.ba_notification_jobs enable row level security;
revoke all on public.ba_push_subscriptions from anon, authenticated;
revoke all on public.ba_notification_jobs from anon, authenticated;
grant select, insert, update, delete on public.ba_push_subscriptions to authenticated;
revoke all on function public.ba_notification_push_tokens(uuid, uuid) from public;

drop policy if exists ba_push_subscriptions_own on public.ba_push_subscriptions;
create policy ba_push_subscriptions_own on public.ba_push_subscriptions
  for all to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

commit;