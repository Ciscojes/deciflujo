# ADR-006: Better Auth y aislamiento por organización

- Estado: aceptada
- Fecha: 2026-07-29

## Contexto

Deciflujo necesita usuarios y varias empresas sin convertir la autenticación en
criptografía casera. También debe impedir que una persona consulte recursos de
una organización cambiando un identificador en el navegador.

## Alternativas consideradas

- Construir usuarios, hashes y cookies directamente: ofrece control, pero
  aumenta mucho el riesgo de seguridad y el trabajo de mantenimiento.
- Auth.js con un modelo multiempresa propio: solución válida, aunque requiere
  implementar membresías e invitaciones adicionales.
- Better Auth con su complemento de organizaciones: integra correo/contraseña,
  sesiones y membresías, funciona con Next.js y SQLite y es software abierto.

## Decisión

Usar Better Auth para identidad y sesiones. Las tablas financieras conservan
un `organization_id`, y los adaptadores de repositorio se construyen ligados a
una organización concreta.

No se confía únicamente en la redirección de la interfaz. Cada endpoint:

1. valida la sesión;
2. exige una organización activa;
3. confirma que el usuario sea miembro;
4. filtra la operación por `organization_id`.

## Consecuencias

- Las contraseñas no son responsabilidad del dominio financiero.
- Una cuenta de usuario puede pertenecer a varias empresas.
- El aislamiento se aplica en el servidor incluso si se manipula el cliente.
- SQLite sigue siendo adecuado para aprendizaje y desarrollo local.
- PostgreSQL, recuperación, auditoría y E2E ya tienen adaptadores y validación.
  Antes de producción todavía deben configurarse secretos reales y realizarse
  una revisión independiente en el entorno definitivo.
