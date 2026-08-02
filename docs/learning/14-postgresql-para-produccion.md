# Lección 14 — PostgreSQL para producción

## El problema no era únicamente la conexión

Cambiar `file:deciflujo.db` por una URL remota no basta. Deciflujo tenía dos usuarios
de la base: Better Auth para identidad y los repositorios financieros para el
negocio. También existían parámetros, fechas, transacciones y triggers propios
de SQLite.

## La frontera común

`database-client.ts` define las operaciones mínimas que necesitan los
repositorios. El adaptador libSQL conserva el comportamiento local y el adaptador
PostgreSQL usa un pool, parámetros `$1…$n` y transacciones reales. Las consultas
de períodos se expresaron con funciones compatibles con ambos motores.

La arquitectura no intenta fingir que los dos dialectos son idénticos. Cada
motor mantiene su preparación de esquema y su implementación del trigger
`MONTH_CLOSED`, mientras el dominio recibe el mismo error y aplica la misma
regla.

## Secuencia de despliegue

1. Crear una base PostgreSQL vacía.
2. Configurar `DATABASE_PROVIDER=postgres` y `DATABASE_URL`.
3. Ejecutar `npm run db:auth:migrate` para identidad y organizaciones.
4. Compilar e iniciar Deciflujo.
5. El primer acceso prepara el esquema financiero idempotente.

La prueba integrada se ejecutó contra PostgreSQL 16 y confirmó registro,
organizaciones, cuentas demo, movimientos, presupuestos, tendencias, cierres y
bloqueo SQL de períodos cerrados.

## Qué no hace esta migración

Preparar PostgreSQL no copia silenciosamente el archivo SQLite local. Importar
datos reales exige comparar conteos, relaciones y saldos antes de cambiar el
tráfico; por eso queda como una operación explícita y recuperable.
