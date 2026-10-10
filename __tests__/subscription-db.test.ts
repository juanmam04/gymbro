import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
const db = new PGlite();
const a = '00000000-0000-4000-8000-000000000001';
const b = '00000000-0000-4000-8000-000000000002';
const c = '00000000-0000-4000-8000-000000000003';
const d = '00000000-0000-4000-8000-000000000004';
async function access(user: string) {
  await db.exec(`select set_config('test.user_id','${user}',false)`);
  const { rows } = await db.query<{ access: { plan: string; remaining: number; period: string } }>(
    'select public.get_racha_access() as access',
  );
  return rows[0]!.access;
}
beforeAll(async () => {
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
 create schema auth; create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql as $$ select nullif(current_setting('test.user_id',true),'')::uuid $$;
 create table public.partner_connections(user_a_id uuid,user_b_id uuid,status text);
 create table public.profiles(id uuid,notif_social boolean);
 create function public.are_accepted_partners(a uuid,b uuid) returns boolean language sql as $$ select exists(select 1 from public.partner_connections where status='accepted' and ((user_a_id=a and user_b_id=b) or (user_a_id=b and user_b_id=a))) $$;
 insert into auth.users values ('${a}'),('${b}'),('${c}'),('${d}');
 insert into profiles values('${a}',true),('${b}',true),('${c}',false),('${d}',true);`);
  await db.exec(readFileSync('supabase/migrations/20261010000000_subscriptions.sql', 'utf8'));
}, 30000);
afterAll(() => db.close());
describe.sequential('server-side subscription access', () => {
  it('grants only three free trial analyses', async () => {
    expect((await access(a)).remaining).toBe(3);
    const result = await Promise.all(
      Array.from({ length: 8 }, () =>
        db.query<{ allowed: boolean }>('select consume_racha_analysis($1) as allowed', [a]),
      ),
    );
    expect(result.filter((r) => r.rows[0]!.allowed).length).toBe(3);
    expect((await access(a)).remaining).toBe(0);
  });
  it('clients cannot grant a subscription or consume a quota as another user', async () => {
    await db.exec('set role authenticated');
    try {
      await expect(
        db.query('insert into racha_subscriptions(user_id,plan) values($1,$2)', [a, 'duo']),
      ).rejects.toThrow(/permission denied/i);
      await expect(db.query('select consume_racha_analysis($1)', [b])).rejects.toThrow(
        /permission denied/i,
      );
    } finally {
      await db.exec('reset role');
    }
  });
  it('duo grants the accepted partner their own allowance, not a pending third user', async () => {
    await db.query(
      "insert into racha_subscriptions(user_id,plan,expires_at) values($1,'duo',now()+interval '1 day')",
      [a],
    );
    await db.query("insert into partner_connections values($1,$2,'accepted'),($1,$3,'pending')", [
      a,
      b,
      c,
    ]);
    expect((await access(a)).plan).toBe('duo');
    expect((await access(b)).remaining).toBe(90);
    expect((await access(c)).plan).toBe('free');
    await db.query('select consume_racha_analysis($1)', [b]);
    expect((await access(a)).remaining).toBe(90);
    expect((await access(b)).remaining).toBe(89);
  });
  it('expiry removes both duo entitlements without requiring a webhook', async () => {
    await db.query(
      "update racha_subscriptions set expires_at=now()-interval '1 second' where user_id=$1",
      [a],
    );
    expect((await access(a)).plan).toBe('free');
    expect((await access(b)).plan).toBe('free');
  });
  it('disconnecting a partner revokes shared access', async () => {
    await db.query(
      "update racha_subscriptions set expires_at=now()+interval '1 day' where user_id=$1",
      [a],
    );
    await db.query("update partner_connections set status='ended' where user_b_id=$1", [b]);
    expect((await access(b)).plan).toBe('free');
  });
  it('rejects unauthenticated access', async () => {
    await db.exec("select set_config('test.user_id','',false)");
    await expect(db.query('select get_racha_access()')).rejects.toThrow(/Unauthenticated/);
  });
  it('support respects social preferences, connection and a 24h limit', async () => {
    await db.query("update partner_connections set status='accepted' where user_b_id=$1", [b]);
    const reserve = async (sender: string, recipient: string) =>
      (
        await db.query<{ ok: boolean }>('select reserve_partner_support($1,$2) as ok', [
          sender,
          recipient,
        ])
      ).rows[0]!.ok;
    expect(await reserve(a, c)).toBe(false);
    expect(await reserve(a, b)).toBe(true);
    expect(await reserve(a, b)).toBe(false);
  });
});
