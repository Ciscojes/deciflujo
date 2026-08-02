# ADR-004: decisiones explicables antes que IA opaca

- Estado: aceptada
- Fecha: 2026-07-29

## Contexto

Deciflujo busca diferenciarse ayudando a tomar decisiones. Una respuesta generada
sin mostrar datos, reglas o supuestos reduciría la confianza y sería difícil de
probar.

## Decisión

La primera versión del motor utilizará funciones deterministas y reglas
explícitas. Toda evaluación mostrará:

- datos utilizados;
- fórmula;
- horizonte;
- supuestos;
- nivel de riesgo;
- limitaciones.

La inteligencia artificial podrá explicar o conversar sobre resultados en una
etapa posterior, pero no reemplazará el cálculo determinista.

## Consecuencias

- Un mismo escenario siempre produce el mismo resultado.
- Las pruebas pueden verificar montos exactos.
- El usuario puede cuestionar la conclusión.
- El modelo inicial no contempla impuestos, estacionalidad, inflación o
  probabilidades.
- Nuevas variables deberán incorporarse explícitamente al dominio.
