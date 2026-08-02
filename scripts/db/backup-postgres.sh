#!/usr/bin/env bash
set -euo pipefail

if [[ "${DATABASE_URL:-}" != postgres://* && "${DATABASE_URL:-}" != postgresql://* ]]; then
  echo "DATABASE_URL debe apuntar a PostgreSQL." >&2
  exit 1
fi

backup_dir="${DECIFLUJO_BACKUP_DIR:-$PWD/backups}"
if [[ "$backup_dir" == "/" || "$backup_dir" == "$HOME" ]]; then
  echo "DECIFLUJO_BACKUP_DIR no puede ser una ruta amplia." >&2
  exit 1
fi

mkdir -p "$backup_dir"
umask 077
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
target="$backup_dir/deciflujo-$timestamp.dump"

pg_dump --format=custom --no-owner --no-acl --file="$target" "$DATABASE_URL"
pg_restore --list "$target" >/dev/null
echo "Respaldo PostgreSQL verificado: $target"
