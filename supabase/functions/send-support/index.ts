import { adminClient, json } from '../_shared/subscription.ts';
Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const token = req.headers.get('Authorization')?.replace(/^Bearer /, '');
  if (!token) return json({ error: 'Unauthorized' }, 401);
  const db = adminClient();
  const {
    data: { user },
    error,
  } = await db.auth.getUser(token);
  if (error || !user) return json({ error: 'Unauthorized' }, 401);
  try {
    const { recipientId } = await req.json();
    if (typeof recipientId !== 'string' || !/^[0-9a-f-]{36}$/i.test(recipientId))
      return json({ error: 'Invalid recipient' }, 400);
    const { data: tokens, error: tokenError } = await db
      .from('device_tokens')
      .select('expo_push_token')
      .eq('user_id', recipientId);
    if (tokenError) throw tokenError;
    if (!tokens?.length)
      return json({ error: 'Tu compañero todavía no activó las notificaciones.' }, 409);
    const { data: allowed, error: reserveError } = await db.rpc('reserve_partner_support', {
      p_sender: user.id,
      p_recipient: recipientId,
    });
    if (reserveError) throw reserveError;
    if (!allowed)
      return json(
        {
          error:
            'Podés mandar un toque cada 24 horas a tu compañero si tiene los avisos sociales activos.',
        },
        409,
      );
    const { data: profile } = await db
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single();
    const accessToken = Deno.env.get('EXPO_ACCESS_TOKEN');
    const result = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(
        tokens.map((t) => ({
          to: t.expo_push_token,
          title: 'Un toque de apoyo',
          body: `${profile?.display_name?.split(' ')[0] ?? 'Tu compañero'} te acompaña. Un día a la vez.`,
          data: { screen: 'challenges' },
        })),
      ),
      signal: AbortSignal.timeout(10000),
    });
    const payload = await result.json();
    if (
      !result.ok ||
      !Array.isArray(payload.data) ||
      !payload.data.some((ticket: { status: string }) => ticket.status === 'ok')
    )
      throw new Error('Push failed');
    return json({ ok: true });
  } catch {
    return json({ error: 'No pudimos enviar el toque. Probá más tarde.' }, 503);
  }
});
