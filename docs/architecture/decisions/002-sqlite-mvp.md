# ADR-002: SQLite/libSQL para persistencia del MVP

- Estado: aceptada temporalmente
- Fecha: 2026-07-29

## Contexto

El primer incremento debe funcionar localmente sin cuentas externas ni
contenedores. La meta es practicar el flujo completo, no operar todavía con
datos empresariales.

## Decisión

Persistir movimientos en SQLite mediante el cliente libSQL. La aplicación
accede a los datos exclusivamente mediante `TransactionRepository`.

## Consecuencias

- El proyecto inicia con un solo comando y conserva datos entre recargas.
- No es apropiado para múltiples instancias o un filesystem efímero.
- La futura migración a PostgreSQL requiere un adaptador nuevo y migración de
  esquema, pero no cambios en dominio ni casos de uso.

## Disparador de reemplazo

Cambiar a PostgreSQL antes de añadir organizaciones reales, autenticación
productiva o despliegue público persistente.
