# Preparación para un despliegue futuro

Este plan deja Deciflujo listo para configurar un entorno, pero no autoriza ni
ejecuta un despliegue.

## Componentes previstos

- Aplicación Next.js ejecutada como proceso Node.js.
- PostgreSQL permanente con TLS y respaldos cifrados.
- Resend con dominio remitente verificado.
- Sentry opcional para errores y trazas, sin datos personales por defecto.
- Un proveedor de hosting con región, retención y responsables documentados.

## Configuración

1. Copiar `.env.production.example` fuera del repositorio como
   `.env.production.local`.
2. Reemplazar cada marcador con secretos guardados en el proveedor definitivo.
3. Validar sin mostrar secretos:

   ```bash
   node --env-file=.env.production.local scripts/validate-production-env.mjs
   ```

4. En el futuro, ejecutar migraciones, build, pruebas PostgreSQL y restauración
   de ensayo siguiendo el runbook.

## Decisiones todavía abiertas

- Dominio y URL pública.
- Proveedor, región y política de retención.
- Cuenta PostgreSQL y estrategia de respaldo.
- Cuenta Resend y remitente verificado.
- Cuenta Sentry, proyecto, alertas y responsables.

Ningún recurso externo fue creado por este trabajo.
