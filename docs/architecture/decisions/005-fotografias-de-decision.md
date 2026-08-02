# ADR-005: guardar fotografías de decisión

- Estado: aceptada
- Fecha: 2026-07-29

## Contexto

Los movimientos y saldos cambian constantemente. Si una decisión antigua
recalculara su proyección con datos actuales, perderíamos la expectativa
original y no podríamos evaluar la calidad de la decisión.

## Decisión

Al guardar una decisión, el servidor vuelve a consultar las cuentas y
movimientos, ejecuta el motor y persiste tanto las entradas como los resultados.

La decisión no depende de una proyección viva. La revisión añade el saldo
observado y calcula:

```text
variación = saldo real − saldo esperado
```

## Consecuencias

- Se conserva evidencia de qué se sabía al decidir.
- Los resultados son auditables y comparables.
- Existe duplicación deliberada de agregados financieros.
- Corregir un movimiento histórico no modifica decisiones guardadas.
- En una versión futura se distinguirán revisiones anticipadas, objetivo
  cumplido y cierre definitivo.
