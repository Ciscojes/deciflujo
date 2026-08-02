# Lección 12 — Tendencias y cierres mensuales

## Un dato vivo y una fotografía no son lo mismo

La tendencia es una consulta viva: agrupa los movimientos actuales por mes.
Si se corrige un movimiento de un período abierto, la gráfica cambia. Un cierre
es lo contrario: conserva exactamente los totales conocidos cuando una persona
responsable terminó el período.

Deciflujo usa ambas representaciones porque responden preguntas distintas:

- la tendencia ayuda a detectar dirección y variaciones;
- el cierre permite explicar qué se consideró definitivo y quién lo confirmó.

## Completar los meses vacíos

SQL solo devuelve meses que contienen filas. Una serie temporal necesita
continuidad, por lo que el dominio genera la secuencia de 6, 12 o 24 meses y
combina los resultados. Los meses sin actividad reciben cero; no desaparecen de
la gráfica ni deforman la comparación.

## El bloqueo vive cerca de los datos

No basta con ocultar el botón de crear. Un pago de cuenta pendiente también
produce un movimiento y podrían aparecer otras rutas en el futuro. Dos triggers
de base de datos impiden insertar o eliminar cualquier movimiento de un mes
cerrado dentro de la misma organización.

La infraestructura traduce `MONTH_CLOSED` a un error de negocio y la frontera
HTTP responde 409: la solicitud es válida, pero entra en conflicto con el estado
actual del período.

## Reabrir es una operación explícita

Los cierres no se editan. Si hace falta corregir, propietario o administrador
reabre el mes, realiza el ajuste y vuelve a cerrarlo. Tanto cerrar como reabrir
quedan en auditoría. Así el sistema conserva intención y trazabilidad sin volver
irreversible un error operativo.
