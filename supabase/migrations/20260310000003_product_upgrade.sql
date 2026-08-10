-- GymBro Product Upgrade: new tables, prefs, privacy-aware RLS
-- Incremental — does not drop existing data

-- ---------------------------------------------------------------------------
-- Profile preferences & privacy
-- ---------------------------------------------------------------------------

create type public.nutrition_display_mode as enum ('simple', 'detailed');

alter table public.profiles
  add column if not exists nutrition_display_mode public.nutrition_display_mode
    not null default 'simple',
  add column if not exists water_goal_ml integer not null default 2500
    check (water_goal_ml >= 500 and water_goal_ml <= 8000),
  add column if not exists share_meals boolean not null default true,
  add column if not exists share_calories boolean not null default true,
  add column if not exists share_macros boolean not null default true,
  add column if not exists share_goals boolean not null default true,
  add column if not exists share_weight boolean not null default false,
  add column if not exists notif_social boolean not null default true,
  add column if not exists notif_reminders boolean not null default true,
  add column if not exists notif_progress boolean not null default true;

-- ---------------------------------------------------------------------------
-- meal_comments
-- ---------------------------------------------------------------------------

create table if not exists public.meal_comments (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.meals (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists meal_comments_meal_id_idx on public.meal_comments (meal_id, created_at);
create index if not exists meal_comments_user_id_idx on public.meal_comments (user_id);

create trigger meal_comments_set_updated_at
  before update on public.meal_comments
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- saved_meals + saved_meal_items
-- ---------------------------------------------------------------------------

create table if not exists public.saved_meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 80),
  meal_type public.meal_type not null default 'other',
  image_url text,
  total_calories numeric(8, 1) not null default 0,
  total_protein numeric(8, 1) not null default 0,
  total_carbs numeric(8, 1) not null default 0,
  total_fat numeric(8, 1) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists saved_meals_user_id_idx on public.saved_meals (user_id, updated_at desc);

create trigger saved_meals_set_updated_at
  before update on public.saved_meals
  for each row execute function public.set_updated_at();

create table if not exists public.saved_meal_items (
  id uuid primary key default gen_random_uuid(),
  saved_meal_id uuid not null references public.saved_meals (id) on delete cascade,
  food_name text not null check (char_length(food_name) between 1 and 120),
  quantity numeric(10, 2) not null default 1 check (quantity > 0),
  unit text not null default 'g',
  grams numeric(10, 2) not null check (grams > 0),
  calories numeric(8, 1) not null default 0,
  protein numeric(8, 1) not null default 0,
  carbs numeric(8, 1) not null default 0,
  fat numeric(8, 1) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists saved_meal_items_saved_meal_id_idx
  on public.saved_meal_items (saved_meal_id);

-- ---------------------------------------------------------------------------
-- shared_meal_invites
-- ---------------------------------------------------------------------------

create type public.shared_meal_invite_status as enum (
  'pending',
  'accepted',
  'declined'
);

create table if not exists public.shared_meal_invites (
  id uuid primary key default gen_random_uuid(),
  source_meal_id uuid not null references public.meals (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  status public.shared_meal_invite_status not null default 'pending',
  resulting_meal_id uuid references public.meals (id) on delete set null,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint shared_meal_invites_distinct check (sender_id <> recipient_id)
);

create index if not exists shared_meal_invites_recipient_idx
  on public.shared_meal_invites (recipient_id, status, created_at desc);
create index if not exists shared_meal_invites_sender_idx
  on public.shared_meal_invites (sender_id, created_at desc);
create unique index if not exists shared_meal_invites_pending_unique
  on public.shared_meal_invites (source_meal_id, recipient_id)
  where status = 'pending';

-- ---------------------------------------------------------------------------
-- water_entries
-- ---------------------------------------------------------------------------

create table if not exists public.water_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  amount_ml integer not null check (amount_ml > 0 and amount_ml <= 5000),
  consumed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists water_entries_user_consumed_idx
  on public.water_entries (user_id, consumed_at desc);

-- ---------------------------------------------------------------------------
-- weight_entries
-- ---------------------------------------------------------------------------

create table if not exists public.weight_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  weight_kg numeric(5, 1) not null check (weight_kg >= 30 and weight_kg <= 300),
  measured_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists weight_entries_user_measured_idx
  on public.weight_entries (user_id, measured_at desc);

-- ---------------------------------------------------------------------------
-- weekly_challenges
-- ---------------------------------------------------------------------------

create type public.challenge_metric as enum (
  'log_meals_days',
  'protein_goal_days',
  'water_goal_days'
);

create type public.challenge_scope as enum ('personal', 'joint');

create table if not exists public.weekly_challenges (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles (id) on delete cascade,
  partner_id uuid references public.profiles (id) on delete cascade,
  scope public.challenge_scope not null default 'personal',
  metric public.challenge_metric not null,
  target_days integer not null default 5 check (target_days between 1 and 7),
  week_start date not null,
  title text not null check (char_length(title) between 1 and 80),
  created_at timestamptz not null default now(),
  constraint weekly_challenges_joint_has_partner check (
    (scope = 'personal' and partner_id is null)
    or (scope = 'joint' and partner_id is not null)
  )
);

create index if not exists weekly_challenges_created_by_week_idx
  on public.weekly_challenges (created_by, week_start desc);
create index if not exists weekly_challenges_partner_week_idx
  on public.weekly_challenges (partner_id, week_start desc);

-- ---------------------------------------------------------------------------
-- Storage: avatars bucket
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Helper: can viewer see owner's meals?
-- ---------------------------------------------------------------------------

create or replace function public.can_view_owner_meals(viewer uuid, owner uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    viewer = owner
    or (
      public.are_accepted_partners(viewer, owner)
      and exists (
        select 1 from public.profiles p
        where p.id = owner and p.share_meals = true
      )
    );
$$;

create or replace function public.can_view_owner_goals(viewer uuid, owner uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    viewer = owner
    or (
      public.are_accepted_partners(viewer, owner)
      and exists (
        select 1 from public.profiles p
        where p.id = owner and p.share_goals = true
      )
    );
$$;

create or replace function public.can_view_owner_weight(viewer uuid, owner uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    viewer = owner
    or (
      public.are_accepted_partners(viewer, owner)
      and exists (
        select 1 from public.profiles p
        where p.id = owner and p.share_weight = true
      )
    );
$$;

-- ---------------------------------------------------------------------------
-- Tighten existing meal/goal policies for privacy
-- ---------------------------------------------------------------------------

drop policy if exists "meals_select_own_or_partner" on public.meals;
create policy "meals_select_own_or_partner"
  on public.meals for select
  using (public.can_view_owner_meals(auth.uid(), user_id));

drop policy if exists "meal_items_select_visible" on public.meal_items;
create policy "meal_items_select_visible"
  on public.meal_items for select
  using (
    exists (
      select 1 from public.meals m
      where m.id = meal_id
        and public.can_view_owner_meals(auth.uid(), m.user_id)
    )
  );

drop policy if exists "reactions_select_visible" on public.meal_reactions;
create policy "reactions_select_visible"
  on public.meal_reactions for select
  using (
    exists (
      select 1 from public.meals m
      where m.id = meal_id
        and public.can_view_owner_meals(auth.uid(), m.user_id)
    )
  );

drop policy if exists "reactions_insert_visible" on public.meal_reactions;
create policy "reactions_insert_visible"
  on public.meal_reactions for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.meals m
      where m.id = meal_id
        and public.can_view_owner_meals(auth.uid(), m.user_id)
    )
  );

drop policy if exists "goals_select_own_or_partner" on public.nutrition_goals;
create policy "goals_select_own_or_partner"
  on public.nutrition_goals for select
  using (public.can_view_owner_goals(auth.uid(), user_id));

-- ---------------------------------------------------------------------------
-- RLS enable + policies for new tables
-- ---------------------------------------------------------------------------

alter table public.meal_comments enable row level security;
alter table public.saved_meals enable row level security;
alter table public.saved_meal_items enable row level security;
alter table public.shared_meal_invites enable row level security;
alter table public.water_entries enable row level security;
alter table public.weight_entries enable row level security;
alter table public.weekly_challenges enable row level security;

-- comments
create policy "comments_select_visible"
  on public.meal_comments for select
  using (
    exists (
      select 1 from public.meals m
      where m.id = meal_id
        and public.can_view_owner_meals(auth.uid(), m.user_id)
    )
  );

create policy "comments_insert_visible"
  on public.meal_comments for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.meals m
      where m.id = meal_id
        and public.can_view_owner_meals(auth.uid(), m.user_id)
    )
  );

create policy "comments_delete_own"
  on public.meal_comments for delete
  using (user_id = auth.uid());

create policy "comments_update_own"
  on public.meal_comments for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- saved meals
create policy "saved_meals_owner_all"
  on public.saved_meals for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "saved_meal_items_owner_all"
  on public.saved_meal_items for all
  using (
    exists (
      select 1 from public.saved_meals s
      where s.id = saved_meal_id and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.saved_meals s
      where s.id = saved_meal_id and s.user_id = auth.uid()
    )
  );

-- shared meal invites
create policy "shared_invites_select_participants"
  on public.shared_meal_invites for select
  using (sender_id = auth.uid() or recipient_id = auth.uid());

create policy "shared_invites_insert_sender"
  on public.shared_meal_invites for insert
  with check (
    sender_id = auth.uid()
    and public.are_accepted_partners(sender_id, recipient_id)
    and exists (
      select 1 from public.meals m
      where m.id = source_meal_id and m.user_id = auth.uid()
    )
  );

create policy "shared_invites_update_recipient"
  on public.shared_meal_invites for update
  using (recipient_id = auth.uid() or sender_id = auth.uid())
  with check (recipient_id = auth.uid() or sender_id = auth.uid());

-- water: own only (partner does not need water detail for MVP privacy)
create policy "water_owner_all"
  on public.water_entries for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- weight: privacy-aware
create policy "weight_select_privacy"
  on public.weight_entries for select
  using (public.can_view_owner_weight(auth.uid(), user_id));

create policy "weight_insert_own"
  on public.weight_entries for insert
  with check (user_id = auth.uid());

create policy "weight_update_own"
  on public.weight_entries for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "weight_delete_own"
  on public.weight_entries for delete
  using (user_id = auth.uid());

-- challenges
create policy "challenges_select_participants"
  on public.weekly_challenges for select
  using (created_by = auth.uid() or partner_id = auth.uid());

create policy "challenges_insert_own"
  on public.weekly_challenges for insert
  with check (
    created_by = auth.uid()
    and (
      scope = 'personal'
      or (
        scope = 'joint'
        and partner_id is not null
        and public.are_accepted_partners(auth.uid(), partner_id)
      )
    )
  );

create policy "challenges_delete_creator"
  on public.weekly_challenges for delete
  using (created_by = auth.uid());

-- avatar storage
create policy "avatars_select_authenticated"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'avatars');

create policy "avatars_insert_own_folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_update_own_folder"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_delete_own_folder"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Realtime for new tables
alter publication supabase_realtime add table public.meal_comments;
alter publication supabase_realtime add table public.shared_meal_invites;
alter publication supabase_realtime add table public.water_entries;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on function public.can_view_owner_meals(uuid, uuid) to authenticated;
grant execute on function public.can_view_owner_goals(uuid, uuid) to authenticated;
grant execute on function public.can_view_owner_weight(uuid, uuid) to authenticated;
