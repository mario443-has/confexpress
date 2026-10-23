# ConfeXpress

ConfeXpress es un sistema web pensado para pequeños talleres de confección: les permite recibir las solicitudes de sus clientes, cotizarlas y seguir cada pedido hasta que se entrega. Cada taller usaría su propia instalación, con su catálogo y su configuración.

Es el producto mínimo viable (PMV) del proyecto productivo del SENA (Tecnólogo en Análisis y Desarrollo de Software, ficha 3070183). Su primer taller de prueba es E & M Confecciones, un negocio familiar de confección de Ipiales, Nariño, que no es el único destinatario del producto.

La idea es tener en un solo lugar lo que normalmente se reparte entre cuadernos, mensajes, llamadas y notas sueltas: qué pidió cada cliente, cuánto se cotizó, si la cotización se aceptó y en qué va el trabajo. WhatsApp se sigue usando para hablar con el cliente; el sistema no lo reemplaza, solo prepara el mensaje con la cotización.

## Qué se puede hacer

Desde la página pública, el cliente ve el catálogo de productos y servicios y puede enviar una solicitud de cotización con lo que necesita, las cantidades, la talla y las observaciones. El formulario pide autorización para el tratamiento de los datos personales y deja registrada la fecha en que se dio. Si el teléfono ya estaba registrado, la solicitud se asocia al mismo cliente.

Por el lado del negocio hay un panel con contraseña. Ahí se ven las solicitudes con su estado (recibida, en revisión, cotizada o cancelada), se consulta la lista de clientes y también se pueden registrar las solicitudes que llegan en el local o por WhatsApp, indicando de dónde llegó cada una. Cuando el producto se confecciona a la medida, el panel permite guardar las medidas por prenda en centímetros.

Cada solicitud puede tener una o varias cotizaciones. La cotización se arma con líneas de descripción, cantidad y precio unitario, tiene una vigencia en días (15 por defecto) y se puede enviar por WhatsApp con un botón que abre el chat con el mensaje ya escrito; el botón funciona con números de Colombia y de Ecuador. Después la cotización se marca como enviada, aceptada o rechazada. Al aceptarla se crea el pedido automáticamente, y desde la pestaña Pedidos se va cambiando su estado: confirmado, en confección, listo y entregado. Un pedido se puede cancelar mientras no se haya entregado.

## Lo que todavía no tiene

Esta versión no maneja anticipos ni pagos, inventario, facturación, envío automático de mensajes de WhatsApp, automatizaciones ni aplicación móvil. Cada instalación atiende a un solo taller; manejar varios talleres dentro de una misma instalación queda como desarrollo futuro. Son cosas que podrían venir después, pero no forman parte del producto mínimo.

## Tecnología

La interfaz está hecha con React y Vite, el servidor con Node.js y Express, y los datos se guardan en MySQL.

## Cómo correrlo

Se necesita Node.js 20.19 (o 22.12 o superior) y MySQL 8.

**1. Base de datos.** Se crea la base y se carga el script con las tablas y un catálogo de ejemplo. Usar una base nueva o vacía:

```
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS confexpress CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
mysql -u root -p confexpress < database/confexpress.sql
```

En PowerShell el segundo comando se escribe así, porque PowerShell no admite el símbolo `<`:

```
cmd /c "mysql -u root -p confexpress < database\confexpress.sql"
```

**2. Servidor.** Se copia `.env.example` como `.env` y se completa con el usuario y la contraseña de MySQL y con la contraseña que se quiera usar para entrar al panel (`ADMIN_PASSWORD`). Luego se instalan las dependencias y se arranca:

```
cd backend
copy .env.example .env
npm install
npm run dev
```

El servidor queda en http://localhost:3001. Para comprobar que llegó bien a la base de datos se puede abrir http://localhost:3001/api/salud.

**3. Interfaz.** En otra terminal, con el servidor encendido (la interfaz le pide los datos a él):

```
cd frontend
npm install
npm run dev
```

La página pública queda en http://localhost:5173 y el panel en http://localhost:5173/#/admin. La sesión del panel dura 8 horas.

## Para probarlo

1. Enviar una solicitud desde la página pública.
2. Entrar al panel con la contraseña definida en `ADMIN_PASSWORD` y abrir la solicitud desde la lista.
3. Crear la cotización, marcarla como enviada y aceptarla.
4. Ir a la pestaña Pedidos, donde aparece el pedido, y avanzarlo hasta "Entregado".

También se puede registrar una solicitud desde la pestaña "Nueva solicitud" del panel, como si el cliente hubiera llegado al local o escrito por WhatsApp.

## Configuración y adaptación a otro taller

El nombre del negocio y el número de WhatsApp están en `frontend/src/config.js`. El número va con el indicativo del país y sin signos ni espacios. Mientras esté vacío, el botón de WhatsApp del formulario público no se muestra.

El catálogo de productos y servicios, y los tipos de prenda con sus medidas, viven en la base de datos (tablas `productos`, `tipos_prenda`, `medidas_prenda` y `producto_prendas`). Los que trae el script son de ejemplo y no incluyen precios reales; otro taller los cambiaría por los suyos.

## Organización del proyecto

La carpeta `backend` tiene el servidor y sus rutas, `frontend` tiene la interfaz y `database` tiene el script con el esquema y el catálogo de ejemplo.
