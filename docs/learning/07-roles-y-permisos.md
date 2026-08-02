# Lección 07: roles y permisos

## RBAC en una frase

RBAC significa “control de acceso basado en roles”. En vez de asignar permisos
persona por persona, Deciflujo asigna un rol y el rol contiene capacidades.

```text
usuario → membresía → rol → permisos → operación
```

## Matriz de Deciflujo

| Rol | Registrar | Eliminar | Guardar/revisar decisiones | Gestionar equipo |
| --- | --- | --- | --- | --- |
| Propietario | Sí | Sí | Sí | Sí |
| Administrador | Sí | Sí | Sí | Sí |
| Contador | Sí | No | Sí | No |
| Colaborador | Sí | No | Solo consultar | No |

## Seguridad real frente a experiencia visual

Deciflujo comprueba permisos dos veces por razones diferentes:

1. React oculta acciones no permitidas para evitar confusión.
2. La API responde 403 si alguien intenta ejecutar la acción de todas formas.

La segunda comprobación es la seguridad. La primera es usabilidad.

## Invitación

El propietario indica correo y rol. Better Auth guarda una invitación con
estado `pending`. Deciflujo genera un enlace que el propietario comparte.

La persona:

1. abre el enlace;
2. inicia sesión o crea una cuenta con ese mismo correo;
3. acepta la invitación;
4. selecciona la empresa;
5. recibe únicamente los permisos de su rol.

## Qué se probó

Además de la matriz unitaria, se hizo una prueba de integración con dos
usuarios. El contador pudo consultar y crear un movimiento, pero el intento de
eliminarlo recibió HTTP 403.
