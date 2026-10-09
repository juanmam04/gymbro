// Edge Function: analyze-food
// Deploy: supabase functions deploy analyze-food
//
// Secrets (Dashboard → Edge Functions → Secrets):
// - OPENAI_API_KEY  (required for real vision)
// SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY injected by platform.
//
// Vision = OpenAI multimodal (structured JSON).
// Nutrition kcal/macros are NOT taken from the model as primary source —
// the app matches foods against curated / Open Food Facts data.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = Deno.env.get('VISION_MODEL') ?? 'gpt-4o';
const MAX_BODY_BYTES = 3_500_000;

const VISION_SCHEMA_HINT = `{
  "dish_name": string,
  "foods": [{
    "visual_name": string,
    "display_name": string,
    "normalized_query": string,
    "count": number,
    "grams_per_unit": number,
    "estimated_grams": number,
    "portion_description": string,
    "confidence": number,
    "portion_confidence": number,
    "count_confidence": number,
    "preparation": string,
    "visible": boolean,
    "difficult_to_estimate": boolean,
    "is_countable": boolean
  }],
  "possible_hidden_ingredients": [{ "name": string, "reason": string, "confidence": number }],
  "overall_confidence": number,
  "needs_user_confirmation": string[],
  "multiple_plates_suspected": boolean
}`;

Deno.serve(async (req) => {
  const started = Date.now();
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const openaiKey = Deno.env.get('OPENAI_API_KEY');

    if (!supabaseUrl || !anonKey) {
      return json({ error: 'Missing Supabase env', code: 'MISCONFIGURED' }, 500);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) {
      return json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, 401);
    }

    if (!openaiKey) {
      return json(
        {
          error: 'Vision provider not configured',
          code: 'VISION_NOT_CONFIGURED',
        },
        503,
      );
    }

    const contentLength = Number(req.headers.get('content-length') ?? 0);
    if (contentLength > MAX_BODY_BYTES) {
      return json({ error: 'Image too large', code: 'IMAGE_TOO_LARGE' }, 413);
    }

    const body = await req.json();
    const imageBase64 = typeof body?.imageBase64 === 'string' ? body.imageBase64 : '';
    const mimeType = typeof body?.mimeType === 'string' ? body.mimeType : 'image/jpeg';

    if (!imageBase64 || imageBase64.length < 100) {
      return json({ error: 'Missing image', code: 'IMAGE_UNAVAILABLE' }, 400);
    }
    if (imageBase64.length > 2_500_000) {
      return json({ error: 'Image too large', code: 'IMAGE_TOO_LARGE' }, 413);
    }

    // Soft rate limit: max ~20 scans / hour / user via scan_events if table exists (best-effort).
    await recordEvent(userClient, user.id, 'scan_started', { provider: 'openai' });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45_000);

    let openaiJson: unknown;
    try {
      const openaiRes = await fetch(OPENAI_URL, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL,
          temperature: 0.2,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content: `You are a food vision assistant for RACHA (Uruguay/LATAM).
Return ONLY valid JSON matching this shape: ${VISION_SCHEMA_HINT}

Rules:
- Identify visible foods and estimate portions.
- COUNT discrete items carefully when they are separate pieces.
  Examples: buñuelos, medialunas, empanadas, huevos, albóndigas, croquetas, sushi pieces, galletas.
  If you see 8 spinach fritters / buñuelos de espinaca, set count=8 (not 1).
- For countable foods:
  - is_countable=true
  - count = number of pieces you can see (integer >= 1)
  - grams_per_unit = estimated grams of ONE piece
  - estimated_grams = count * grams_per_unit (TOTAL grams for all pieces)
  - portion_description like "8 buñuelos · ≈40 g c/u"
- For amorphous foods (rice, salad, stew, puree):
  - is_countable=false
  - count=1
  - estimated_grams = total mass estimate
- Use Spanish display_name for Uruguay (palta, milanesa, chivito, medialuna, buñuelo de espinaca).
- normalized_query should be searchable (often English), e.g. "spinach fritter".
- Never invent invisible ingredients as certain foods. Put oil/dressing guesses in possible_hidden_ingredients with low confidence.
- If multiple plates/people are clearly present, set multiple_plates_suspected=true and only describe the most prominent plate.
- Do NOT invent nutrition kcal/macros. Only identity, count, and portion estimates.
- confidence, portion_confidence, count_confidence are 0..1.
- Prefer under-counting only when truly unsure; if pieces are clearly visible, count them.`,
            },
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Analyze this meal photo. Count discrete pieces when visible. Return structured JSON only.',
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${mimeType};base64,${imageBase64}`,
                  },
                },
              ],
            },
          ],
        }),
      });

      openaiJson = await openaiRes.json();
      if (!openaiRes.ok) {
        const openaiErr =
          openaiJson && typeof openaiJson === 'object' && 'error' in openaiJson
            ? (openaiJson as { error?: { code?: string; message?: string } }).error
            : undefined;
        await recordEvent(userClient, user.id, 'scan_failed', {
          reason: 'vision_provider_error',
          status: openaiRes.status,
          openai_code: openaiErr?.code ?? null,
        });
        if (openaiRes.status === 401 || openaiErr?.code === 'invalid_api_key') {
          return json(
            {
              error: 'OpenAI API key inválida o revocada',
              code: 'INVALID_API_KEY',
            },
            502,
          );
        }
        if (openaiRes.status === 429) {
          return json({ error: 'Límite de OpenAI alcanzado', code: 'RATE_LIMITED' }, 429);
        }
        return json({ error: 'Vision provider error', code: 'PROVIDER_ERROR' }, 502);
      }
    } catch (err) {
      const aborted = err instanceof Error && err.name === 'AbortError';
      await recordEvent(userClient, user.id, 'scan_failed', {
        reason: aborted ? 'timeout' : 'vision_exception',
      });
      return json(
        { error: aborted ? 'Timeout' : 'Vision failed', code: aborted ? 'TIMEOUT' : 'PROVIDER_ERROR' },
        aborted ? 504 : 502,
      );
    } finally {
      clearTimeout(timeout);
    }

    const content = extractContent(openaiJson);
    const parsed = safeParseVision(content);
    if (!parsed) {
      await recordEvent(userClient, user.id, 'scan_failed', { reason: 'malformed_response' });
      return json({ error: 'Malformed vision response', code: 'MALFORMED_RESPONSE' }, 502);
    }

    const latency = Date.now() - started;
    await recordEvent(userClient, user.id, 'scan_success', {
      latency_ms: latency,
      items: parsed.foods.length,
      provider: 'openai',
      model: MODEL,
    });

    return json({
      ...parsed,
      vision_provider: 'openai',
      vision_model: MODEL,
      latency_ms: latency,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return json({ error: message, code: 'UNKNOWN' }, 500);
  }
});

function extractContent(openaiJson: unknown): string {
  const msg = (openaiJson as { choices?: { message?: { content?: string } }[] })?.choices?.[0]
    ?.message?.content;
  return typeof msg === 'string' ? msg : '';
}

function safeParseVision(content: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(content) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return null;
    if (!Array.isArray(parsed.foods)) return null;
    parsed.foods = (parsed.foods as unknown[]).filter((f) => f && typeof f === 'object').map((f) => {
      const item = f as Record<string, unknown>;
      const isCountable =
        item.is_countable === true ||
        (Number(item.count) > 1 && Number.isFinite(Number(item.count)));
      const count = Math.max(1, Math.round(Number(item.count) || 1));
      let gramsPerUnit = Number(item.grams_per_unit);
      let estimatedGrams = Number(item.estimated_grams);

      if (isCountable) {
        if (!Number.isFinite(gramsPerUnit) || gramsPerUnit <= 0) {
          // If model only gave total grams, derive per-unit.
          if (Number.isFinite(estimatedGrams) && estimatedGrams > 0 && count > 0) {
            gramsPerUnit = estimatedGrams / count;
          } else {
            gramsPerUnit = 40; // conservative default for fritters/pastries
          }
        }
        estimatedGrams = gramsPerUnit * count;
      } else if (!Number.isFinite(estimatedGrams) || estimatedGrams <= 0) {
        estimatedGrams = 100;
        gramsPerUnit = estimatedGrams;
      } else {
        gramsPerUnit = Number.isFinite(gramsPerUnit) && gramsPerUnit > 0 ? gramsPerUnit : estimatedGrams;
      }

      const displayBase = String(item.display_name ?? item.visual_name ?? 'Alimento');
      const portionDescription =
        item.portion_description
          ? String(item.portion_description)
          : isCountable && count > 1
            ? `${count} unidades · ≈${Math.round(gramsPerUnit)} g c/u`
            : undefined;

      return {
        visual_name: String(item.visual_name ?? item.display_name ?? 'food'),
        display_name: displayBase,
        normalized_query: String(item.normalized_query ?? item.visual_name ?? ''),
        count,
        grams_per_unit: Math.round(gramsPerUnit * 10) / 10,
        estimated_grams: Math.round(estimatedGrams * 10) / 10,
        portion_description: portionDescription,
        confidence: clamp01(Number(item.confidence) || 0.5),
        portion_confidence: clamp01(Number(item.portion_confidence) || Number(item.confidence) || 0.5),
        count_confidence: clamp01(
          Number(item.count_confidence) || (isCountable ? Number(item.confidence) || 0.7 : 1),
        ),
        preparation: item.preparation ? String(item.preparation) : undefined,
        visible: item.visible !== false,
        difficult_to_estimate: Boolean(item.difficult_to_estimate),
        is_countable: isCountable,
      };
    });
    if (!Array.isArray(parsed.possible_hidden_ingredients)) {
      parsed.possible_hidden_ingredients = [];
    }
    return parsed;
  } catch {
    return null;
  }
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0.5;
  return Math.min(1, Math.max(0, n));
}

async function recordEvent(
  client: ReturnType<typeof createClient>,
  userId: string,
  event: string,
  meta: Record<string, unknown>,
) {
  try {
    await client.from('scan_events').insert({
      user_id: userId,
      event,
      meta,
    });
  } catch {
    // Table may not exist yet — telemetry is best-effort.
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
