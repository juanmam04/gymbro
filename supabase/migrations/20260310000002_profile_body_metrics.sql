-- Body metrics for automatic nutrition estimation (consumer onboarding)

create type public.biological_sex as enum (
  'female',
  'male',
  'unspecified'
);

create type public.activity_level as enum (
  'little',
  'some',
  'quite',
  'lots'
);

alter table public.profiles
  add column if not exists biological_sex public.biological_sex,
  add column if not exists birth_year integer
    check (birth_year is null or (birth_year >= 1920 and birth_year <= extract(year from now())::int)),
  add column if not exists height_cm numeric(5, 1)
    check (height_cm is null or (height_cm >= 100 and height_cm <= 250)),
  add column if not exists weight_kg numeric(5, 1)
    check (weight_kg is null or (weight_kg >= 30 and weight_kg <= 300)),
  add column if not exists activity_level public.activity_level;
