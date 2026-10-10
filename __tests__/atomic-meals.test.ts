import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
const db = new PGlite();
const user = '00000000-0000-4000-8000-000000000011';
const item = {
  name: 'Pan',
  grams: 50,
  calories: 130,
  protein: 4,
  carbs: 25,
  fat: 2,
  confidence: 0.7,
  source: 'manual',
};
beforeAll(async () => {
  await db.exec(
    `create role anon; create role authenticated; create schema auth; create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('test.user_id',true),'')::uuid $$; create table public.profiles(id uuid primary key); insert into profiles values('${user}'); select set_config('test.user_id','${user}',false);`,
  );
  const initial = readFileSync('supabase/migrations/20260310000000_init.sql', 'utf8');
  for (const name of ['meal_type', 'scan_status', 'meal_item_source'])
    await db.exec(
      initial.match(new RegExp(`create type public.${name} as enum \\([\\s\\S]*?\\);`))![0],
    );
  for (const name of ['meals', 'meal_items'])
    await db.exec(
      initial.match(new RegExp(`create table public.${name} \\([\\s\\S]*?\\n\\);`))![0],
    );
  await db.exec(
    readFileSync('supabase/migrations/20260310000004_meals_nullable_image.sql', 'utf8'),
  );
  await db.exec(readFileSync('supabase/migrations/20261010000001_atomic_meals.sql', 'utf8'));
}, 30000);
afterAll(() => db.close());
const save = (items: unknown[], id: string | null = null) =>
  db.query<{ meal: { id: string; total_calories: string } }>(
    'select to_jsonb(save_racha_meal($1::jsonb,$2::uuid)) as meal',
    [JSON.stringify(items), id],
  );
describe.sequential('transactional meal saving', () => {
  let mealId: string;
  it('saves a text meal with no image and sums nutrition on the server', async () => {
    const result = await save([item]);
    mealId = result.rows[0]!.meal.id;
    expect(Number(result.rows[0]!.meal.total_calories)).toBe(130);
    expect((await db.query('select * from meal_items')).rows).toHaveLength(1);
  });
  it('rolls back the parent when an item constraint fails', async () => {
    await expect(save([{ ...item, confidence: 2 }])).rejects.toThrow();
    expect((await db.query('select * from meals')).rows).toHaveLength(1);
  });
  it('preserves old items and totals when an edit fails', async () => {
    await expect(save([{ ...item, calories: 250, confidence: 2 }], mealId)).rejects.toThrow();
    const rows = (await db.query<{ total_calories: string }>('select total_calories from meals'))
      .rows;
    expect(Number(rows[0]!.total_calories)).toBe(130);
    expect((await db.query('select * from meal_items')).rows).toHaveLength(1);
  });
  it('rejects edits from a different account', async () => {
    await db.exec("select set_config('test.user_id','00000000-0000-4000-8000-000000000099',false)");
    await expect(save([item], mealId)).rejects.toThrow(/Meal unavailable/);
  });
});
