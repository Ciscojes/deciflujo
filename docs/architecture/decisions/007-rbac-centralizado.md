# ADR-007: autorización RBAC centralizada

- Estado: aceptada
- Fecha: 2026-07-29

## Contexto

Ocultar un botón no protege una operación: una persona todavía puede llamar la
API directamente. A la vez, repetir reglas de permisos en cada archivo hace
probable que la interfaz y el servidor terminen contradiciéndose.

## Decisión

Definir una matriz RBAC central en `src/lib/access-control.ts` con cuatro roles:
propietario, administrador, contador y colaborador.

Better Auth usa esa matriz para invitaciones y membresías. Los Route Handlers
la aplican otra vez mediante `getAuthContext`, después de validar sesión,
organización y membresía.

## Consecuencias

- La interfaz puede explicar y ocultar acciones no disponibles.
- Una llamada HTTP manipulada sigue recibiendo 403.
- Los permisos son comprobables con pruebas unitarias.
- RBAC expresa responsabilidades generales; reglas futuras basadas en montos o
  aprobaciones necesitarán políticas adicionales.
