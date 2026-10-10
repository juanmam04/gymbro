import { reconcileSubscription, json } from '../_shared/subscription.ts';
Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const secret = Deno.env.get('REVENUECAT_WEBHOOK_AUTH');
  if (!secret || req.headers.get('Authorization') !== secret)
    return json({ error: 'Unauthorized' }, 401);
  try {
    const { event } = await req.json();
    if (!event?.id || !event?.type) return json({ error: 'Invalid event' }, 400);
    if (event.type === 'TEST') return json({ ok: true });
    const users =
      event.type === 'TRANSFER'
        ? [...(event.transferred_from ?? []), ...(event.transferred_to ?? [])]
        : [event.app_user_id, ...(event.aliases ?? [])];
    for (const id of new Set<string>(users.filter((id: unknown) => typeof id === 'string')))
      await reconcileSubscription(id);
    return json({ ok: true });
  } catch {
    return json({ error: 'Reconciliation failed; retry' }, 503);
  }
});
