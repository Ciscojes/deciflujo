# Lección 02: eliminar un movimiento

## Objetivo

Comprender cómo una acción del usuario atraviesa todas las capas sin acoplar la
interfaz directamente a la base de datos.

## Flujo

```text
Botón de papelera
  → modal de confirmación
  → DELETE /api/transactions/:id
  → deleteTransaction(...)
  → TransactionRepository.deleteById(...)
  → DELETE SQL
  → respuesta 204
  → React actualiza el estado y recalcula las métricas
```

## Responsabilidad de cada capa

### Presentación

`FinanceDashboard` controla el modal, informa al usuario y envía la solicitud.
No contiene SQL ni conoce cómo se almacena el movimiento.

### Adaptador HTTP

`app/api/transactions/[id]/route.ts` traduce HTTP hacia el caso de uso:

- identificador inválido → 400;
- movimiento inexistente → 404;
- eliminación correcta → 204.

### Aplicación

`deleteTransaction` valida el UUID e indica que intentar borrar algo inexistente
es un error del caso de uso.

### Puerto

`TransactionRepository` declara `deleteById`. Es un contrato, no una base de
datos concreta.

### Infraestructura

`LibsqlTransactionRepository` implementa el contrato mediante SQL parametrizado:

```sql
DELETE FROM transactions WHERE id = ?
```

El parámetro separado evita construir SQL concatenando entrada externa.

## Por qué se usa HTTP 204

`204 No Content` significa que la operación terminó correctamente y no existe
contenido adicional que devolver. La interfaz ya conoce el identificador que
debe retirar de su estado.

## Prueba automatizada

El caso de uso se prueba con un repositorio falso. Así se verifica la regla sin
levantar Next.js ni SQLite. Esta es una ventaja directa de depender de una
interfaz.

## Ejercicio

Cambia el texto del modal para explicar que los indicadores se recalcularán.
Después ejecuta:

```bash
npm run test
npm run lint
```

Pregunta de comprobación: ¿qué archivo tendrías que reemplazar si mañana
usáramos PostgreSQL? La respuesta correcta es el adaptador de infraestructura,
no el caso de uso.
