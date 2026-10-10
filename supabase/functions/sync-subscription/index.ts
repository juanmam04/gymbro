import { adminClient, reconcileSubscription, json } from '../_shared/subscription.ts';
Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const token = req.headers.get('Authorization')?.replace(/^Bearer /, '');
  if (!token) return json({ error: 'Unauthorized' }, 401);
  const {
    data: { user },
    error,
  } = await adminClient().auth.getUser(token);
  if (error || !user) return json({ error: 'Unauthorized' }, 401);
  try {
    await reconcileSubscription(user.id);
    return json({ ok: true });
  } catch {
    return json({ error: 'Subscription verification unavailable' }, 503);
  }
});
