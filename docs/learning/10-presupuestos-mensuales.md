# Lección 10 — Presupuesto contra ejecución real

## Plan y realidad son datos distintos

El presupuesto expresa una intención: cuánto se espera gastar en una categoría.
Los movimientos expresan hechos: cuánto dinero salió realmente. Mantenerlos
separados permite ajustar el plan sin reescribir la historia financiera.

## No persistir valores derivados

Deciflujo guarda únicamente el límite planificado. Al consultar un mes, suma los
egresos reales por categoría y deriva:

- disponible = planificado − ejecutado;
- utilización = ejecutado / planificado;
- advertencia desde 80%;
- excedido cuando la utilización supera 100%.

Si un movimiento se registra o elimina, el resultado cambia en la siguiente
lectura sin tareas de sincronización.

## Un presupuesto por período y categoría

La base aplica una restricción única por empresa, mes y categoría. Guardar de
nuevo utiliza un *upsert*: crea la primera vez y actualiza después. La
restricción protege esta regla incluso ante solicitudes concurrentes.

## El presupuesto informa, no bloquea

En esta versión el límite produce señales visuales, pero no impide gastar.
Bloquear operaciones requeriría reglas de aprobación, excepciones y permisos
adicionales; introducirlo sin esos flujos podría detener operaciones legítimas.
