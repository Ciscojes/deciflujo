# Revisión interna de seguridad — 2 de agosto de 2026

Alcance: configuración Next.js, autenticación, autorización de API, aislamiento
por empresa, dependencias y preparación de observabilidad. Esta revisión interna
no sustituye una auditoría independiente ni una prueba de penetración.

## Controles confirmados

- Better Auth protege contraseñas, sesiones y recuperación de acceso.
- Las rutas financieras resuelven sesión, empresa activa, membresía y permiso.
- Los repositorios filtran por `organization_id`.
- Los secretos y bases locales están excluidos de Git.
- Existen límites de frecuencia para autenticación y recuperación.
- Los encabezados defensivos bloquean framing, sniffing y capacidades del
  navegador que la aplicación no utiliza.
- `npm audit` no reportó vulnerabilidades conocidas al realizar esta revisión.

## Cambios aplicados

- Validación de `Origin` en todas las mutaciones de las API financieras para
  reducir riesgo CSRF.
- HSTS condicionado al modo producción y encabezados adicionales de aislamiento.
- Sentry opcional, desactivado sin DSN, sin PII por defecto y con muestreo
  configurable.
- Validador de configuración que exige HTTPS, PostgreSQL con TLS y secretos
  completos antes de un despliegue.

## Pendientes externos

- Auditoría independiente de sesiones, CSRF, autorización e aislamiento.
- Prueba de penetración del dominio definitivo.
- Prueba de carga con 10 000 movimientos por empresa.
- Configuración y ensayo de alertas, respaldos y respuesta a incidentes.
