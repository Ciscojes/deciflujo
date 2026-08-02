# ADR-008 — Auditoría append-only por organización

- **Estado:** aceptada
- **Fecha:** 2026-07-30

## Contexto

Deciflujo permite eliminar movimientos, gestionar invitaciones y tomar decisiones
financieras. Antes de acercarse al uso empresarial necesita responder quién
realizó una acción sensible, en cuál empresa y cuándo.

## Decisión

Se añade `audit_events`, una tabla append-only dentro de la base libSQL actual.
No existen endpoints de actualización o eliminación. Todos los eventos incluyen
`organization_id`, una fotografía del actor, una acción controlada, la entidad
afectada, un resumen y metadatos JSON mínimos.

La consulta exige `audit:read`, concedido únicamente a `owner` y `admin`.
Las mutaciones financieras registran el evento desde sus Route Handlers; las
invitaciones usan hooks de Better Auth.

## Consecuencias

- La trazabilidad se mantiene aislada por empresa.
- Los nombres del actor sobreviven a cambios posteriores del perfil.
- El esquema admite nuevas acciones sin crear tablas por cada módulo.
- El registro es de mejor esfuerzo: una caída de auditoría no presenta como
  fallida una operación principal que ya se completó.
- Para cumplimiento normativo futuro hará falta almacenamiento inmutable
  externo, retención definida y monitoreo de fallos.
