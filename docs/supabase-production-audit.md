# Auditoría Supabase — producción / TestFlight

Fecha: 2026-08-10

## Hallazgos

### RLS
- Tablas de negocio tienen RLS con policies por `auth.uid()` y partner `accepted`.
- **No** se encontraron policies `using (true)` / `with check (true)` en migraciones actuales.

### Storage
- `meal-images` y `avatars`: insert/update/delete limitados a carpeta del usuario.
- **Riesgo medio:** `meal_images_select_authenticated` y `avatars_select_authenticated` permiten **SELECT a cualquier usuario autenticado** del bucket completo.
  - Mitigación práctica: URLs suelen ser path-scoped; igual conviene endurecer a own+partner en una fase siguiente.
  - No se cambió en esta fase para no romper feed/partner sin prueba end-to-end.

### Account deletion
- Cliente: `src/services/account.ts` → Edge Function `delete-account`.
- Server: limpia Storage, tokens, partner_connections y borra `auth.users` (cascade a profiles).
- **Bloqueo externo:** la function debe desplegarse; sin deploy, la UI muestra error humano.

### Device tokens
- RLS own-only.
- Registro push: no pide permiso al launch; sync silencioso si ya granted; prompt en Settings.

### Edge Functions
- `notify-partner`: service role server-side; requiere `EXPO_ACCESS_TOKEN` para pushes reales.
- `delete-account`: JWT del usuario + service role solo server-side.

### Secrets
- `.env` / `.env*.local` en `.gitignore`
- `.env.example` sin secretos reales
- No hay `.p8`, certificates ni service_role en el árbol de app

## Acciones recomendadas (externas / siguientes)

1. Desplegar `delete-account`
2. Revisar select policies de Storage (own + partner)
3. Confirmar webhooks/triggers de `notify-partner` si querés push al guardar comida
4. Rotar DB password si se expuso en chats previos
