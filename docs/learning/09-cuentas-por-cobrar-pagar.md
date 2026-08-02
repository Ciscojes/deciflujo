# Lección 09 — Cuentas pendientes y liquidación atómica

## Dos momentos financieros distintos

Registrar que un cliente debe pagar no significa que el dinero ya esté en el
banco. Por eso Deciflujo separa:

- la **cuenta abierta**, que anticipa un cobro o pago;
- el **movimiento**, que confirma cuándo el dinero realmente entró o salió.

Mientras una cuenta está pendiente influye en los totales por cobrar o pagar,
pero no cambia el saldo disponible. Solo al liquidarla se crea el movimiento.

## Vencido es un estado derivado

La base guarda `pending` o `paid`. Una cuenta pendiente cuya fecha ya pasó se
presenta como `overdue`. Persistir “vencido” obligaría a ejecutar una tarea cada
medianoche; derivarlo mantiene la lectura correcta sin procesos programados.

## El pago debe ser indivisible

Liquidar una cuenta modifica dos registros relacionados:

1. crea un ingreso o egreso en la cuenta financiera elegida;
2. marca la cuenta abierta como pagada y enlaza el movimiento.

Ambas escrituras ocurren dentro de una transacción libSQL en modo `write`. Si
una falla, la base revierte todo. Esto evita cuentas pagadas sin movimiento o
movimientos duplicados sin una liquidación correspondiente.

## Frontera multiempresa

La cuenta abierta, la cuenta financiera y el movimiento comparten el mismo
`organization_id`. Las consultas comprueban ese identificador en cada paso; un
recurso de otra empresa se comporta como inexistente.
