# Revisión de interfaz y calidad — 6 de noviembre de 2026

## Cambios

- Indicadores financieros sin iconos ornamentales; tipografía y bordes consistentes.
- Encabezado que permite varias filas en pantallas estrechas y conserva todas las acciones.
- Encabezado de columna con contexto de posición para que el texto solo para lector
  de pantalla quede dentro del área desplazable de la tabla.
- E2E que crea explícitamente una cuenta financiera antes de registrar el movimiento,
  independiente de los datos de demostración. Se mantiene la validación de la aplicación.
- Next.js y ESLint 16.4.5, Vitest 5 y dependencias transitivas corregidas.
  Overrides limitados a versiones compatibles de minimatch, glob y brace-expansion;
  se validan con lint, pruebas y build.
- CI incluye auditoría de dependencias como puerta explícita, sin exclusiones.
- Guía Next.js en AGENTS.md actualizada automáticamente por la versión instalada.

## Evidencia local

- Lint, tipos, 45 pruebas y build aprobados con las dependencias actualizadas.
- Auditoría npm sin vulnerabilidades.
- Tres recorridos E2E sobre SQLite aprobados: registro/empresa/movimiento,
  salud/cabeceras y cambios de rol/bajas auditados.
- Revisión autenticada de interfaz a 1440, 390 y 320 px, con datos sintéticos locales.
  Sin desbordamiento horizontal tras corregir la tabla y el encabezado.
- El E2E crítico incorpora las comprobaciones de anchura para evitar regresiones.

## Alcance y límites

Se conservan cuentas, permisos, movimientos, reportes y navegación.
Las comprobaciones PostgreSQL se ejecutan en GitHub Actions sobre el PR #1.
Las capturas y el navegador auxiliar no forman parte del repositorio.
