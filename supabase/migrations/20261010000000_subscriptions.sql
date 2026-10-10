-- Store-verified access only. Clients cannot grant themselves subscriptions.
create table public.racha_subscriptions (
 user_id uuid primary key references auth.users(id) on delete cascade,
 plan text not null check (plan in ('free','plus','duo')),
 expires_at timestamptz,
 verified_at timestamptz not null default now()
);
alter table public.racha_subscriptions enable row level security;
create policy subscription_read_own on public.racha_subscriptions for select to authenticated using (user_id = auth.uid());
revoke all on public.racha_subscriptions from anon, authenticated;
grant select on public.racha_subscriptions to authenticated;

create table public.racha_analysis_usage (
 user_id uuid references auth.users(id) on delete cascade,
 period text not null,
 used integer not null default 0 check (used >= 0),
 primary key (user_id, period)
);
alter table public.racha_analysis_usage enable row level security;
revoke all on public.racha_analysis_usage from anon, authenticated;

create or replace function public.racha_plan(p_user uuid) returns text
language sql stable security definer set search_path = public as $$
 select case
 when exists(select 1 from racha_subscriptions where user_id=p_user and plan='duo' and (expires_at is null or expires_at>now())) then 'duo'
 when exists(select 1 from racha_subscriptions where user_id=p_user and plan='plus' and (expires_at is null or expires_at>now())) then 'plus'
 when exists(select 1 from racha_subscriptions s join partner_connections c on (c.user_a_id=s.user_id or c.user_b_id=s.user_id) where s.plan='duo' and (s.expires_at is null or s.expires_at>now()) and c.status='accepted' and (c.user_a_id=p_user or c.user_b_id=p_user)) then 'duo'
 else 'free' end;
$$;
revoke all on function public.racha_plan(uuid) from public, anon, authenticated;

create or replace function public.get_racha_access() returns jsonb
language plpgsql security definer set search_path = public as $$
declare p text; bucket text; cap integer; count_used integer;
begin
 if auth.uid() is null then raise exception 'Unauthenticated'; end if;
 p := public.racha_plan(auth.uid());
 bucket := case when p='free' then 'trial' else to_char(now() at time zone 'UTC','YYYY-MM') end;
 cap := case when p='free' then 3 else 90 end;
 select used into count_used from racha_analysis_usage where user_id=auth.uid() and period=bucket;
 return jsonb_build_object('plan',p,'period',bucket,'limit',cap,'remaining',greatest(0,cap-coalesce(count_used,0)));
end $$;
revoke all on function public.get_racha_access() from public, anon;
grant execute on function public.get_racha_access() to authenticated;

-- Atomic check+increment prevents parallel requests exceeding the cap.
create or replace function public.consume_racha_analysis(p_user uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare p text; bucket text; cap integer; count_used integer;
begin
 p := public.racha_plan(p_user);
 bucket := case when p='free' then 'trial' else to_char(now() at time zone 'UTC','YYYY-MM') end;
 cap := case when p='free' then 3 else 90 end;
 insert into racha_analysis_usage(user_id,period,used) values(p_user,bucket,0) on conflict do nothing;
 update racha_analysis_usage set used=used+1 where user_id=p_user and period=bucket and used<cap returning used into count_used;
 return count_used is not null;
end $$;
revoke all on function public.consume_racha_analysis(uuid) from public, anon, authenticated;
grant execute on function public.consume_racha_analysis(uuid) to service_role;

create table public.partner_support (
 id uuid primary key default gen_random_uuid(),
 sender_id uuid not null references auth.users(id) on delete cascade,
 recipient_id uuid not null references auth.users(id) on delete cascade,
 sent_at timestamptz not null default now()
);
alter table public.partner_support enable row level security;
revoke all on public.partner_support from anon, authenticated;
create or replace function public.reserve_partner_support(p_sender uuid, p_recipient uuid) returns boolean
language plpgsql security definer set search_path=public as $$
begin
 perform pg_advisory_xact_lock(hashtextextended(p_sender::text || ':support',0));
 if not public.are_accepted_partners(p_sender,p_recipient) then return false; end if;
 if not exists(select 1 from profiles where id=p_recipient and notif_social=true) then return false; end if;
 if exists(select 1 from partner_support where sender_id=p_sender and sent_at > now()-interval '24 hours') then return false; end if;
 insert into partner_support(sender_id,recipient_id) values(p_sender,p_recipient); return true;
end $$;
revoke all on function public.reserve_partner_support(uuid,uuid) from public, anon, authenticated;
grant execute on function public.reserve_partner_support(uuid,uuid) to service_role;
