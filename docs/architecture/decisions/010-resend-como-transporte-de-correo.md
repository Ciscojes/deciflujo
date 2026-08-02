# ADR-010 — Resend como transporte de correo transaccional

- **Estado:** aceptada
- **Fecha:** 2026-07-31

## Contexto

Deciflujo necesita entregar recuperación de contraseña e invitaciones. Usar una
cuenta personal de Gmail sería suficiente para una demostración, pero añade
límites, contraseñas de aplicación y menor observabilidad para producción.

## Decisión

Se usa Resend como transporte mediante su API HTTPS. Better Auth continúa como
único responsable de tokens y contraseñas. El acceso a Resend queda encapsulado
en `src/lib/email.ts` y se configura exclusivamente con variables de entorno.

No se instala el SDK porque el alcance actual utiliza una sola operación de la
API. Se envían versiones HTML y texto, remitente configurable y claves de
idempotencia.

## Consecuencias

- Los destinatarios pueden utilizar cualquier proveedor, incluido Gmail.
- La clave no se expone al navegador.
- El dominio remitente debe verificarse antes del despliegue.
- Una caída del proveedor impide solicitar un nuevo correo, pero no afecta
  sesiones activas ni operaciones financieras.
- Cambiar de proveedor requiere sustituir un adaptador, no el flujo de identidad.
