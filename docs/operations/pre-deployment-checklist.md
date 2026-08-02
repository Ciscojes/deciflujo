# Checklist previo al despliegue

No ejecutar el despliegue hasta completar cada punto en el entorno definitivo.

## Infraestructura

- [ ] Base PostgreSQL permanente creada con TLS.
- [ ] `npm run db:auth:migrate` ejecutado y `/api/health` saludable.
- [ ] Respaldo automático cifrado y restauración de ensayo aprobada.
- [ ] Hosting, región y política de retención documentados.

## Secretos y correo

- [ ] `BETTER_AUTH_SECRET` aleatorio de al menos 32 caracteres.
- [ ] URL pública configurada como origen confiable.
- [ ] Dominio comprado y verificado en Resend.
- [ ] Claves guardadas en el gestor del proveedor, nunca en Git.

## Seguridad y calidad

- [ ] CI verde: unitarias, tipos, lint, build y E2E PostgreSQL.
- [ ] Auditoría independiente de autorización, CSRF, sesiones y aislamiento.
- [ ] Prueba de carga con 10 000 movimientos por empresa.
- [ ] Seguimiento externo de errores y alertas conectado.

## Producto y cumplimiento

- [ ] Nombre, dominio y marca revisados formalmente.
- [ ] Política de privacidad y términos revisados por un profesional.
- [ ] Responsable legal, canal de soporte y proceso de eliminación definidos.
- [ ] Datos demo retirados de las empresas que usarán información real.
