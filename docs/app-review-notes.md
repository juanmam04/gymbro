# App Review Notes — plantilla

Usar cuando se envíe a App Review (fase posterior a TestFlight). **No incluir credenciales reales en el repo.**

## Resumen

GymBro es una app de nutrición social para dos personas. Permite registrar comidas, ver progreso estimado y conectar con un partner mediante código de invitación.

## Cómo crear cuenta

1. Abrir la app
2. Registrarse con email y contraseña
3. Completar onboarding (nombre, objetivo, datos corporales básicos)
4. Llegar al Home (el partner es opcional)

## Cuenta demo para revisión

- Email: `[REVIEW_EMAIL]`
- Password: `[REVIEW_PASSWORD]`

Crear esta cuenta en producción **antes** de enviar a review. Debe tener:
- onboarding completo
- al menos unas comidas de ejemplo
- (opcional) un segundo usuario partner ya conectado, o instrucciones claras para unirse

## Cómo conectar partner

1. Perfil → Invitar / Partner invite
2. Compartir código o deep link `gymbro://join/CODE`
3. El otro usuario acepta desde Unirse / pegar código

## Cómo registrar comida

1. Tab Scan o botón de agregar en Home
2. Foto (cámara/galería) o registro manual
3. Revisar estimación (puede ser aproximada) y guardar

## Privacidad / settings

- Perfil → Privacidad
- Perfil → Notificaciones
- Perfil → Cuenta (eliminar cuenta)

## Eliminar cuenta

Perfil → Cuenta → Eliminar cuenta → confirmaciones → la cuenta y datos asociados se eliminan vía Edge Function `delete-account`.

## Notas técnicas para Apple

- No hay compras in-app en esta versión
- No es una app médica; las estimaciones son aproximadas
- Push notifications requieren permiso del usuario
- Deep link custom scheme: `gymbro://`

## Contacto del desarrollador

`[EMAIL_DE_PRIVACIDAD]`
