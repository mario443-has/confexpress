# ConfeXpress

ConfeXpress es un sistema web para que un taller de confección pueda recibir las solicitudes de sus clientes, cotizarlas y seguir cada pedido hasta que se entrega. Es el producto mínimo viable del proyecto productivo del SENA (Tecnólogo en Análisis y Desarrollo de Software, ficha 3070183) y se está validando con E & M Confecciones, un negocio familiar de confección de Ipiales, Nariño.

La idea es tener en un solo lugar lo que normalmente se reparte entre mensajes, llamadas y notas sueltas: qué pidió cada cliente, cuánto se cotizó, si la cotización se aceptó y en qué va el trabajo. WhatsApp se sigue usando para hablar con el cliente; el sistema no lo reemplaza, solo prepara el mensaje con la cotización.

## Qué se puede hacer

Desde la página pública, el cliente ve el catálogo de productos y servicios y puede enviar una solicitud de cotización con lo que necesita, las cantidades, la talla y las observaciones. El formulario pide autorización para el tratamiento de los datos personales y deja registrada la fecha en que se dio. Si el teléfono ya estaba registrado, la solicitud se asocia al mismo cliente.

Por el lado del negocio hay un panel con contraseña. Ahí se ven las solicitudes con su estado (recibida, en revisión, cotizada o cancelada) y también se pueden registrar las que llegan en el local o por WhatsApp, indicando de dónde llegó cada una. Cuando el producto se confecciona a la medida, el panel permite guardar las medidas por prenda en centímetros.

Cada solicitud puede tener una o varias cotizaciones. La cotización se arma con líneas de descripción, cantidad y precio unitario, tiene una vigencia en días (15 por defecto) y se puede enviar por WhatsApp con un botón que abre el chat con el mensaje ya escrito. Después se marca como enviada, aceptada o rechazada. Al aceptarla se crea el pedido automáticamente, y desde la pestaña de pedidos se va cambiando su estado: confirmado, en confección, listo y entregado. Un pedido se puede cancelar mientras no se haya entregado, y al entregarlo queda guardada la fecha.

## Lo que todavía no tiene

Esta versión no maneja anticipos ni pagos, inventario, facturación, automatizaciones ni aplicación móvil. Tampoco sirve todavía para varios negocios a la vez; está pensado para uno solo. Son cosas que podrían venir después, pero no forman parte del producto mínimo.

## Tecnología

La interfaz está hecha con React y Vite, el servidor con Node.js y Express, y los datos se guardan en MySQL.

## Cómo correrlo

Se necesita Node.js 20.19 o superior y MySQL 8.

Primero se crea la base de datos. El script crea la base `confexpress` con todas sus tablas y un catálogo de ejemplo. Si las tablas ya existen las borra y las vuelve a crear, así que solo se debe usar en una instalación nueva:

```
mysql -u root -p < database/confexpress.sql
```

En PowerShell ese comando se escribe así: `cmd /c "mysql -u root -p < database\confexpress.sql"`

Después se prepara el servidor. Se copia `.env.example` como `.env` y se completa con el usuario y la contraseña de MySQL y con la contraseña que se quiera usar para entrar al panel (`ADMIN_PASSWORD`). Luego se instalan las dependencias y se arranca:

```
cd backend
copy .env.example .env
npm install
npm run dev
```

El servidor queda en http://localhost:3001. Para comprobar que llegó bien a la base de datos se puede abrir http://localhost:3001/api/salud.

Por último se arranca la interfaz, en otra terminal. El servidor debe estar encendido porque la interfaz le pide los datos a él:

```
cd frontend
npm install
npm run dev
```

La página pública queda en http://localhost:5173 y el panel en http://localhost:5173/#/admin. La sesión del panel dura 8 horas.

## Para probarlo

Se envía una solicitud desde la página pública, se entra al panel y se abre en la lista de solicitudes. Allí se crea la cotización, se marca como enviada y se acepta. Con eso aparece el pedido en la pestaña Pedidos, donde se puede avanzar hasta entregado.

## Configuración

El nombre del negocio y el número de WhatsApp están en `frontend/src/config.js`. El número va con el indicativo del país y sin signos ni espacios. Mientras esté vacío, el botón de WhatsApp del formulario público no se muestra.

## Organización del proyecto

La carpeta `backend` tiene el servidor y sus rutas, `frontend` tiene la interfaz y `database` tiene el script con el esquema y el catálogo. El catálogo que trae el script es solo de ejemplo y no incluye precios reales.