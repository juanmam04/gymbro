-- Scan telemetry + correction history (owner-only RLS)
-- Safe incremental migration; does not destroy existing data.

create table if not exists public.scan_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  event text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists scan_events_user_created_idx
  on public.scan_events (user_id, created_at desc);

alter table public.scan_events enable row level security;

drop policy if exists "scan_events_select_own" on public.scan_events;
create policy "scan_events_select_own"
  on public.scan_events for select
  using (user_id = auth.uid());

drop policy if exists "scan_events_insert_own" on public.scan_events;
create policy "scan_events_insert_own"
  on public.scan_events for insert
  with check (user_id = auth.uid());

create table if not exists public.scan_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  meal_id uuid references public.meals (id) on delete set null,
  dish_name text,
  provider text,
  vision_provider text,
  overall_confidence numeric(4, 3),
  image_path text,
  raw_ai jsonb,
  created_at timestamptz not null default now()
);

create index if not exists scan_sessions_user_created_idx
  on public.scan_sessions (user_id, created_at desc);

alter table public.scan_sessions enable row level security;

drop policy if exists "scan_sessions_owner_all" on public.scan_sessions;
create policy "scan_sessions_owner_all"
  on public.scan_sessions for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create table if not exists public.scan_detected_items (
  id uuid primary key default gen_random_uuid(),
  scan_session_id uuid not null references public.scan_sessions (id) on delete cascade,
  food_name text not null,
  ai_grams numeric(10, 2),
  final_grams numeric(10, 2),
  ai_calories numeric(8, 1),
  final_calories numeric(8, 1),
  nutrition_food_id text,
  nutrition_provider text,
  confidence numeric(4, 3),
  created_at timestamptz not null default now()
);

create index if not exists scan_detected_items_session_idx
  on public.scan_detected_items (scan_session_id);

alter table public.scan_detected_items enable row level security;

drop policy if exists "scan_detected_items_via_session" on public.scan_detected_items;
create policy "scan_detected_items_via_session"
  on public.scan_detected_items for all
  using (
    exists (
      select 1 from public.scan_sessions s
      where s.id = scan_session_id and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.scan_sessions s
      where s.id = scan_session_id and s.user_id = auth.uid()
    )
  );
