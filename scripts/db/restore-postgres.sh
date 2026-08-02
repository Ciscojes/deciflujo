#!/usr/bin/env bash
set -euo pipefail

if [[ "${DATABASE_URL:-}" != postgres://* && "${DATABASE_URL:-}" != postgresql://* ]]; then
  echo "DATABASE_URL debe apuntar a PostgreSQL." >&2
  exit 1
fi
if [[ "${DECIFLUJO_RESTORE_CONFIRM:-}" != "RESTORE_DECIFLUJO" ]]; then
  echo "Define DECIFLUJO_RESTORE_CONFIRM=RESTORE_DECIFLUJO para autorizar la restauración." >&2
  exit 1
fi
if [[ $# -ne 1 || ! -f "$1" ]]; then
  echo "Uso: npm run db:restore -- /ruta/al/respaldo.dump" >&2
  exit 1
fi

backup_file="$(realpath "$1")"
pg_restore --list "$backup_file" >/dev/null
pg_restore \
  --clean \
  --if-exists \
  --no-owner \
  --no-acl \
  --exit-on-error \
  --dbname="$DATABASE_URL" \
  "$backup_file"
echo "Restauración PostgreSQL completada desde: $backup_file"
