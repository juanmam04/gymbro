# Deploy: delete-account

```bash
supabase login
supabase link --project-ref <YOUR_PROJECT_REF>
supabase functions deploy delete-account
```

La function:
- exige `Authorization: Bearer <user access token>`
- identifica al usuario con el JWT
- usa `SUPABASE_SERVICE_ROLE_KEY` solo en el servidor (inyectada por Supabase)
- limpia Storage `meal-images` / `avatars`, `device_tokens`, `partner_connections`
- elimina `auth.users` (cascade a profiles y datos relacionados)

Sin este deploy, Perfil → Cuenta → Eliminar cuenta fallará con mensaje humano indicando que falta desplegar la function.

No uses service_role en la app móvil.
