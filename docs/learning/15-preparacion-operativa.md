# Lección 15 — Preparación operativa sin desplegar

Una aplicación que compila no está lista para operar. Este incremento añadió
capas que solo se hacen visibles cuando algo falla: salud, límites de acceso,
logs estructurados, respaldo, restauración, importación y pruebas de navegador.

Los cambios de rol y las bajas ahora pasan por endpoints de Deciflujo. Better Auth
sigue autorizando la operación, pero el endpoint conserva al actor y registra
un evento comprensible. Así se evita atribuir el cambio al miembro afectado.

Playwright ejecuta el recorrido de registro, empresa y movimiento tanto con
SQLite como con PostgreSQL 16 en CI. Las herramientas de datos adoptan una regla
más estricta: restaurar o importar requiere una frase de confirmación y se
cancela si el destino contiene información real.

La preparación no equivale a publicación. Dominio, secretos, monitoreo externo,
retención y documentos legales dependen del entorno definitivo y permanecen en
un checklist explícito para no fingir garantías que todavía no existen.
