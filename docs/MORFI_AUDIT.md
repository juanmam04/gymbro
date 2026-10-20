# MORFI — auditoría inicial (20 octubre 2026)

Base: `codex/racha-subscription` d0a23d3; main a35dfd9. Se conserva todo el trabajo de ambas ramas. Desarrollo: `develop/morfi`. Sin merge a main.

| Área | Estado inicial | Evidencia / trabajo necesario |
|---|---|---|
| Expo iOS/Android, rutas, onboarding | EXISTE | app/, app.json; conservar identificadores nativos y enlaces gymbro |
| Autenticación y perfil | MEJORAR | AuthProvider confunde errores de red con falta de onboarding; sesión persistida |
| Registro manual, historial, editar/repetir, agua/peso | EXISTE | app/meal, app/history, src/services |
| Registro IA foto/texto | MEJORAR | analyze-food, proveedor real, validación/cupos; probar servicio real requiere secretos |
| Estadísticas personales/informe semanal | EXISTE | progress, coach; basadas en registros reales |
| Conexión de dos personas, privacidad, comidas compartidas | EXISTE | partner_connections, shared-meals, RLS |
| Duo, compra/restauración y verificación backend | MEJORAR | RevenueCat + racha_plan; falta validar configuración y sandbox de tiendas |
| Pacto: rescates/recuperación/misión bilateral | NO EXISTE | hay desafíos semanales pero no la máquina de estados acordada |
| Biblioteca de recetas | NO EXISTE | implementar contenido editorial con cantidades y pasos |
| Plan semanal | NO EXISTE | persistencia por usuario, fechas y porciones |
| Lista de compras | NO EXISTE | generación atómica/idempotente desde planificación y edición |
| Marca MORFI | MEJORAR | aún RACHA; conservar isotipo de palta/tomate de referencia, cambiar texto/paleta |
| Push, permisos y enlaces | MEJORAR | existen; quitar permiso de audio innecesario y verificar reconexión |
| Pruebas físicas, cobro real, publicación | BLOQUEADA | requieren build firmado, cuentas de prueba y configuración Apple/Google/RevenueCat |

Reglas recuperadas: 2 rescates iniciales, máximo 3, +1 cada 7 días válidos; rescatar dentro de 24h; misión compartida de 48h y confirmación de ambos. Registro manual e historial gratuitos. Una suscripción Duo habilita dos cuentas independientes sin compartir datos privados por defecto.

La auditoría inicial es de código, no certifica producción ni dispositivos. Resultados de pruebas y bloqueos exactos se registran en MORFI_VERIFICATION.md al implementar.
