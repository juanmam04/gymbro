-- Allow meals without photo (manual / search / repeat without image)
alter table public.meals
  alter column image_url drop not null;
