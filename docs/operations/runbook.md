# Manual de operación de Deciflujo

## Salud

`GET /api/health` comprueba la aplicación y la base con un límite de tres
segundos. Responde `200` con `status: ok` o `503` sin exponer credenciales.

## Respaldo

Con `DATABASE_URL` configurada y las herramientas cliente de PostgreSQL:

```bash
npm run db:backup
```

El archivo se crea con permisos privados en `backups/` o en
`DECIFLUJO_BACKUP_DIR`. El comando valida el formato con `pg_restore --list`.
Los respaldos deben copiarse después a almacenamiento cifrado y separado del
servidor; el repositorio los ignora.

## Restauración

La restauración borra y recrea objetos de la base elegida. Exige confirmación
explícita y debe probarse primero en una base vacía:

```bash
DECIFLUJO_RESTORE_CONFIRM=RESTORE_DECIFLUJO \
  npm run db:restore -- /ruta/deciflujo-fecha.dump
```

Después se comprueba `/api/health`, conteos de usuarios, organizaciones,
cuentas y movimientos, y se inicia sesión con una cuenta de prueba.

## Importación desde SQLite

La base PostgreSQL debe tener las migraciones de Better Auth y el esquema
financiero preparado. Solo se acepta una base sin usuarios ni datos reales; los
datos demo iniciales se retiran dentro de la misma transacción.

```bash
DECIFLUJO_SQLITE_PATH=/ruta/finanzas-pyme.db \
DECIFLUJO_IMPORT_CONFIRM=IMPORT_DECIFLUJO \
DATABASE_URL=postgresql://... \
  npm run db:import-sqlite
```

El proceso preserva identificadores y relaciones, convierte booleanos y fechas,
compara conteos por tabla y revierte todo ante cualquier diferencia.

## Incidentes

1. Detener escrituras si hay sospecha de corrupción o acceso indebido.
2. Conservar logs JSON y una copia del respaldo afectado.
3. Rotar `BETTER_AUTH_SECRET`, credenciales PostgreSQL y clave de Resend cuando
   corresponda.
4. Restaurar primero en una base separada y verificar conteos.
5. Documentar alcance, usuarios afectados y acciones correctivas.
