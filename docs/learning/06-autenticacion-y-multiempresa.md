# Lección 06: autenticación y multiempresa

## La idea esencial

**Autenticación** responde “¿quién eres?”. **Autorización** responde “¿qué
puedes hacer?”. **Aislamiento multiempresa** responde “¿a qué datos puede
aplicarse esa acción?”.

Iniciar sesión no basta. Una persona autenticada en Empresa A no debe ver un
movimiento de Empresa B.

## Recorrido de una consulta

Al abrir el dashboard, el navegador envía una cookie de sesión:

```text
navegador
  → Better Auth valida la cookie
  → auth-context obtiene usuario y organización activa
  → membership confirma que ambos están relacionados
  → LibsqlTransactionRepository(organizationId)
  → SELECT ... WHERE organization_id = ?
```

El valor `organizationId` no se toma de un campo libre enviado por el
formulario. Proviene de la sesión validada y se contrasta con la membresía.

## Defensa en profundidad

Deciflujo aplica la seguridad en dos puntos:

1. La página redirige a `/sign-in` o `/onboarding` para ofrecer una experiencia
   clara.
2. Cada API vuelve a validar la sesión y la membresía.

El segundo punto es el importante. La interfaz puede modificarse desde las
herramientas del navegador; el servidor es la frontera de confianza.

## Por qué el repositorio recibe la organización

En vez de recordar añadir el filtro desde cada caso de uso:

```ts
const repository = new LibsqlTransactionRepository(organizationId);
```

El adaptador queda ligado al contexto. Sus métodos `list`, `create` y
`deleteById` siempre incluyen la organización. Es una decisión de diseño que
reduce olvidos peligrosos.

## Prueba mental útil

Para cualquier endpoint financiero, pregunta:

- ¿Qué ocurre sin cookie? Debe responder 401.
- ¿Qué ocurre sin empresa activa? Debe responder 403.
- ¿Se verificó la membresía en el servidor?
- ¿La consulta filtra por identificador y organización?
- ¿Un recurso de otra empresa parece inexistente?

## Lo que queda por aprender

El siguiente nivel es autorización por capacidad: propietario, administrador,
contador y colaborador no deberían ejecutar las mismas acciones. Después se
añaden invitaciones, recuperación de contraseña, auditoría y pruebas
end-to-end.
