# Deep linking — GymBro

## Scheme
`gymbro`

## Ruta soportada
`gymbro://join/CODE` → `app/join/[code].tsx`

## Producción / TestFlight
- Custom scheme configurado en `app.json` (`scheme: gymbro`)
- Android intentFilters con `pathPrefix: /join`
- Código manual siempre disponible como fallback

## Limitaciones
- Universal Links (HTTPS) **no** implementados (requieren dominio + Associated Domains)
- En algunos clientes de mensajería el link custom puede no ser clickeable; compartir código en texto sigue siendo válido
- No hay aplicación web asociada
