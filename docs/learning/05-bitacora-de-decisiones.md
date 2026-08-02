# Lección 05: Bitácora y fotografías financieras

## Objetivo

Comprender por qué un sistema de decisiones debe conservar el contexto original
en lugar de recalcular el pasado con información nueva.

## Flujo para guardar

```text
Guardar en Bitácora
  → POST /api/decisions
  → consultar cuentas y movimientos
  → calcular resumen
  → ejecutar simulación en el servidor
  → persistir entradas y resultado
```

El servidor no confía en el saldo calculado por el navegador. Solo recibe
título, gasto y horizonte; después construye su propia proyección.

## Fotografía

Se guardan:

- saldo inicial;
- ingresos y egresos;
- gasto propuesto;
- horizonte;
- resultado sin decisión;
- resultado con decisión;
- riesgo y fecha objetivo.

Aunque mañana se agreguen movimientos, esta fotografía permanece igual.

## Revisión

```text
Evaluar ahora
  → obtener saldo actual de todas las cuentas
  → guardar saldo observado
  → variación = observado − esperado
  → cambiar estado a reviewed
```

Una variación positiva significa que el saldo observado está por encima del
esperado. Una variación negativa significa que está por debajo.

## Ejercicio

1. Simula ₡200 000 durante 3 meses.
2. Guarda la decisión con un nombre reconocible.
3. Observa el saldo inicial y esperado.
4. Registra un ingreso nuevo.
5. Evalúa la decisión.
6. Explica por qué cambió el saldo real, pero no el esperado.

Pregunta: ¿por qué la API vuelve a calcular la proyección si React ya la mostró?
Porque el servidor es la frontera de confianza y debe persistir resultados
derivados de datos autorizados.
