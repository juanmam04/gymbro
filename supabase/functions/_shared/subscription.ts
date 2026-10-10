import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
export function adminClient() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
}
/** Reconcile current subscriber state rather than trusting webhook arrival order. */
export async function reconcileSubscription(userId: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) return;
  const secret = Deno.env.get('REVENUECAT_SECRET_KEY');
  if (!secret) throw new Error('RevenueCat server configuration missing');
  const res = await fetch(
    `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`,
    { headers: { Authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(10000) },
  );
  if (!res.ok) throw new Error('RevenueCat verification unavailable');
  const { subscriber } = await res.json();
  if (!subscriber || !subscriber.entitlements) throw new Error('Invalid subscriber response');
  const entitlements = subscriber.entitlements;
  let plan = 'free';
  let expires: string | null = null;
  for (const [id, tier] of [
    ['racha_duo', 'duo'],
    ['racha_plus', 'plus'],
  ]) {
    const e = entitlements[id];
    const expiration = e?.expires_date;
    const sandbox = subscriber.subscriptions?.[e?.product_identifier]?.is_sandbox;
    if (sandbox && Deno.env.get('ALLOW_SANDBOX_BILLING') !== 'true') continue;
    if (
      e &&
      (expiration === null ||
        (typeof expiration === 'string' && Date.parse(expiration) > Date.now()))
    ) {
      plan = tier;
      expires = expiration;
      break;
    }
  }
  const { error } = await adminClient()
    .from('racha_subscriptions')
    .upsert({ user_id: userId, plan, expires_at: expires, verified_at: new Date().toISOString() });
  if (error) throw error;
}
export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
