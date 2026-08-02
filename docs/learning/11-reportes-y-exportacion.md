# Lección 11 — Reportes y exportación segura

## Una consulta, dos representaciones

La vista web y el CSV nacen del mismo caso de uso. Primero se validan los
filtros, después el repositorio recupera los movimientos de la empresa activa y
finalmente se calculan los totales. Solo la última etapa cambia: JSON para la
interfaz o CSV para descargar.

Esta separación evita que un total exportado sea distinto del mostrado.

## Filtrar dentro de la frontera de datos

El repositorio aplica organización, fechas, tipo, categoría y cuenta dentro de
SQL. Filtrar después de leer todas las filas consumiría memoria innecesaria y
aumentaría el riesgo de mezclar datos entre empresas.

El rango se limita a 366 días para mantener predecible el costo del reporte
mientras Deciflujo usa SQLite.

## Exportar es un permiso distinto

Leer una pantalla y obtener una copia reutilizable de todos sus datos no tienen
el mismo impacto. Por eso `report:read` y `report:export` son permisos separados:
el colaborador puede consultar, mientras propietario, administrador y contador
pueden descargar.

## CSV también tiene riesgos

Excel interpreta celdas que comienzan con `=`, `+`, `-` o `@` como fórmulas.
Una descripción ingresada por una persona podría ejecutar contenido al abrir el
archivo. El exportador neutraliza esos prefijos, escapa comillas y utiliza BOM
UTF-8 para conservar correctamente tildes y símbolos.
