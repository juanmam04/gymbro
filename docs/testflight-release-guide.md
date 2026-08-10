# Guía TestFlight — GymBro (iOS / EAS)

Fecha de preparación: 2026-08-10  
Actualización Bundle ID iOS: 2026-08-10  
Stack: Expo SDK 54 · React Native 0.81.5 · EAS Build

## Identidad confirmada en el proyecto

| Campo | Valor |
|-------|-------|
| Nombre | GymBro |
| Slug | gymbro |
| Scheme | gymbro |
| Bundle ID iOS | **`com.juanmamartinez.gymbro`** |
| Version | 1.0.0 |
| iOS buildNumber inicial | 1 (EAS `autoIncrement` en production) |
| Android package | `com.gymbro.app` (independiente del Bundle ID iOS; no requiere cambio) |
| Android versionCode | 1 |

**Importante:** el Bundle ID iOS definitivo es `com.juanmamartinez.gymbro`. Apple rechazó `com.gymbro.app` por no estar disponible. No vuelvas a usar `com.gymbro.app` como Bundle ID iOS.

El `extra.eas.projectId` **no está definido** todavía. Debés vincular el proyecto con tu cuenta Expo (`eas init`).

---

## 0. Prerrequisitos

- Membresía Apple Developer activa (ya la tenés)
- Node.js instalado
- Cuenta Expo (expo.dev) propietaria del proyecto
- Supabase de producción con migrations aplicadas
- Edge Function `delete-account` desplegada si querés probar borrado de cuenta en TestFlight
- Icono: `assets/icon.png` (1024×1024, concepto G + hoja) ya configurado
- App ID iOS registrado como `com.juanmamartinez.gymbro`

---

## 1. Instalar dependencias

```bash
cd /Users/juanmamartinez/gymbro
npm install
```

## 2. Instalar EAS CLI

```bash
npm install -g eas-cli
eas --version
```

## 3. Login Expo

```bash
eas login
```

Usá la cuenta Expo dueña del proyecto GymBro.

## 4. Vincular proyecto EAS

```bash
eas init
```

Qué puede preguntar EAS:
- **Create a new project / link existing:** elegí crear nuevo para este repo (o linkear si ya existe “gymbro” en tu cuenta).
- Confirmar slug `gymbro`.

Esto escribirá `extra.eas.projectId` real en `app.json`/`app.config`. **No inventes el ID a mano.**

## 5. Confirmar Bundle Identifier

Antes de crear/seleccionar la app en Apple:

1. Abrí App Store Connect → Nueva app (o continuá el alta)
2. Usá exactamente: `com.juanmamartinez.gymbro`
3. Ese identificador debe existir previamente en Apple Developer → Identifiers

## 6. App ID en Apple Developer (si aún no existe)

Certificates, Identifiers & Profiles → Identifiers → App IDs → Register

- **Description:** `GymBro`
- **Bundle ID:** Explicit
- **Identifier:** `com.juanmamartinez.gymbro`
- Capabilities:
  - **Push Notifications** — sí (la app usa expo-notifications)
  - Sign in with Apple — **no** (auth actual email/password)
  - Associated Domains — **no** (Universal Links quedan para después)

## 7. Variables de entorno en EAS (recomendado)

No subas `.env.local` al repo. Para builds de producción:

```bash
eas env:create --name EXPO_PUBLIC_SUPABASE_URL --value "https://YOUR_PROJECT.supabase.co" --environment production
eas env:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "YOUR_ANON_KEY" --environment production
```

(O configurá secrets/env desde el dashboard de Expo.)  
Usá los valores reales de tu proyecto; no los pegues en git.

También podés usar `eas.json` + `eas secret` según la UI actual de Expo Env.

## 8. Primera build iOS (App Store / TestFlight)

```bash
eas build --platform ios --profile production
```

Qué suele pedir EAS:
- **Apple ID** / App Store Connect API key — preferí API key o login interactivo; **no** guardes passwords en el repo
- **Generate new distribution certificate / provisioning profile?** → Sí, dejar que EAS gestione (recomendado)
- Selección del equipo Apple Developer correcto
- Confirmar Bundle Identifier `com.juanmamartinez.gymbro`

Esperá el build en https://expo.dev

## 9. Crear/seleccionar app en App Store Connect

Si todavía estás en “Nueva app”, usá exactamente:

- Plataforma: **iOS**
- Nombre: **GymBro**
- Idioma principal: **Español**
- Bundle ID / ID de pack: **com.juanmamartinez.gymbro**
- SKU: **gymbro-ios-001**
- Acceso de usuarios: **Acceso ilimitado** (salvo que necesites restringir en ASC)

## 10. Subir a TestFlight

Cuando el build termine:

```bash
eas submit --platform ios --profile production --latest
```

EAS puede pedir:
- App Store Connect app selection (GymBro / bundle `com.juanmamartinez.gymbro`)
- Apple credentials / API key

Alternativa manual: descargar el `.ipa` desde Expo y subir con Transporter.

## 11. Processing en TestFlight

1. App Store Connect → TestFlight
2. Esperar “Processing” → “Ready to Test”
3. Agregar testers internos (tu usuario Apple)
4. Instalar TestFlight en el iPhone e instalar GymBro

## 12. Qué NO hacer en esta fase

- No enviar a App Review
- No publicar en App Store
- No configurar compras/suscripciones
- No inventar project IDs ni subir `.p8` al git
- No volver a usar `com.gymbro.app` como Bundle ID iOS

---

## Limitaciones deep link en TestFlight

- Scheme `gymbro://join/CODE` funciona si iOS abre el link hacia la app instalada
- Universal Links HTTPS **no** están configurados todavía
- Siempre debe funcionar el código manual en Partner → Unirse

## Push en TestFlight

- EAS puede gestionar credenciales APNs al habilitar push
- Configurá `EXPO_ACCESS_TOKEN` en secrets de la Edge Function `notify-partner` si querés pushes reales
- En dispositivo físico concedé permiso desde Perfil → Notificaciones

## Deploy Edge Function delete-account

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy delete-account
```

Verificar que `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_ANON_KEY` / `SUPABASE_URL` estén disponibles para la function (Supabase las inyecta normalmente).
