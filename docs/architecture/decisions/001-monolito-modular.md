# ADR-001: comenzar con un monolito modular

- Estado: aceptada
- Fecha: 2026-07-29

## Contexto

El producto necesita crecer por capacidades, pero actualmente tiene un
desarrollador, un flujo principal y ningún requisito de escalado independiente.

## Decisión

Usar una sola unidad de despliegue con módulos de negocio y dependencias
dirigidas hacia el dominio. Los módulos se comunican mediante casos de uso y
puertos explícitos.

## Consecuencias

- Desarrollo, pruebas y despliegue simples.
- Transacciones locales y depuración directa.
- Los límites pueden extraerse más adelante si aparece una razón medible.
- Se requiere disciplina para impedir dependencias entre capas incorrectas.

## Alternativas rechazadas

- **Microservicios:** añaden red, observabilidad, despliegues y consistencia
  distribuida sin aportar valor al MVP.
- **Código organizado solo por tipo técnico:** hace que una funcionalidad quede
  dispersa y aumenta el acoplamiento.
