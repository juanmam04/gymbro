# Food scanner — arquitectura y operación

## Arquitectura

```
App (Scan)
  → RealNutritionScanProvider | MockNutritionScanProvider
  → (real) Supabase Edge Function analyze-food + OPENAI_API_KEY
  → Vision JSON (qué ve + gramos estimados)
  → Client: curated LATAM nutrition match (NO kcal del LLM)
  → Result UI editable + clarifications
  → createMeal
```

Barcode:

```
Camera barcode → Open Food Facts API v2 product/{code} → serving × qty → result
```

## Providers

| Rol | Implementación |
|-----|----------------|
| Vision | OpenAI `gpt-4o` vía Edge Function (intercambiable con `VISION_MODEL`) |
| Nutrition (generic) | Curated LATAM table (`curatedFoods.ts`) |
| Barcode | Open Food Facts (sin API key; User-Agent identificado) |
| Mock scan | `MockNutritionScanProvider` (dev/tests) |

## Feature flags

```
EXPO_PUBLIC_NUTRITION_SCAN_PROVIDER=mock|real
EXPO_PUBLIC_FOOD_SEARCH_PROVIDER=mock|curated
```

Defaults: mock en `__DEV__`, real en production builds.

## Secrets (Supabase Edge Functions)

```bash
supabase secrets set OPENAI_API_KEY=sk-...
# optional:
supabase secrets set VISION_MODEL=gpt-4o
supabase functions deploy analyze-food
```

Aplicar migration:

```bash
# sql: supabase/migrations/20260310000005_scan_sessions.sql
```

## Privacy

Las fotos enviadas al scanner real se transmiten a OpenAI solo para análisis nutricional visual.
No se usan kcal inventadas por el modelo como fuente primaria.
Documentar en App Privacy / privacy-policy antes de App Review.
