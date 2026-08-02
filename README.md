# Deciflujo

> Entiende tus números. Decide con claridad.

MVP de control financiero para pequeñas empresas. El proyecto está diseñado
como ejercicio de ingeniería de software: parte de requisitos verificables,
separa dominio e infraestructura, registra decisiones y entrega un flujo
vertical funcional.

## Funcionalidad disponible

- Dashboard financiero responsive.
- Registro e inicio de sesión con contraseñas protegidas por Better Auth.
- Recuperación de contraseña mediante enlace de un solo uso enviado por Resend.
- Persistencia seleccionable: SQLite local y PostgreSQL para despliegue.
- Invitaciones de equipo enviadas por correo y copiables manualmente.
- Espacios multiempresa con datos financieros aislados por organización.
- Selector de empresa y cierre de sesión.
- Equipo con invitaciones mediante enlaces y cuatro roles operativos.
- Historial de auditoría por empresa para acciones financieras e invitaciones.
- Cambios de rol y bajas de miembros registrados en auditoría.
- Cuentas por cobrar y pagar con vencimientos, estados y totales abiertos.
- Registro atómico del pago y su movimiento financiero asociado.
- Presupuestos mensuales por categoría comparados con egresos reales.
- Alertas visuales al alcanzar el 80% o superar un límite presupuestario.
- Reportes por período con filtros de cuenta, categoría y tipo.
- Exportación CSV segura y compatible con Excel para roles autorizados.
- Tendencias comparativas de ingresos, egresos y flujo para 6, 12 o 24 meses.
- Cierres mensuales con fotografía de saldos, presupuesto y responsable.
- Bloqueo de movimientos en períodos cerrados y reapertura auditada.
- Datos de demostración identificados y retirables desde el dashboard.
- Registro persistente de ingresos y egresos.
- Eliminación con confirmación de movimientos.
- Guía interactiva de primeros pasos para usuarios de negocio.
- Cuentas bancarias, efectivo y tarjetas con saldos independientes.
- Asociación obligatoria entre cada movimiento y una cuenta.
- Migraciones versionadas que preservan datos existentes.
- Pulso financiero explicable basado en flujo, cobertura y proporción de gastos.
- Simulador de gastos mensuales con comparación visual de escenarios.
- Bitácora persistente de decisiones con comparación esperado/real.
- Resumen de saldo, ingresos, egresos y margen operativo.
- Distribución de gastos por categoría.
- Búsqueda de movimientos.
- Datos de demostración creados al iniciar por primera vez.
- Validación en la frontera HTTP y reglas en el dominio.
- Pruebas unitarias del cálculo financiero.
- Pruebas E2E en Chromium para SQLite y PostgreSQL mediante CI.
- Endpoint de salud, encabezados defensivos y logs JSON estructurados.
- Respaldo, restauración e importación SQLite→PostgreSQL con confirmaciones.

## Inicio rápido

Requisitos: Node.js 22 o superior.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Antes de publicar, reemplaza `BETTER_AUTH_SECRET` por una cadena aleatoria de
al menos 32 caracteres y configura `RESEND_API_KEY` y `RESEND_FROM_EMAIL` con
un dominio verificado. Abre <http://localhost:3000>, crea tu usuario y después
tu empresa. La base SQLite local se crea automáticamente y no se incluye en Git.

Sin credenciales de Resend durante el desarrollo, los enlaces de recuperación
e invitación se muestran únicamente en la terminal. En producción, el envío
requiere la configuración real y falla de forma explícita si está incompleta.

## PostgreSQL para despliegue

Deciflujo conserva SQLite como experiencia local sin configuración. Para una
instalación persistente configura:

```bash
DATABASE_PROVIDER=postgres
DATABASE_URL=postgresql://user:password@host:5432/deciflujo?sslmode=require
DATABASE_POOL_MAX=10
```

Antes del primer arranque crea las tablas de Better Auth:

```bash
npm run db:auth:migrate
npm run build
npm run start
```

El esquema financiero se prepara automáticamente durante el primer acceso. La
configuración de PostgreSQL se comparte entre autenticación y finanzas para que
usuarios, organizaciones y movimientos permanezcan en la misma base. Este paso
crea una instalación nueva; copiar datos del archivo SQLite existente requiere
una importación separada.

## Comandos

```bash
npm run dev       # desarrollo
npm run test      # pruebas unitarias
npm run test:e2e  # recorrido crítico en Chromium
npm run lint      # análisis estático
npm run typecheck # comprobación de tipos
npm run db:auth:migrate # tablas de identidad en la base configurada
npm run db:backup # respaldo PostgreSQL verificado
npm run db:restore -- respaldo.dump # restauración con confirmación
npm run db:import-sqlite # importación controlada a PostgreSQL
npm run build     # compilación de producción
```

## Arquitectura

Se utiliza un **monolito modular** con una adaptación práctica de arquitectura
hexagonal:

```text
Presentación (Next.js / React)
             ↓
Aplicación (casos de uso + puertos)
             ↓
Dominio (reglas y modelos)
             ↑
Infraestructura (repositorio libSQL)
```

El dominio no conoce HTTP, React ni la base de datos. La aplicación depende de
la interfaz `TransactionRepository`; la infraestructura implementa ese puerto.
Esto permite cambiar SQLite por PostgreSQL sin reescribir reglas de negocio.

- [Documento de arquitectura](docs/architecture/architecture.md)
- [Identidad de producto](docs/brand.md)
- [Diagrama C4 interactivo](docs/architecture/c4-container.html)
- [Requisitos del producto](docs/requirements.md)
- [Lección 02: eliminar un movimiento](docs/learning/02-eliminar-movimiento.md)
- [Lección 03: relacionar cuentas y movimientos](docs/learning/03-cuentas-y-relaciones.md)
- [Lección 04: motor de decisiones](docs/learning/04-motor-de-decisiones.md)
- [Lección 05: bitácora y fotografías financieras](docs/learning/05-bitacora-de-decisiones.md)
- [Lección 06: autenticación y multiempresa](docs/learning/06-autenticacion-y-multiempresa.md)
- [Lección 07: roles y permisos](docs/learning/07-roles-y-permisos.md)
- [Lección 08: auditoría append-only](docs/learning/08-auditoria-append-only.md)
- [Lección 09: liquidación atómica de cuentas pendientes](docs/learning/09-cuentas-por-cobrar-pagar.md)
- [Lección 10: presupuestos contra ejecución real](docs/learning/10-presupuestos-mensuales.md)
- [Lección 11: reportes y exportación segura](docs/learning/11-reportes-y-exportacion.md)
- [Lección 12: tendencias y cierres mensuales](docs/learning/12-tendencias-y-cierres.md)
- [Lección 13: correos y recuperación de contraseña](docs/learning/13-correos-y-recuperacion.md)
- [Lección 14: PostgreSQL para producción](docs/learning/14-postgresql-para-produccion.md)
- [Lección 15: preparación operativa](docs/learning/15-preparacion-operativa.md)
- [Manual de operación](docs/operations/runbook.md)
- [Checklist previo al despliegue](docs/operations/pre-deployment-checklist.md)
- [ADR-001: monolito modular](docs/architecture/decisions/001-monolito-modular.md)
- [ADR-002: SQLite en el MVP](docs/architecture/decisions/002-sqlite-mvp.md)
- [ADR-011: persistencia dual SQLite/PostgreSQL](docs/architecture/decisions/011-persistencia-dual-postgresql.md)

## Estructura

```text
src/
├── app/                         # interfaz y adaptador HTTP
├── components/dashboard/        # componentes de presentación
└── modules/finance/
    ├── domain/                  # entidades y reglas puras
    ├── application/             # casos de uso y puertos
    └── infrastructure/          # adaptador de persistencia
docs/
└── architecture/                # vistas y decisiones técnicas
```

## Próximos incrementos

1. Comparación automática cuando llegue la fecha objetivo.
2. Integración con un servicio externo de seguimiento de errores.
3. Revisión legal y de seguridad independiente antes de aceptar datos reales.

## Decisiones monetarias

Los montos se guardan como enteros en céntimos. Así se evitan errores de
precisión de punto flotante. En la interfaz se convierten a colones para
presentación.
