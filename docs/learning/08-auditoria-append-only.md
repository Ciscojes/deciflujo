# Lección 08 — Auditoría append-only

## Qué problema resuelve

Un registro operativo muestra el estado actual. Una auditoría explica cómo se
llegó a ese estado. Por eso eliminar un movimiento no borra su huella: Deciflujo
conserva un evento separado que indica actor, acción y fecha.

## Por qué los eventos no se editan

Si el historial pudiera corregirse desde la misma interfaz perdería valor como
evidencia. El módulo solo expone dos operaciones:

```text
record(event) → añade una fila
list(organizationId) → consulta filas de una empresa
```

No hay `update` ni `delete`.

## Dónde se registra cada acción

- Las finanzas se auditan en los Route Handlers, después de que el caso de uso
  termina correctamente.
- Las invitaciones se auditan con hooks de Better Auth, porque esa biblioteca es
  quien ejecuta la operación real.
- La lectura vuelve a comprobar sesión, membresía y permiso `audit:read`.

## Aislamiento

Guardar `organization_id` no basta. Toda consulta debe incluirlo explícitamente:

```sql
SELECT *
FROM audit_events
WHERE organization_id = ?
ORDER BY created_at DESC
LIMIT ?
```

Así, conocer el identificador de un evento ajeno no concede acceso a él.

## Límite actual

Esta bitácora mejora la trazabilidad del MVP, pero no sustituye una solución de
cumplimiento. Un sistema regulado añadiría almacenamiento externo inmutable,
alertas ante fallos, políticas de retención y sellado criptográfico.
