# App Privacy Questionnaire (App Store Connect) — respuestas recomendadas

Basado en el código actual de GymBro. **No marcar automáticamente en Apple**: revisar y confirmar en el formulario.

## Identifiers

| Dato | Recolecta | Uso típico sugerido | Vinculado al usuario | Tracking |
|------|-----------|---------------------|----------------------|----------|
| Email Address | Sí (Auth) | App Functionality | Sí | No |
| User ID | Sí (UUID Auth) | App Functionality | Sí | No |
| Device ID / Push token | Sí (Expo push token) | App Functionality | Sí | No |

## Contact Info

| Dato | Recolecta | Notas |
|------|-----------|-------|
| Name | Sí (display name) | Nombre mostrado, no necesariamente legal |
| Email | Sí | Login |

## Health & Fitness

| Dato | Recolecta | Notas |
|------|-----------|-------|
| Health | Sí (peso, altura, sexo biológico, año nacimiento, actividad, nutrición) | Usado para estimaciones y registro; **no** es app médica |
| Fitness | Parcial | Hábitos/rachas/desafíos; no workouts de HealthKit todavía |

## Sensitive Info

No se detecta recolección de datos sensibles de categorías especiales de Apple (religión, orientación sexual, etc.) más allá de sexo biológico para estimación nutricional.

## Photos / Videos

| Dato | Recolecta | Uso |
|------|-----------|-----|
| Photos or Videos | Sí | Comidas + avatar. Subidas a Supabase Storage |

## Other User Content

| Dato | Recolecta |
|------|-----------|
| Other User Content | Sí (comentarios, reacciones, comidas compartidas) |

## Usage Data / Diagnostics

No hay analytics de terceros (Amplitude, Firebase Analytics, etc.) en el código actual.
Logs locales limitados; no enviar diagnostics a un vendor de crash reporting todavía.

## Tracking

**Recomendación:** declarar que GymBro **no hace tracking** (no publicidad cross-app, no data brokers).

## Data Not Collected (ejemplos no presentes)

- Location
- Financial Info / Payment Info
- Contacts
- Browsing History
- Purchases

## Notas para el formulario

1. Indicar que los datos de salud/fitness son para funcionalidad de la app, no para publicidad.
2. Partner sharing es entre usuarios conectados, no venta a terceros.
3. Actualizar este documento si se agrega scanner IA externo, analytics o Sign in with Apple.
