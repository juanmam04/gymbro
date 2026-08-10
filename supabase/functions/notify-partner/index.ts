// Edge Function: notify partner when a meal is created.
// Deploy: supabase functions deploy notify-partner
//
// Secrets required (Dashboard → Edge Functions → Secrets):
// - EXPO_ACCESS_TOKEN  (Expo push access token — NEVER put this in the app)
//
// Wire via Database Webhook on public.meals INSERT, or call from a trigger.
// This function expects the meal row payload from Supabase webhook.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

type MealRow = {
  id: string;
  user_id: string;
  meal_type: string;
  total_calories: number;
  total_protein: number;
};

Deno.serve(async (req) => {
  try {
    const expoToken = Deno.env.get('EXPO_ACCESS_TOKEN');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRole) {
      return json({ error: 'Missing Supabase env' }, 500);
    }

    if (!expoToken) {
      return json(
        {
          ok: false,
          skipped: true,
          reason:
            'EXPO_ACCESS_TOKEN secret not configured. Push notifications are prepared but inactive.',
        },
        200,
      );
    }

    const payload = await req.json();
    const meal = (payload.record ?? payload) as MealRow;

    if (!meal?.id || !meal?.user_id) {
      return json({ error: 'Invalid meal payload' }, 400);
    }

    const admin = createClient(supabaseUrl, serviceRole);

    const { data: partnerId, error: partnerError } = await admin.rpc('get_accepted_partner_id', {
      uid: meal.user_id,
    });

    if (partnerError) throw partnerError;
    if (!partnerId) {
      return json({ ok: true, skipped: true, reason: 'No partner' });
    }

    const [{ data: profile }, { data: tokens }] = await Promise.all([
      admin.from('profiles').select('display_name').eq('id', meal.user_id).single(),
      admin.from('device_tokens').select('expo_push_token').eq('user_id', partnerId),
    ]);

    if (!tokens || tokens.length === 0) {
      return json({ ok: true, skipped: true, reason: 'Partner has no device tokens' });
    }

    const mealLabel = mealTypeLabel(meal.meal_type);
    const name = profile?.display_name ?? 'Tu partner';
    const title = `🍽️ ${name} registró su ${mealLabel}`;
    const body = `${Math.round(Number(meal.total_calories))} kcal · ${Math.round(Number(meal.total_protein))} g proteína`;

    const messages = tokens.map((t) => ({
      to: t.expo_push_token,
      sound: 'default',
      title,
      body,
      data: { mealId: meal.id, type: 'meal_created' },
    }));

    const pushResponse = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${expoToken}`,
      },
      body: JSON.stringify(messages),
    });

    const pushResult = await pushResponse.json();
    return json({ ok: true, pushResult });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return json({ error: message }, 500);
  }
});

function mealTypeLabel(type: string): string {
  switch (type) {
    case 'breakfast':
      return 'desayuno';
    case 'lunch':
      return 'almuerzo';
    case 'dinner':
      return 'cena';
    case 'snack':
      return 'snack';
    default:
      return 'comida';
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
