# Política de Privacidad — GymBro (ES)

**Versión borrador para publicación futura.**  
Responsable: `[NOMBRE_LEGAL]`  
Contacto de privacidad: `[EMAIL_DE_PRIVACIDAD]`  
Última actualización: 2026-08-10

## 1. Quiénes somos

GymBro es una aplicación móvil de nutrición social para iOS y Android. Esta política describe cómo tratamos la información personal cuando usás la app.

## 2. Información que recopilamos

- **Cuenta:** email, contraseña (gestionada por el proveedor de autenticación), nombre para mostrar, foto de perfil opcional.
- **Perfil corporal / onboarding:** año de nacimiento, sexo biológico, altura, peso, nivel de actividad (para estimar objetivos).
- **Nutrición y hábitos:** comidas, macros estimados, agua, historial de peso, objetivos, preferencias.
- **Contenido social:** conexión con partner, reacciones, comentarios, comidas compartidas, desafíos.
- **Fotos:** imágenes de comidas y avatar que subís.
- **Dispositivo:** token de notificaciones push si las habilitás.

## 3. Finalidad

Usamos estos datos para:
- crear y administrar tu cuenta;
- estimar un punto de partida nutricional;
- registrar progreso;
- permitir funciones sociales con tu partner según tus ajustes de privacidad;
- enviarte notificaciones que hayas aceptado;
- mantener seguridad y prevenir abuso;
- cumplir solicitudes de eliminación de cuenta.

## 4. Almacenamiento

Los datos se almacenan en infraestructura de **Supabase** (base de datos, autenticación y almacenamiento de archivos). El acceso está protegido con autenticación y políticas de seguridad a nivel de fila (RLS).

## 5. Proveedores

- **Supabase:** backend de Auth, base de datos y Storage.
- **Expo / Apple Push Notification service:** entrega de notificaciones push cuando están habilitadas.
- Un proveedor de análisis nutricional por imagen (**OpenAI**, vía Edge Function segura) puede recibir fotos de comidas para identificar alimentos y estimar porciones. Los valores nutricionales se calculan con bases de datos/tablas de referencia, no se inventan ciegamente por el modelo.
- **Open Food Facts** puede usarse para productos con código de barras.

## 6. Compartir con tu partner

Si te conectás con otra persona en GymBro, podés compartir progreso, comidas y algunos datos de perfil según tus preferencias de privacidad. No vendemos tu información personal.

## 7. Imágenes de comidas e información nutricional

Las fotos que subís se usan para registrar comidas. Las estimaciones nutricionales son aproximadas y pueden contener errores. No constituyen consejo médico.

## 8. Notificaciones

Solo pedimos permiso de notificaciones cuando lo activás. Podés desactivarlas en la app y en Ajustes del sistema.

## 9. Seguridad

Aplicamos medidas razonables (TLS, autenticación, RLS, secretos de servidor fuera de la app). Ningún sistema es 100% seguro.

## 10. Conservación

Conservamos los datos mientras tu cuenta exista o sea necesario para prestar el servicio. Si eliminás la cuenta, borramos o desvinculamos los datos asociados según nuestro flujo de eliminación, salvo retención legal mínima si aplicara.

## 11. Eliminación

En la app: Perfil → Cuenta → Eliminar cuenta. También podés escribir a `[EMAIL_DE_PRIVACIDAD]`.

## 12. Menores

GymBro no está dirigida a menores de 13 años (o la edad mínima aplicable en tu jurisdicción). Si detectamos una cuenta de un menor sin consentimiento válido, la eliminaremos.

## 13. Cambios

Podemos actualizar esta política. Publicaremos la versión vigente en la URL pública donde esté alojada.

## 14. Contacto

Consultas de privacidad: `[EMAIL_DE_PRIVACIDAD]`  
Responsable: `[NOMBRE_LEGAL]`

---

**Pendiente externo:** publicar este documento en una URL HTTPS pública antes del envío a App Review (no requerido solo para TestFlight interno, sí para App Store).
