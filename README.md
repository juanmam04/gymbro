# GymBro

App móvil social de nutrición para **dos personas** (parejas, gym bros, amigos).

La experiencia central:

**Foto de comida → análisis (mock/IA) → corrección → publicación → feed del partner**

> Exclusivamente iOS / Android con React Native + Expo. **No hay web app, landing ni dashboard.**

---

## Stack

- React Native + Expo (SDK 54)
- TypeScript (strict)
- Expo Router
- Supabase (Auth, PostgreSQL, Storage, Realtime preparado)
- TanStack Query (server state)
- Zustand (draft del scanner + onboarding temporal)
- React Hook Form + Zod
- expo-camera / expo-image-picker / expo-image
- expo-notifications (registro de tokens + Edge Function preparada)

---

## Requisitos

- Node.js 20+
- npm
- Expo Go (dispositivo) o simulador iOS / emulador Android
- Cuenta de [Supabase](https://supabase.com)

---

## Instalación

```bash
npm install
cp .env.example .env
```

Completá en `.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

Solo claves **públicas** (anon). Nunca embeds service role ni secretos de push en la app.

```bash
npm start
```

- iOS: `npm run ios` o escanear QR con Camera / Expo Go
- Android: `npm run android` o Expo Go

---

## Configurar Supabase

1. Creá un proyecto en Supabase.
2. Copiá URL y `anon` key a `.env`.
3. Ejecutá las migrations (recomendado con CLI):

```bash
npx supabase login
npx supabase link --project-ref <PROJECT_REF>
npx supabase db push
```

Alternativa: pegá el SQL de `supabase/migrations/20260310000000_init.sql` en el SQL Editor.

4. Auth → Providers → Email habilitado.
5. Para desarrollo rápido: Auth → Providers → Email → **desactivar “Confirm email”** (si no, el registro no devolverá sesión hasta confirmar).
6. Verificá que exista el bucket `meal-images` (lo crea la migration).

### Push notifications (fase siguiente / opcional ahora)

La app ya:

- pide permisos
- guarda `device_tokens`

Edge Function lista en `supabase/functions/notify-partner`.

Para activarla:

1. `supabase functions deploy notify-partner`
2. Secret `EXPO_ACCESS_TOKEN` (Expo Push access token) en Edge Function secrets
3. Database Webhook en `meals` INSERT → `notify-partner`

Sin ese secret, la function responde `skipped` (no finge que funciona).

---

## Scripts

| Script | Descripción |
|--------|-------------|
| `npm start` | Expo dev server |
| `npm run ios` | Abrir iOS |
| `npm run android` | Abrir Android |
| `npm run typecheck` | TypeScript |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |

---

## Onboarding (consumer)

Flujo:

1. Bienvenida  
2. Nombre  
3. Objetivo  
4. Datos básicos (edad, sexo biológico, altura, peso)  
5. Actividad  
6. Resultado estimado → **Home** (partner opcional)

Partner no bloquea el ingreso. Se invita desde Home/Perfil.

### Cómo se estiman los objetivos

Ver `src/features/nutrition/services/calculateNutritionTargets.ts`:

- BMR Mifflin–St Jeor
- TDEE = BMR × actividad
- Ajuste suave por objetivo (`eat_better` / `maintain` = mantenimiento)
- Proteína por kg, grasa ~28% kcal, carbos el resto
- Clamp a rangos seguros de producto

Es una estimación heurística, **no consejo médico**. Editable después en Perfil.

### Invitaciones / deep links

- Código de 6 caracteres + link `gymbro://join/CODIGO`
- Share sheet nativo (`Share.share`)
- Ruta `app/join/[code].tsx`
- Si no hay sesión, el código se guarda y se acepta al terminar onboarding

### Scanner (abstracción)

```ts
NutritionScanProvider.scanFood(imageUri) → ScanResult
```

Implementación actual: **`MockNutritionScanProvider`**

Plato mock:

- Pechuga de pollo 180 g
- Arroz blanco 200 g
- Palta 60 g

Para producción: implementar otro provider (OpenAI Vision, Edamam, etc.) y llamar `setNutritionScanProvider(...)`.

Las pantallas **no** dependen de un vendor concreto.

---

## Modelo de datos (resumen)

- `profiles`
- `partner_invites` + `partner_connections` (1 partner accepted por usuario)
- `nutrition_goals`
- `meals` + `meal_items`
- `meal_reactions` (1 reacción por usuario/meal)
- `device_tokens`

`meals.shared_with_partner` / `shared_group_id` están listos para “comí esto con mi partner” sin duplicar imágenes innecesariamente.

RLS: cada usuario ve/edita lo propio y lee datos del partner **accepted**. No hay acceso a conexiones ajenas.

---

## Estado del MVP

Funciona el vertical:

1. Registro / login
2. Onboarding
3. Vincular partner por código
4. Cámara / galería
5. Análisis mock
6. Edición de alimentos y gramos
7. Upload a Storage + meal + items
8. Feed compartido
9. Reacciones
10. Progress (yo / partner + 7 días)

### Product Upgrade

Además del MVP base:

- Modo simple / detallado
- Home 2.0 (agua, rachas, quick actions, partner card, realtime)
- Registro manual, búsqueda mock, repetir, saved meals
- Comidas juntos (shared invites)
- Comentarios + detalle/edición/borrado de meals
- Agua, peso, historial, insights, desafíos semanales
- Privacidad con RLS (`share_meals/goals/weight`)
- Preferencias de notificaciones

### Preparado, no bloqueante

- Sign in with Apple / Google (solo email/password en MVP)
- Realtime en feed (publication agregada; UI usa refetch/invalidate)
- Comidas compartidas (schema ready)

---

## Próximos pasos

1. Provider real de vision / nutrition
2. Activar webhook + `EXPO_ACCESS_TOKEN`
3. Realtime subscription en feed
4. UX de “comí con mi partner”
5. OAuth Apple / Google
6. EAS Build para TestFlight / Play internal

---

## Notas de producto

- Lenguaje interno: `partner` / `connection` / `user` (no boyfriend/girlfriend/couple)
- Las estimaciones se muestran como **estimación / ≈**, nunca como medición exacta
