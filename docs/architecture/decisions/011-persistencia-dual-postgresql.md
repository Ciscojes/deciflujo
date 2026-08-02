# ADR-011 — Persistencia dual SQLite y PostgreSQL

- Estado: aceptada
- Fecha: 2026-07-31

## Contexto

SQLite permite aprender y trabajar localmente sin servicios adicionales, pero
un archivo dentro de un despliegue efímero no garantiza persistencia ni soporta
bien varias instancias de la aplicación.

## Decisión

Mantener SQLite como motor local y habilitar PostgreSQL para producción mediante
`DATABASE_PROVIDER` y `DATABASE_URL`. Autenticación y finanzas comparten la misma
base PostgreSQL. Los repositorios consumen un cliente interno con operaciones
`execute`, `batch` y `transaction`; el adaptador PostgreSQL convierte los
marcadores `?` a parámetros nativos y usa el pool oficial `pg`.

Better Auth migra sus tablas con su CLI. Deciflujo prepara el esquema financiero
base de forma idempotente y recrea en PostgreSQL el bloqueo de movimientos para
meses cerrados mediante triggers.

## Consecuencias

- El desarrollo local existente continúa sin cambios ni pérdida de datos.
- El despliegue puede usar una base PostgreSQL administrada y persistente.
- Las reglas de negocio y casos de uso no dependen del motor elegido.
- Una instalación PostgreSQL nueva incluye datos de demostración reclamables
  por la primera organización.
- El traslado de información histórica desde un archivo SQLite no es automático
  y debe realizarse como una operación independiente y verificable.
