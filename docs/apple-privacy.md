# Privacidad de GymBro (auditoría interna)

Documento basado en el código actual. No inventa categorías que la app no usa.

## 1. Qué datos recoge GymBro

**Cuenta / identidad**
- Email (Supabase Auth)
- Nombre para mostrar
- Foto de perfil (opcional)
- Año de nacimiento, sexo biológico, altura, peso, nivel de actividad (onboarding / perfil)

**Nutrición y hábitos**
- Objetivos nutricionales estimados (kcal/macros)
- Comidas registradas (manual, mock scan, repetidas, guardadas)
- Ítems de comida y macros asociados
- Fotografías de comidas (Storage)
- Agua diaria
- Historial de peso
- Preferencias de visualización y privacidad
- Preferencias de notificaciones

**Social**
- Invitaciones y conexiones partner
- Reacciones y comentarios
- Comidas compartidas / invites compartidos
- Desafíos

**Dispositivo**
- Expo push token (si el usuario concede notificaciones)
- Plataforma iOS/Android del token

## 2. Para qué se usan

- Autenticar y mantener sesión
- Calcular un punto de partida nutricional estimado
- Registrar y mostrar progreso
- Compartir (según privacidad) con el partner
- Enviar notificaciones push cuando estén configuradas
- Permitir eliminar la cuenta y sus datos

## 3. Qué se comparte con el partner

Solo si hay conexión `accepted` y según flags de privacidad del perfil:
- Perfil visible / nombre / avatar
- Comidas del feed (según políticas RLS)
- Objetivos (si `share_goals`)
- Peso (si `share_weight` / policies de weight)
- Reacciones y comentarios en comidas visibles

## 4. Qué permanece privado

- Email de Auth no se expone a otros usuarios vía tablas públicas
- Datos de un usuario sin partner no son visibles a terceros
- Tokens de dispositivo solo del propio usuario (RLS)
- Service role key nunca viaja al cliente

## 5. Servicios externos que reciben datos

| Servicio | Datos | Motivo |
|----------|-------|--------|
| Supabase (Auth, DB, Storage) | cuenta, nutrición, imágenes, tokens | backend principal |
| Expo Push / APNs (vía EAS) | push token + payload de notificación | avisos al partner / recordatorios |
| OpenAI (Edge Function `analyze-food`) | foto de comida (base64) + prompt | detección visual de alimentos / porciones estimadas — solo si scanner real está activo |
| Open Food Facts | código de barras / respuesta pública de producto | lookup de productos empaquetados |

Las kcal/macros **no** se toman del modelo de visión como fuente primaria: se calculan con tablas curadas / Open Food Facts.

## 6. Supabase

- Cliente móvil usa solo `EXPO_PUBLIC_SUPABASE_URL` + anon key
- RLS habilitado en tablas de negocio
- Edge Functions usan service role solo server-side (`notify-partner`, `delete-account`)

## 7. Scanner

Estado actual: `MockNutritionScanProvider` (estimación simulada local).
No hay envío de fotos a un proveedor de IA externo en producción todavía.

## 8. Expo Push Notifications

- Token se guarda en `device_tokens` tras permiso concedido
- `notify-partner` envía a Expo Push API si existe `EXPO_ACCESS_TOKEN`
- En simulador no se registra token físico

## 9. Cómo eliminar datos / cuenta

En la app: **Perfil → Cuenta → Eliminar cuenta**.

Flujo técnico:
1. Cliente invoca Edge Function `delete-account` con JWT del usuario
2. Función limpia Storage (meal-images / avatars), tokens y conexiones
3. Elimina `auth.users` (cascade a perfiles y datos asociados)

**Acción externa requerida:** desplegar `delete-account` en el proyecto Supabase antes de TestFlight si se quiere probar eliminación end-to-end.
