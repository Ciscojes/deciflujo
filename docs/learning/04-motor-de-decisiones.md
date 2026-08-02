# Lección 04: motor de decisiones explicables

## Objetivo

Pasar de registrar el pasado a evaluar una decisión futura sin alterar datos
reales.

## Diferencia entre dato y escenario

- Un movimiento representa algo que ocurrió y se persiste.
- Un escenario representa una posibilidad y se calcula en memoria.

Por eso **Explora** no crea registros en SQLite.

## Pulso Deciflujo

El pulso combina tres medidas:

```text
flujo neto = ingresos − egresos
proporción de gasto = egresos ÷ ingresos
cobertura = saldo disponible ÷ egresos mensuales
```

Las reglas clasifican el resultado como saludable, atención o crítico. No existe
un modelo oculto: las condiciones están en
`src/modules/finance/domain/decision-engine.ts`.

## Simulación

```text
línea base = saldo + (ingresos − egresos) × meses

escenario = saldo
          + (ingresos − egresos − nuevo gasto mensual)
          × meses
```

La proyección devuelve un punto por mes. El componente React convierte esos
puntos en dos líneas SVG.

## Separación de responsabilidades

```text
DecisionEngine
  → calcula y clasifica

DecisionCenter
  → recibe entradas y representa resultados

SQLite
  → no participa en la simulación
```

## Ejercicio

1. Simula un gasto mensual de ₡300 000 durante 6 meses.
2. Anota el saldo proyectado.
3. Cambia el horizonte a 12 meses.
4. Abre “Ver supuestos y fórmula”.
5. Explica por qué el impacto acumulado se duplicó.

Pregunta: ¿por qué el gráfico debe consumir puntos calculados por el dominio y
no repetir la fórmula dentro de React? Para mantener una sola fuente de verdad y
probar la regla sin depender de la interfaz.
