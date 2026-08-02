# Requisitos del MVP

## 1. Problema

Las pymes suelen administrar ingresos y gastos entre hojas de cálculo,
comprobantes y mensajes. Esto dificulta conocer el saldo real y detectar dónde
se consume el efectivo.

## 2. Objetivo

Permitir que una persona administradora registre movimientos y obtenga una
lectura inmediata de la salud financiera de su empresa.

## 3. Actores

- **Administrador:** consulta métricas y registra movimientos.
- **Propietario:** crea una organización y administra su espacio.
- **Contador:** actor previsto; podrá consultar y exportar información.
- **Colaborador:** actor previsto; podrá proponer gastos sujetos a aprobación.

## 4. Historias de usuario incluidas

### HU-01 — Registrar un movimiento

Como administrador, quiero registrar un ingreso o egreso para mantener
actualizado el flujo de caja.

Criterios de aceptación:

- Requiere descripción, monto positivo, tipo, categoría y fecha.
- El movimiento permanece disponible después de recargar la página.
- Un dato inválido recibe una respuesta HTTP 400 y no se persiste.

### HU-02 — Consultar el resumen

Como administrador, quiero ver ingresos, egresos, saldo y margen para tomar
decisiones rápidamente.

Criterios de aceptación:

- Saldo = ingresos − egresos.
- Margen = (ingresos − egresos) / ingresos.
- Si no existen ingresos, el margen mostrado es 0%.

### HU-03 — Buscar movimientos

Como administrador, quiero buscar por descripción o categoría para encontrar
un registro concreto.

### HU-04 — Eliminar un movimiento

Como administrador, quiero eliminar un movimiento incorrecto para que los
indicadores financieros recuperen valores correctos.

Criterios de aceptación:

- La interfaz solicita confirmación y muestra el concepto y monto.
- Al confirmar, el movimiento se elimina de la base de datos.
- Los indicadores se recalculan sin recargar la página.
- Un identificador inválido recibe HTTP 400 y uno inexistente recibe HTTP 404.

### HU-05 — Administrar cuentas financieras

Como administrador, quiero separar el dinero por cuenta para conocer cuánto
tengo en el banco, efectivo o tarjetas.

Criterios de aceptación:

- Se puede crear una cuenta con nombre, tipo y saldo inicial.
- Cada movimiento nuevo requiere una cuenta existente.
- El saldo de cuenta suma ingresos y resta egresos.
- Eliminar un movimiento actualiza también el saldo de su cuenta.
- Los movimientos anteriores a esta función se conservan y migran a la cuenta
  principal.

### HU-06 — Evaluar una decisión financiera

Como administrador, quiero simular un gasto mensual antes de asumirlo para
entender cómo afectaría mi flujo y mi reserva de efectivo.

Criterios de aceptación:

- El Pulso muestra estado, cobertura, proporción de gastos y flujo neto.
- Cada indicador explica sus datos y fórmula.
- El usuario define monto mensual y horizonte de 3, 6, 12 o 24 meses.
- La simulación compara saldo sin decisión y saldo con el nuevo gasto.
- Se muestran impacto acumulado, nuevo flujo y reserva estimada.
- Los resultados no modifican movimientos ni cuentas.
- La interfaz aclara los supuestos y que se trata de una proyección.

### HU-07 — Guardar y revisar una decisión

Como administrador, quiero conservar qué esperaba al tomar una decisión y
compararlo con el saldo observado para aprender de mis estimaciones.

Criterios de aceptación:

- Una simulación puede guardarse con un título.
- El servidor recalcula y conserva la fotografía financiera utilizada.
- La decisión registra fecha objetivo y estado de seguimiento.
- El usuario puede evaluar el saldo actual contra el esperado.
- Se muestra la variación positiva o negativa.
- Evaluar anticipadamente muestra una advertencia.

### HU-08 — Acceder de forma segura

Como usuario, quiero crear una cuenta e iniciar y cerrar sesión para proteger
la información financiera.

Criterios de aceptación:

- El registro exige nombre, correo válido y contraseña de al menos 8 caracteres.
- Una ruta financiera sin sesión responde HTTP 401.
- Una sesión dura como máximo siete días y renueva su antigüedad diariamente.
- La clave secreta de autenticación es obligatoria en producción.

### HU-09 — Separar empresas

Como propietario, quiero crear y seleccionar empresas para que sus datos nunca
se mezclen.

Criterios de aceptación:

- Cada organización tiene miembros y un propietario inicial.
- Cuentas, movimientos y decisiones se filtran por la organización activa.
- El servidor verifica tanto la sesión como la membresía en cada API.
- Un identificador de otra organización se comporta como inexistente.
- Los datos anteriores se asignan una sola vez a la primera empresa real.
- Dos empresas pueden utilizar el mismo nombre de cuenta.

### HU-10 — Colaborar con permisos

Como propietario, quiero invitar personas y asignarles responsabilidades para
colaborar sin conceder acceso innecesario.

Criterios de aceptación:

- Propietario y administrador pueden crear y cancelar invitaciones.
- Una invitación genera un enlace compartible y solo puede aceptarla el correo
  indicado.
- El contador puede registrar movimientos y revisar decisiones, pero no
  eliminar movimientos.
- El colaborador puede registrar movimientos y consultar decisiones, pero no
  guardarlas ni revisarlas.
- Los permisos se validan tanto en la interfaz como en cada endpoint.

### HU-11 — Distinguir datos de demostración

Como usuario nuevo, quiero reconocer los valores de ejemplo para no
confundirlos con información real.

Criterios de aceptación:

- El dashboard identifica cuentas y movimientos de demostración.
- Propietario y administrador pueden retirarlos.
- La limpieza no elimina movimientos reales registrados posteriormente.

### HU-12 — Auditar acciones sensibles

Como propietario, quiero consultar un historial inmutable de cambios para saber
quién realizó cada operación sensible en mi empresa.

Criterios de aceptación:

- Propietario y administrador pueden consultar los 100 eventos más recientes.
- Contador y colaborador no pueden acceder al historial.
- Cada evento conserva empresa, actor, acción, entidad, resumen y fecha.
- El historial registra cuentas y movimientos creados, movimientos eliminados,
  decisiones guardadas o evaluadas, limpieza de datos demo e invitaciones
  creadas, aceptadas o canceladas.
- Una empresa nunca puede consultar los eventos de otra.
- La aplicación no expone operaciones para editar o eliminar eventos.

### HU-13 — Controlar cuentas por cobrar y pagar

Como administrador, quiero anticipar cobros y pagos para gestionar el flujo de
caja antes de que ocurran.

Criterios de aceptación:

- Una cuenta requiere tipo, cliente o proveedor, concepto, monto y vencimiento.
- Se muestran los totales abiertos por cobrar, por pagar y vencidos.
- El estado vencido se deriva de la fecha actual para que no quede obsoleto.
- Al marcar una cuenta como pagada se exige una cuenta financiera existente.
- El pago y el movimiento de ingreso o egreso se guardan en una sola
  transacción de base de datos.
- Volver a pagar la misma cuenta recibe HTTP 409 y no duplica movimientos.
- Toda consulta y escritura se filtra por la organización activa.
- La creación y el pago quedan registrados en auditoría.

### HU-14 — Comparar presupuesto y ejecución

Como administrador, quiero establecer límites mensuales por categoría para
detectar desviaciones antes de comprometer el flujo de caja.

Criterios de aceptación:

- Cada empresa puede definir un único monto por mes y categoría.
- Volver a guardar la misma categoría actualiza el límite, no crea duplicados.
- El ejecutado suma únicamente egresos ocurridos durante el mes seleccionado.
- Se muestran planificado, ejecutado, disponible y porcentaje utilizado.
- Al utilizar 80% se muestra advertencia y al superar 100% se marca excedido.
- Los presupuestos orientan, pero no bloquean el registro de movimientos.
- Toda consulta y escritura se filtra por la organización activa.
- Cada creación o ajuste queda registrado en auditoría.

### HU-15 — Consultar y exportar reportes

Como contador, quiero filtrar y exportar la actividad financiera para analizarla
y compartirla fuera de Deciflujo.

Criterios de aceptación:

- El reporte acepta un rango máximo de 366 días.
- Se puede filtrar por tipo, categoría y cuenta financiera.
- Muestra ingresos, egresos, flujo neto y cantidad de movimientos.
- Incluye comparación de presupuestos mensuales contra su ejecución completa.
- Propietario, administrador y contador pueden exportar CSV.
- El colaborador puede consultar, pero no exportar.
- El CSV utiliza UTF-8, es compatible con Excel y neutraliza fórmulas en texto.
- La exportación se registra en auditoría.
- Una empresa nunca consulta ni exporta datos de otra.

### HU-16 — Analizar tendencias y cerrar períodos

Como propietario, quiero comparar el flujo entre meses y cerrar un período para
conservar una fotografía confiable de sus resultados.

Criterios de aceptación:

- La tendencia muestra ingresos, egresos y flujo neto de 6, 12 o 24 meses.
- Los meses sin movimientos aparecen con valores cero para conservar continuidad.
- Todos los roles pueden consultar tendencias y cierres de su empresa activa.
- Solo propietario y administrador pueden cerrar o reabrir un período.
- El cierre conserva saldos inicial y final, flujo, cantidad de movimientos,
  presupuesto planificado, ejecución, responsable y fecha.
- Un mes futuro no puede cerrarse y un mes no puede cerrarse dos veces.
- Registrar, pagar o eliminar movimientos de un mes cerrado recibe HTTP 409.
- Reabrir elimina el bloqueo para permitir correcciones controladas.
- Cerrar y reabrir quedan registrados en auditoría.
- Una empresa nunca consulta ni modifica cierres de otra.

### HU-17 — Recuperar acceso y recibir invitaciones

Como usuario, quiero recibir enlaces seguros por correo para recuperar mi
contraseña o unirme a una empresa sin depender de que otra persona me entregue
el enlace manualmente.

Criterios de aceptación:

- El inicio de sesión enlaza a una pantalla para solicitar recuperación.
- La respuesta no revela si el correo pertenece a una cuenta registrada.
- El token de recuperación vence en una hora y solo puede utilizarse una vez.
- La contraseña nueva conserva los límites de 8 a 128 caracteres.
- Restablecer la contraseña revoca las sesiones anteriores del usuario.
- Un token inválido, vencido o consumido muestra una opción para solicitar otro.
- Las invitaciones de equipo se envían al correo indicado y conservan el enlace
  manual como alternativa operativa.
- El envío usa Resend desde el servidor; la clave nunca llega al navegador.
- Los mensajes incluyen versión HTML y texto plano, remitente configurable e
  idempotencia para evitar duplicados accidentales.

## 5. Requisitos no funcionales

- **Mantenibilidad:** dominio independiente del framework y la persistencia.
- **Integridad:** montos almacenados como enteros; restricciones también en BD.
- **Evolución:** cambios de esquema registrados mediante migraciones
  idempotentes.
- **Usabilidad:** interfaz responsive y estados visibles de carga/error.
- **Seguridad:** validación, sesión comprobada en servidor, aislamiento por
  organización, límites de autenticación y encabezados defensivos. Todavía se
  requiere una revisión independiente antes de usar datos empresariales
  sensibles en producción.
- **Rendimiento:** respuesta objetivo menor a 500 ms con hasta 10 000
  movimientos por organización.
- **Observabilidad:** las acciones sensibles tienen auditoría funcional, los
  errores usan logs JSON y existe un endpoint de salud. La integración opcional
  con Sentry permanece inactiva hasta configurar DSN, proyecto y alertas en el
  entorno definitivo.

## 6. Fuera del alcance actual

- Facturación electrónica.
- Conciliación bancaria automática.
- Cálculo o presentación de impuestos.
- Aprobación de gastos.
- Uso con información financiera real.

## 7. Definición de terminado

Una historia está terminada cuando compila, supera lint y pruebas, tiene manejo
de errores y su cambio arquitectónico relevante queda documentado.
