// Edge Function: delete the authenticated user's account and related data.
// Deploy:
//   supabase functions deploy delete-account --no-verify-jwt=false
//
// Uses SUPABASE_SERVICE_ROLE_KEY only on the server.
// The client must send the user's JWT in Authorization: Bearer <access_token>.
// Never embed the service role key in the mobile app.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !anonKey || !serviceRole) {
      return json({ error: 'Missing Supabase env' }, 500);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Missing Authorization' }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const admin = createClient(supabaseUrl, serviceRole);
    const userId = user.id;

    // Best-effort storage cleanup before cascade delete.
    await emptyUserFolder(admin, 'meal-images', userId);
    await emptyUserFolder(admin, 'avatars', userId);

    // Device tokens and profile rows cascade via FKs when auth user is deleted.
    // Explicit token cleanup keeps push delivery clean immediately.
    await admin.from('device_tokens').delete().eq('user_id', userId);

    // End partner connections explicitly (also cascade from profiles).
    await admin
      .from('partner_connections')
      .delete()
      .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`);

    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) {
      return json({ error: deleteError.message }, 500);
    }

    return json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return json({ error: message }, 500);
  }
});

async function emptyUserFolder(
  admin: ReturnType<typeof createClient>,
  bucket: string,
  userId: string,
) {
  const { data: files, error } = await admin.storage.from(bucket).list(userId, { limit: 1000 });
  if (error || !files?.length) return;

  const paths = files.map((file) => `${userId}/${file.name}`);
  if (paths.length > 0) {
    await admin.storage.from(bucket).remove(paths);
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
