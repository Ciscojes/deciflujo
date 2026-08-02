# ADR-009 — Cierres mensuales con bloqueo en la base

- **Estado:** aceptada
- **Fecha:** 2026-07-31

## Contexto

Una restricción aplicada únicamente en la interfaz no cubre todos los caminos
que crean movimientos. Además del formulario principal, liquidar una cuenta por
cobrar o pagar inserta una transacción financiera.

## Decisión

Cada cierre guarda una fotografía financiera por organización y mes. Dos
triggers de SQLite rechazan inserciones y eliminaciones de movimientos cuando
existe esa combinación en `monthly_closures`. El adaptador traduce el error de
base a `MonthClosedError` y la API responde HTTP 409.

Propietario y administrador pueden reabrir el período eliminando el cierre. La
reapertura es explícita y se registra en el historial de auditoría.

## Consecuencias

- Todas las rutas actuales y futuras respetan el bloqueo sin duplicar consultas.
- Una organización no bloquea el mismo mes de otra empresa.
- Las correcciones siguen siendo posibles mediante una reapertura autorizada.
- SQLite mantiene la garantía del MVP; al migrar a PostgreSQL habrá que recrear
  los triggers o adoptar una política equivalente dentro de una transacción.
