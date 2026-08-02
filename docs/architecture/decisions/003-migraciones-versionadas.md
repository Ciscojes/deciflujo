# ADR-003: migraciones versionadas desde el segundo incremento

- Estado: aceptada
- Fecha: 2026-07-29

## Contexto

El módulo Cuentas requiere cambiar una base que ya contiene movimientos. Borrar
el archivo local sería sencillo, pero no representa cómo evoluciona un sistema
real y destruye datos.

## Decisión

Registrar cada cambio en `schema_migrations` y ejecutar únicamente migraciones
pendientes durante la preparación de la base.

La migración de cuentas:

1. crea `accounts`;
2. añade `transactions.account_id`;
3. crea cuentas iniciales;
4. relaciona movimientos existentes con la cuenta principal;
5. crea un índice para consultar por cuenta.

## Consecuencias

- El esquema puede evolucionar sin reiniciar datos.
- Cada migración debe ser revisada y probada con datos existentes.
- Una migración aplicada no se modifica en producción; una corrección requiere
  una migración posterior.
- La solución actual es educativa. Antes de producción se adoptará una
  herramienta madura de migraciones junto con PostgreSQL.
