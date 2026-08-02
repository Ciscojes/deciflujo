# Lección 03: cuentas, relaciones y migraciones

## Problema

Un movimiento indica que entró o salió dinero, pero sin una cuenta no sabemos
si ocurrió en efectivo, banco o tarjeta.

## Modelo relacional

```text
Account
├── id
├── name
├── type
└── opening_balance_cents
       │
       │ 1
       │
       └──────── N Transaction
                    └── account_id
```

`account_id` es una clave foránea. Impide asociar un movimiento con una cuenta
que no existe.

## Cálculo del saldo

```text
saldo = saldo inicial + ingresos − egresos
```

Los montos permanecen como enteros en céntimos. Por ejemplo, ₡12 500 se guarda
como `1 250 000`.

## Por qué necesitamos una migración

La tabla `transactions` ya existía. Cambiar el código no cambia automáticamente
las bases instaladas. Una migración describe cómo pasar de una versión válida a
la siguiente sin perder información.

Las migraciones viven en
`src/modules/finance/infrastructure/libsql-database.ts` y se registran en
`schema_migrations`.

## Flujo para crear una cuenta

```text
Formulario Nueva cuenta
  → POST /api/accounts
  → createAccount
  → AccountRepository
  → INSERT INTO accounts
  → tarjeta de cuenta en el dashboard
```

## Flujo para registrar un movimiento

El formulario ahora envía `accountId`. El caso de uso verifica mediante el
puerto `AccountRepository` que la cuenta exista antes de persistir.

## Ejercicio

1. Crea una cuenta llamada `Efectivo feria` con ₡20 000.
2. Registra un ingreso de ₡5 000 en esa cuenta.
3. Comprueba que el saldo sea ₡25 000.
4. Elimina el movimiento y confirma que regrese a ₡20 000.

Pregunta: si intentamos guardar un movimiento con un `accountId` inventado,
¿qué capa debe impedirlo? El caso de uso lo rechaza y la clave foránea ofrece
una segunda protección en la base.
