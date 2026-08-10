# Pre-TestFlight Checklist — GymBro

## APP

- [ ] Auth funciona (registro + login + logout)
- [ ] Onboarding funciona
- [ ] Home funciona sin partner
- [ ] Partner invite funciona
- [ ] Partner accept funciona (código manual)
- [ ] Scanner mock/estado actual entendido (no afirmar IA productiva)
- [ ] Manual meal funciona
- [ ] Feed funciona
- [ ] Reactions funcionan
- [ ] Comments funcionan
- [ ] Progress funciona
- [ ] Privacy funciona
- [ ] Delete account funciona (Edge Function desplegada)

## IOS

- [ ] Bundle ID = `com.gymbro.app` confirmado en Apple
- [ ] App ID registrado
- [ ] Icon 1024 (`assets/icon.png`)
- [ ] Splash negro + logo
- [ ] Camera permission copy
- [ ] Photo permission copy
- [ ] Push permission JIT (settings)
- [ ] Deep link `gymbro://join/...`
- [ ] Build number (EAS autoIncrement production)

## BACKEND

- [ ] Production Supabase
- [ ] Migrations aplicadas
- [ ] RLS revisado
- [ ] Storage buckets (meal-images, avatars)
- [ ] Edge Functions (`notify-partner`, `delete-account`)
- [ ] Secrets (no en git): anon en EAS env; service role solo server; Expo push token

## APPLE

- [ ] Apple Developer membership
- [ ] App Store Connect app creada
- [ ] Build uploaded
- [ ] TestFlight processing
- [ ] Internal tester agregado

## BLOQUEOS CONOCIDOS ANTES DE DECLARAR LISTO

- [ ] `eas init` / `projectId` real
- [ ] Env vars `EXPO_PUBLIC_*` en EAS
- [ ] Deploy `delete-account` si se prueba borrado
- [ ] Confirmar email de Auth / SMTP si el registro lo exige
