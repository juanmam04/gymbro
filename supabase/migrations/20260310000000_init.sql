-- GymBro MVP schema + RLS
-- Apply with: supabase db push / supabase migration up / SQL editor

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.partner_connection_status as enum (
  'pending',
  'accepted',
  'rejected',
  'ended'
);

create type public.relationship_type as enum (
  'partner',
  'friend',
  'gym_bro',
  'other'
);

create type public.goal_type as enum (
  'eat_better',
  'lose_fat',
  'maintain',
  'build_muscle'
);

create type public.meal_type as enum (
  'breakfast',
  'lunch',
  'dinner',
  'snack',
  'other'
);

create type public.scan_status as enum (
  'pending',
  'processing',
  'completed',
  'failed',
  'edited'
);

create type public.meal_item_source as enum (
  'ai',
  'manual',
  'edited'
);

create type public.meal_reaction_type as enum (
  'heart',
  'fire',
  'strong',
  'yummy'
);

create type public.device_platform as enum (
  'ios',
  'android',
  'web'
);

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 50),
  avatar_url text,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- partner_invites
-- ---------------------------------------------------------------------------

create table public.partner_invites (
  id uuid primary key default gen_random_uuid(),
  inviter_id uuid not null references public.profiles (id) on delete cascade,
  code text not null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint partner_invites_code_format check (code ~ '^[A-Z0-9]{6}$'),
  constraint partner_invites_unique_code unique (code)
);

create index partner_invites_inviter_idx on public.partner_invites (inviter_id);
create index partner_invites_code_idx on public.partner_invites (code);

-- ---------------------------------------------------------------------------
-- partner_connections
-- ---------------------------------------------------------------------------

create table public.partner_connections (
  id uuid primary key default gen_random_uuid(),
  user_a_id uuid not null references public.profiles (id) on delete cascade,
  user_b_id uuid not null references public.profiles (id) on delete cascade,
  status public.partner_connection_status not null default 'pending',
  relationship_type public.relationship_type not null default 'partner',
  invite_id uuid references public.partner_invites (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint partner_connections_distinct_users check (user_a_id <> user_b_id),
  constraint partner_connections_ordered_pair check (user_a_id < user_b_id),
  constraint partner_connections_unique_pair unique (user_a_id, user_b_id)
);

create index partner_connections_user_a_idx on public.partner_connections (user_a_id);
create index partner_connections_user_b_idx on public.partner_connections (user_b_id);
create index partner_connections_status_idx on public.partner_connections (status);

-- Only one accepted connection per user (MVP: single partner)
create unique index partner_connections_one_accepted_a
  on public.partner_connections (user_a_id)
  where status = 'accepted';

create unique index partner_connections_one_accepted_b
  on public.partner_connections (user_b_id)
  where status = 'accepted';

-- ---------------------------------------------------------------------------
-- nutrition_goals
-- ---------------------------------------------------------------------------

create table public.nutrition_goals (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  calories_target integer not null check (calories_target > 0 and calories_target <= 10000),
  protein_target integer not null check (protein_target >= 0 and protein_target <= 1000),
  carbs_target integer not null check (carbs_target >= 0 and carbs_target <= 1000),
  fat_target integer not null check (fat_target >= 0 and fat_target <= 1000),
  goal_type public.goal_type not null default 'eat_better',
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- meals
-- ---------------------------------------------------------------------------

create table public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  image_url text not null,
  meal_type public.meal_type not null default 'other',
  eaten_at timestamptz not null default now(),
  total_calories numeric(8, 1) not null default 0 check (total_calories >= 0),
  total_protein numeric(8, 1) not null default 0 check (total_protein >= 0),
  total_carbs numeric(8, 1) not null default 0 check (total_carbs >= 0),
  total_fat numeric(8, 1) not null default 0 check (total_fat >= 0),
  scan_status public.scan_status not null default 'completed',
  notes text,
  -- Shared meal support (MVP schema ready; UX later)
  shared_with_partner boolean not null default false,
  shared_group_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index meals_user_id_eaten_at_idx on public.meals (user_id, eaten_at desc);
create index meals_eaten_at_idx on public.meals (eaten_at desc);
create index meals_shared_group_idx on public.meals (shared_group_id)
  where shared_group_id is not null;

-- ---------------------------------------------------------------------------
-- meal_items
-- ---------------------------------------------------------------------------

create table public.meal_items (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.meals (id) on delete cascade,
  food_name text not null check (char_length(food_name) between 1 and 120),
  quantity numeric(10, 2) not null default 1 check (quantity > 0),
  unit text not null default 'g',
  grams numeric(10, 2) not null check (grams > 0),
  calories numeric(8, 1) not null default 0 check (calories >= 0),
  protein numeric(8, 1) not null default 0 check (protein >= 0),
  carbs numeric(8, 1) not null default 0 check (carbs >= 0),
  fat numeric(8, 1) not null default 0 check (fat >= 0),
  confidence numeric(4, 3) check (confidence is null or (confidence >= 0 and confidence <= 1)),
  source public.meal_item_source not null default 'ai',
  created_at timestamptz not null default now()
);

create index meal_items_meal_id_idx on public.meal_items (meal_id);

-- ---------------------------------------------------------------------------
-- meal_reactions
-- ---------------------------------------------------------------------------

create table public.meal_reactions (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.meals (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  reaction public.meal_reaction_type not null,
  created_at timestamptz not null default now(),
  constraint meal_reactions_unique_user_meal unique (meal_id, user_id)
);

create index meal_reactions_meal_id_idx on public.meal_reactions (meal_id);
create index meal_reactions_user_id_idx on public.meal_reactions (user_id);

-- ---------------------------------------------------------------------------
-- device_tokens
-- ---------------------------------------------------------------------------

create table public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  expo_push_token text not null,
  platform public.device_platform not null,
  updated_at timestamptz not null default now(),
  constraint device_tokens_unique_token unique (expo_push_token)
);

create index device_tokens_user_id_idx on public.device_tokens (user_id);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger partner_connections_set_updated_at
  before update on public.partner_connections
  for each row execute function public.set_updated_at();

create trigger nutrition_goals_set_updated_at
  before update on public.nutrition_goals
  for each row execute function public.set_updated_at();

create trigger meals_set_updated_at
  before update on public.meals
  for each row execute function public.set_updated_at();

create trigger device_tokens_set_updated_at
  before update on public.device_tokens
  for each row execute function public.set_updated_at();

-- Auto-create profile stub on signup (display_name temporary until onboarding)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, onboarding_completed)
  values (
    new.id,
    coalesce(nullif(split_part(new.email, '@', 1), ''), 'Usuario'),
    false
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Ordered pair helper for connections
create or replace function public.ordered_user_pair(uid1 uuid, uid2 uuid)
returns table (user_a uuid, user_b uuid)
language sql
immutable
as $$
  select least(uid1, uid2), greatest(uid1, uid2);
$$;

-- Are two users accepted partners?
create or replace function public.are_accepted_partners(uid1 uuid, uid2 uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.partner_connections pc
    where pc.status = 'accepted'
      and pc.user_a_id = least(uid1, uid2)
      and pc.user_b_id = greatest(uid1, uid2)
  );
$$;

-- Partner id of current user (or null)
create or replace function public.get_accepted_partner_id(uid uuid default auth.uid())
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select case
    when pc.user_a_id = uid then pc.user_b_id
    else pc.user_a_id
  end
  from public.partner_connections pc
  where pc.status = 'accepted'
    and (pc.user_a_id = uid or pc.user_b_id = uid)
  limit 1;
$$;

-- Generate short invite code
create or replace function public.generate_invite_code()
returns text
language plpgsql
as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i integer;
begin
  for i in 1..6 loop
    result := result || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  return result;
end;
$$;

-- Create invite (RPC)
create or replace function public.create_partner_invite(
  p_relationship_type public.relationship_type default 'partner'
)
returns public.partner_invites
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.partner_invites;
  v_code text;
  v_attempts integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if public.get_accepted_partner_id(auth.uid()) is not null then
    raise exception 'Already connected to a partner';
  end if;

  -- Invalidate previous open invites from this user
  update public.partner_invites
  set expires_at = now()
  where inviter_id = auth.uid()
    and accepted_at is null
    and expires_at > now();

  loop
    v_code := public.generate_invite_code();
    begin
      insert into public.partner_invites (inviter_id, code, expires_at)
      values (auth.uid(), v_code, now() + interval '7 days')
      returning * into v_invite;
      exit;
    exception when unique_violation then
      v_attempts := v_attempts + 1;
      if v_attempts > 10 then
        raise exception 'Could not generate unique invite code';
      end if;
    end;
  end loop;

  return v_invite;
end;
$$;

-- Accept invite by code (RPC)
create or replace function public.accept_partner_invite(p_code text)
returns public.partner_connections
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.partner_invites;
  v_connection public.partner_connections;
  v_a uuid;
  v_b uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if public.get_accepted_partner_id(auth.uid()) is not null then
    raise exception 'Already connected to a partner';
  end if;

  select * into v_invite
  from public.partner_invites
  where code = upper(trim(p_code))
  for update;

  if v_invite is null then
    raise exception 'Invalid invite code';
  end if;

  if v_invite.accepted_at is not null then
    raise exception 'Invite already used';
  end if;

  if v_invite.expires_at < now() then
    raise exception 'Invite expired';
  end if;

  if v_invite.inviter_id = auth.uid() then
    raise exception 'Cannot accept your own invite';
  end if;

  if public.get_accepted_partner_id(v_invite.inviter_id) is not null then
    raise exception 'Inviter already has a partner';
  end if;

  select user_a, user_b into v_a, v_b
  from public.ordered_user_pair(v_invite.inviter_id, auth.uid());

  insert into public.partner_connections (
    user_a_id,
    user_b_id,
    status,
    relationship_type,
    invite_id
  )
  values (
    v_a,
    v_b,
    'accepted',
    'partner',
    v_invite.id
  )
  returning * into v_connection;

  update public.partner_invites
  set accepted_at = now(),
      accepted_by = auth.uid()
  where id = v_invite.id;

  return v_connection;
end;
$$;

-- ---------------------------------------------------------------------------
-- Storage bucket for meal images
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'meal-images',
  'meal-images',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.partner_invites enable row level security;
alter table public.partner_connections enable row level security;
alter table public.nutrition_goals enable row level security;
alter table public.meals enable row level security;
alter table public.meal_items enable row level security;
alter table public.meal_reactions enable row level security;
alter table public.device_tokens enable row level security;

-- profiles
create policy "profiles_select_own_or_partner"
  on public.profiles for select
  using (
    id = auth.uid()
    or public.are_accepted_partners(auth.uid(), id)
  );

create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (id = auth.uid());

-- partner_invites
create policy "invites_select_own"
  on public.partner_invites for select
  using (
    inviter_id = auth.uid()
    or accepted_by = auth.uid()
  );

-- Inserts/updates via security definer RPCs; allow inviter to read active codes
create policy "invites_insert_own"
  on public.partner_invites for insert
  with check (inviter_id = auth.uid());

create policy "invites_update_own"
  on public.partner_invites for update
  using (inviter_id = auth.uid())
  with check (inviter_id = auth.uid());

-- Allow lookup by code for authenticated users during accept (limited columns via RPC)
-- RPC is security definer so no broad select-by-code policy needed.

-- partner_connections
create policy "connections_select_participant"
  on public.partner_connections for select
  using (user_a_id = auth.uid() or user_b_id = auth.uid());

create policy "connections_insert_participant"
  on public.partner_connections for insert
  with check (user_a_id = auth.uid() or user_b_id = auth.uid());

create policy "connections_update_participant"
  on public.partner_connections for update
  using (user_a_id = auth.uid() or user_b_id = auth.uid())
  with check (user_a_id = auth.uid() or user_b_id = auth.uid());

-- nutrition_goals
create policy "goals_select_own_or_partner"
  on public.nutrition_goals for select
  using (
    user_id = auth.uid()
    or public.are_accepted_partners(auth.uid(), user_id)
  );

create policy "goals_insert_own"
  on public.nutrition_goals for insert
  with check (user_id = auth.uid());

create policy "goals_update_own"
  on public.nutrition_goals for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- meals
create policy "meals_select_own_or_partner"
  on public.meals for select
  using (
    user_id = auth.uid()
    or public.are_accepted_partners(auth.uid(), user_id)
  );

create policy "meals_insert_own"
  on public.meals for insert
  with check (user_id = auth.uid());

create policy "meals_update_own"
  on public.meals for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "meals_delete_own"
  on public.meals for delete
  using (user_id = auth.uid());

-- meal_items
create policy "meal_items_select_visible"
  on public.meal_items for select
  using (
    exists (
      select 1 from public.meals m
      where m.id = meal_id
        and (
          m.user_id = auth.uid()
          or public.are_accepted_partners(auth.uid(), m.user_id)
        )
    )
  );

create policy "meal_items_insert_own_meal"
  on public.meal_items for insert
  with check (
    exists (
      select 1 from public.meals m
      where m.id = meal_id and m.user_id = auth.uid()
    )
  );

create policy "meal_items_update_own_meal"
  on public.meal_items for update
  using (
    exists (
      select 1 from public.meals m
      where m.id = meal_id and m.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.meals m
      where m.id = meal_id and m.user_id = auth.uid()
    )
  );

create policy "meal_items_delete_own_meal"
  on public.meal_items for delete
  using (
    exists (
      select 1 from public.meals m
      where m.id = meal_id and m.user_id = auth.uid()
    )
  );

-- meal_reactions
create policy "reactions_select_visible"
  on public.meal_reactions for select
  using (
    exists (
      select 1 from public.meals m
      where m.id = meal_id
        and (
          m.user_id = auth.uid()
          or public.are_accepted_partners(auth.uid(), m.user_id)
        )
    )
  );

create policy "reactions_insert_visible"
  on public.meal_reactions for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.meals m
      where m.id = meal_id
        and (
          m.user_id = auth.uid()
          or public.are_accepted_partners(auth.uid(), m.user_id)
        )
    )
  );

create policy "reactions_update_own"
  on public.meal_reactions for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "reactions_delete_own"
  on public.meal_reactions for delete
  using (user_id = auth.uid());

-- device_tokens
create policy "device_tokens_select_own"
  on public.device_tokens for select
  using (user_id = auth.uid());

create policy "device_tokens_insert_own"
  on public.device_tokens for insert
  with check (user_id = auth.uid());

create policy "device_tokens_update_own"
  on public.device_tokens for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "device_tokens_delete_own"
  on public.device_tokens for delete
  using (user_id = auth.uid());

-- Storage policies for meal-images
create policy "meal_images_select_authenticated"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'meal-images');

create policy "meal_images_insert_own_folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'meal-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "meal_images_update_own_folder"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'meal-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'meal-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "meal_images_delete_own_folder"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'meal-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Realtime (optional, for partner feed later)
alter publication supabase_realtime add table public.meals;
alter publication supabase_realtime add table public.meal_reactions;

-- Grants
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on function public.create_partner_invite(public.relationship_type) to authenticated;
grant execute on function public.accept_partner_invite(text) to authenticated;
grant execute on function public.get_accepted_partner_id(uuid) to authenticated;
grant execute on function public.are_accepted_partners(uuid, uuid) to authenticated;
