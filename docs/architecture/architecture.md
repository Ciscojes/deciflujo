# Arquitectura de software

## Contexto

Deciflujo comienza como un sistema pequeño, pero su dirección de producto
incluye organizaciones, roles y módulos contables. La arquitectura debe enseñar
buenas prácticas sin introducir complejidad operativa innecesaria.

## Estilo elegido

**Monolito modular + puertos y adaptadores.**

La unidad de despliegue es una sola aplicación Next.js. Dentro de ella, cada
capacidad de negocio vive en un módulo con límites explícitos:

- **Dominio:** modelos, invariantes y cálculos sin dependencias de UI o BD.
- **Aplicación:** coordina casos de uso y declara puertos.
- **Infraestructura:** implementa persistencia y servicios externos.
- **Presentación:** páginas, componentes y adaptador HTTP.

Consulta el [diagrama C4](c4-container.html) en un navegador.

## Flujo de una solicitud

```text
POST /api/transactions
  → valida sesión y membresía de la organización
  → valida TransactionInput
  → ejecuta createTransaction
  → exige reglas del dominio
  → invoca TransactionRepository
  → LibsqlTransactionRepository persiste
  → devuelve 201 con la entidad creada
```

## Dependencias permitidas

```text
presentation ──────→ application ──────→ domain
infrastructure ────→ application ports ─→ domain
```

El dominio no puede importar desde las otras capas. Los casos de uso no pueden
depender de una implementación concreta de base de datos.

## Modelo de dominio inicial

### Transaction

- `id`: identificador UUID.
- `description`: concepto legible.
- `amountCents`: entero positivo.
- `type`: `income | expense`.
- `category`: categoría controlada.
- `accountId`: referencia a la cuenta que recibe o entrega el dinero.
- `occurredOn`: fecha efectiva del movimiento.
- `createdAt`: instante de registro.

### Invariantes

- El monto siempre es mayor que cero.
- El signo financiero proviene de `type`; el monto no se guarda negativo.
- Los cálculos monetarios se hacen con enteros.

### DecisionEngine

El motor de decisiones vive en el dominio y expone funciones puras:

- `calculateFinancialPulse`: clasifica la situación actual mediante reglas
  visibles.
- `simulateRecurringExpense`: proyecta una línea base y un escenario con un
  gasto mensual adicional.

No consulta la base ni modifica estado. La presentación le entrega datos
agregados y representa el resultado. Esto permite probar los cálculos sin React,
HTTP o SQLite.

### Decision

Una decisión guardada es una fotografía inmutable de:

- saldo, ingresos y egresos al decidir;
- nuevo gasto y horizonte;
- línea base, proyección y riesgo;
- fecha objetivo;
- saldo observado y variación cuando se evalúa.

La proyección histórica no se recalcula cuando cambian los movimientos. Así se
preserva lo que realmente sabía y esperaba el usuario en ese momento.

### Account

- `id`: identificador UUID.
- `name`: nombre único dentro de una organización.
- `type`: banco, efectivo o tarjeta.
- `openingBalanceCents`: saldo anterior al uso de Deciflujo.
- `balanceCents`: saldo inicial + ingresos − egresos.

La relación es **Organization 1 → N Account/Transaction/Decision** y
**Account 1 → N Transaction**: una cuenta puede tener muchos
movimientos y cada movimiento pertenece a una cuenta.

### OpenItem

Una cuenta abierta representa dinero por cobrar o por pagar. Conserva
contraparte, concepto, monto y vencimiento. La base persiste únicamente
`pending | paid`; `overdue` se deriva al leer comparando el vencimiento con la
fecha actual.

Liquidar una cuenta abierta es una sola transacción de base de datos: valida que
la cuenta financiera pertenezca a la misma organización, crea el ingreso o
egreso y enlaza su identificador con la cuenta liquidada. Si cualquiera de los
pasos falla, ninguno queda aplicado.

### MonthlyBudget

Un presupuesto identifica el límite de una categoría dentro de un mes
`YYYY-MM`. La restricción única `(organization_id, month, category)` permite
actualizar el límite mediante *upsert* sin generar duplicados.

El monto ejecutado no se persiste: se agrega desde los movimientos de tipo
`expense` cuya fecha efectiva pertenece al período solicitado. Así, eliminar o
registrar un movimiento actualiza automáticamente la comparación. El dominio
calcula disponible, porcentaje y estado: saludable, advertencia desde 80% o
excedido por encima de 100%.

### FinancialReport

El repositorio de reportes aplica simultáneamente `organization_id`, rango,
tipo, categoría y cuenta. El caso de uso calcula el resumen sobre esas filas y
consulta por separado la variación de cada presupuesto mensual completo.

La salida CSV se genera desde el mismo resultado que la vista JSON para evitar
discrepancias. Los campos textuales que comienzan con caracteres interpretables
como fórmulas se prefijan antes de entregarlos a Excel.

### MonthlyClose

Las tendencias agregan los movimientos por mes al leer y completan los meses
sin actividad en el dominio. No se persisten totales provisionales que puedan
quedar obsoletos.

El cierre sí es una fotografía: conserva ingresos, egresos, flujo, saldos,
presupuesto, cantidad de movimientos y actor. Dos triggers de SQLite rechazan
altas y eliminaciones de movimientos cuyo `organization_id` y mes coincidan
con un cierre. Esta defensa en la base también cubre movimientos creados al
liquidar cuentas pendientes, no solo el formulario principal.

Reabrir elimina la fotografía y el bloqueo, exige el mismo permiso elevado y
genera un evento de auditoría. La operación es deliberadamente reversible para
corregir errores sin editar silenciosamente una fotografía histórica.

## Identidad y aislamiento multiempresa

Better Auth administra credenciales, sesiones y las tablas del módulo de
identidad. El complemento de organizaciones modela propietarios, miembros e
invitaciones. Deciflujo no implementa criptografía de contraseñas por cuenta
propia.

Cada Route Handler ejecuta esta secuencia:

```text
cookie de sesión
  → Better Auth valida la sesión
  → auth-context exige una organización activa
  → la base confirma la membresía usuario-organización
  → se construye un repositorio ligado a organizationId
  → toda consulta incluye organization_id
```

La selección de organización que llega desde el cliente nunca basta por sí
sola. La membresía se vuelve a verificar en el servidor. Además, eliminar o
revisar una entidad filtra simultáneamente por su `id` y `organization_id`.

Sobre esa frontera se aplica una matriz RBAC:

- `owner`: control completo;
- `admin`: gestiona equipo y operaciones, excepto eliminar la organización;
- `accountant`: registra finanzas y revisa decisiones, sin eliminar;
- `collaborator`: registra finanzas y consulta decisiones.

Los permisos se declaran una vez en `access-control.ts`. Better Auth los usa
para miembros e invitaciones, y `auth-context` los vuelve a exigir antes de cada
caso de uso financiero.

Los reportes separan `report:read` de `report:export`. Todos los roles pueden
consultar; solo propietario, administrador y contador pueden extraer un archivo.
Esto conserva la colaboración sin conceder innecesariamente una copia masiva de
los datos.

Los cierres separan lectura de gestión: todos los miembros pueden consultar
`closing:read`; solo propietario y administrador reciben `closing:create` y
`closing:delete` para cerrar o reabrir.

## Auditoría

Las operaciones sensibles generan eventos append-only después de completarse.
Cada fila guarda una fotografía mínima del actor y de la acción, además del
`organization_id`; la consulta siempre filtra por la empresa activa. Solo
`owner` y `admin` tienen el permiso `audit:read`.

Los eventos financieros se registran en la frontera HTTP. Las invitaciones se
capturan mediante hooks oficiales del complemento de organizaciones de Better
Auth, evitando duplicar su lógica de identidad. Un fallo al escribir auditoría
se registra en el log del servidor sin convertir una operación ya completada en
un falso error para el usuario.

## Correos transaccionales y recuperación

Better Auth crea, vence y consume los tokens de recuperación. Deciflujo solo
implementa el adaptador de entrega: construye contenido HTML y texto plano y lo
envía a la API HTTPS de Resend desde el servidor. `RESEND_API_KEY` nunca forma
parte del grafo de componentes cliente.

La solicitud siempre muestra el mismo resultado, exista o no la cuenta. El
enlace vence en una hora y, después del cambio, Better Auth elimina las sesiones
anteriores. Las invitaciones reutilizan el mismo adaptador y conservan el enlace
copiable como ruta de respaldo.

No se añadió el SDK de Resend: la API requiere una única operación HTTP estable.
El módulo `email.ts` mantiene esa decisión encapsulada para poder adoptar otro
proveedor sin modificar autenticación ni pantallas.

## Datos

SQLite/libSQL ofrece arranque sin configuración para desarrollo. PostgreSQL es
la opción de despliegue persistente. Un cliente interno común conserva los
casos de uso y repositorios existentes, traduce parámetros posicionales y
mantiene transacciones atómicas en ambos motores.

Los cambios financieros se aplican mediante `schema_migrations`. SQLite conserva
sus migraciones incrementales; una base PostgreSQL nueva recibe el esquema base
equivalente y los triggers de meses cerrados. Better Auth mantiene su propio
esquema mediante `npm run db:auth:migrate`.

## Evolución prevista

```text
finance
├── transactions
├── budgets
├── receivables-payables
└── reporting

identity
├── users
├── organizations
├── memberships
└── sessions
```

Cada módulo debe exponer casos de uso, no tablas. Solo se considerarán servicios
independientes cuando existan necesidades reales de escalado o autonomía de
equipos.

## Riesgos actuales

- Los datos SQLite existentes todavía requieren una importación explícita si se
  desea trasladarlos a PostgreSQL.
- El envío de correos depende de Resend y de la reputación/configuración DNS del
  dominio remitente.
- Los logs están estructurados, pero todavía no se envían a un servicio externo
  de errores porque aún no se ha elegido la infraestructura de despliegue.
- Los eventos son funcionales para trazabilidad del MVP, pero aún no tienen
  almacenamiento externo inmutable ni garantías de cumplimiento normativo.
