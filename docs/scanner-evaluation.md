# Scanner evaluation harness — GymBro

## Objetivo

Comparar estimaciones del scanner contra comidas pesadas con balanza.

## Protocolo

1. Pesar cada componente (gramos reales).
2. Armar el plato y fotografiar con luz normal, desde arriba ~45–60 cm.
3. Escanear en GymBro.
4. Anotar estimación AI (antes de editar).
5. Comparar vs balanza.

## Planilla sugerida

| id | food | grams_real | grams_ai | kcal_real* | kcal_ai | notes |
|----|------|------------|----------|------------|---------|-------|
| 1 | pechuga | | | | | |
| 2 | arroz | | | | | |

\*kcal_real = gramos_reales × (kcal/100g de fuente de referencia, p.ej. curated table).

## Métricas

- **MAE gramos** = mean(|grams_ai − grams_real|)
- **% error calorías** = |kcal_ai − kcal_real| / kcal_real × 100
- **% error proteína** = igual para proteína
- **Food detection hit rate** = alimentos esperados detectados / esperados

## Dataset mínimo recomendado (Uruguay)

- Pollo + arroz + palta
- Milanesa + ensalada
- Medialunas
- Yogur con código de barras
- Empanada
- Pasta con salsa (probar clarification de aceite)

## Notas

- No commitear fotos privadas al repo.
- Guardar resultados localmente / spreadsheet.
- El mock provider NO sirve para este benchmark; usar `EXPO_PUBLIC_NUTRITION_SCAN_PROVIDER=real` + Edge Function con `OPENAI_API_KEY`.
