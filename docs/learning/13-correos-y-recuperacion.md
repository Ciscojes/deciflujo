# Lección 13 — Correos y recuperación de contraseña

## El proveedor transporta; la aplicación conserva la identidad

Resend no conoce contraseñas ni decide quién puede cambiar una. Better Auth
genera un token aleatorio, lo almacena con vencimiento y construye el enlace.
El adaptador de correo solo recibe destinatario, contenido y URL para entregar
el mensaje.

Esta separación limita el daño si cambia el proveedor: la autenticación y las
pantallas no tienen que reescribirse.

## Evitar enumerar usuarios

La pantalla confirma siempre que se enviarán instrucciones «si existe una
cuenta». Decir «ese correo no está registrado» permitiría que cualquiera
descubriera quién usa Deciflujo.

Better Auth también simula parte del trabajo cuando la cuenta no existe. El
correo solo se intenta entregar para usuarios reales.

## Un enlace es una credencial temporal

Quien posee el enlace puede cambiar la contraseña, por eso:

- vence en una hora;
- solo se consume una vez;
- nunca se guarda en logs de producción;
- el cambio revoca todas las sesiones anteriores;
- se valida el origen de la URL de retorno.

En desarrollo sin Resend, Deciflujo imprime una vista previa en la terminal para
probar localmente. Esta alternativa está desactivada en producción.

## Entrega preparada para producción

La llamada a Resend ocurre exclusivamente en el servidor y utiliza:

- `RESEND_API_KEY` como credencial privada;
- `RESEND_FROM_EMAIL` con un dominio verificado;
- HTML y texto plano para compatibilidad;
- una clave de idempotencia por entrega;
- tiempo máximo de espera y errores controlados.

El usuario final no necesita conocer Resend. Recibe el mensaje normalmente en
Gmail, Outlook o cualquier otro proveedor.
