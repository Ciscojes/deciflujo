# Deciflujo

> Entiende tus números. Decide con claridad.

MVP de control financiero para pequeñas empresas. El proyecto está diseñado
como ejercicio de ingeniería de software: parte de requisitos verificables,
separa dominio e infraestructura, registra decisiones y entrega un flujo
vertical funcional.

## Funcionalidad disponible

### Finanzas y operación diaria

- Dashboard financiero responsive.
- Resumen de saldo, ingresos, egresos y margen operativo.
- Registro persistente de ingresos y egresos.
- Eliminación con confirmación de movimientos.
- Búsqueda de movimientos.
- Cuentas bancarias, efectivo y tarjetas con saldos independientes.
- Asociación obligatoria entre cada movimiento y una cuenta.
- Cuentas por cobrar y pagar con vencimientos, estados y totales abiertos.
- Registro atómico del pago y su movimiento financiero asociado.
- Datos de demostración creados al iniciar por primera vez.
- Datos de demostración identificados y retirables desde el dashboard.
- Guía interactiva de primeros pasos para usuarios de negocio.

### Usuarios, equipos y empresas

- Registro e inicio de sesión con contraseñas protegidas por Better Auth.
- Recuperación de contraseña mediante enlace de un solo uso enviado por Resend.
- Espacios multiempresa con datos financieros aislados por organización.
- Selector de empresa y cierre de sesión.
- Equipo con invitaciones mediante enlaces y cuatro roles operativos.
- Invitaciones de equipo enviadas por correo y copiables manualmente.
- Historial de auditoría por empresa para acciones financieras e invitaciones.
- Cambios de rol y bajas de miembros registrados en auditoría.

### Planificación, análisis y decisiones

- Presupuestos mensuales por categoría comparados con egresos reales.
- Alertas visuales al alcanzar el 80% o superar un límite presupuestario.
- Reportes por período con filtros de cuenta, categoría y tipo.
- Exportación CSV segura y compatible con Excel para roles autorizados.
- Tendencias comparativas de ingresos, egresos y flujo para 6, 12 o 24 meses.
- Cierres mensuales con fotografía de saldos, presupuesto y responsable.
- Bloqueo de movimientos en períodos cerrados y reapertura auditada.
- Pulso financiero explicable basado en flujo, cobertura y proporción de gastos.
- Simulador de gastos mensuales con comparación visual de escenarios.
- Bitácora persistente de decisiones con comparación esperado/real.
- Evaluación automática de decisiones al consultar la bitácora después de su fecha objetivo.
- Distribución de gastos por categoría.

### Datos y despliegue

- Persistencia seleccionable: SQLite local y PostgreSQL para despliegue.
- Migraciones versionadas que preservan datos existentes.
- Respaldo, restauración e importación SQLite→PostgreSQL con confirmaciones.

### Seguridad, calidad y operaciones

- Validación en la frontera HTTP y reglas en el dominio.
- Pruebas unitarias del cálculo financiero.
- Pruebas E2E en Chromium para SQLite y PostgreSQL mediante CI.
- Endpoint de salud, encabezados defensivos y logs JSON estructurados.
- Seguimiento opcional de errores mediante Sentry, inactivo sin credenciales.

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

1. Prueba de carga con 10 000 movimientos por empresa.
2. Revisión legal y de seguridad independiente antes de aceptar datos reales.
3. Activación y ensayo de alertas cuando se elijan proveedores y dominio.

## Decisiones monetarias

Los montos se guardan como enteros en céntimos. Así se evitan errores de
precisión de punto flotante. En la interfaz se convierten a colones para
presentación.
