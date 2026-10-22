# ConfeXpress

Plataforma web para apoyar la gestión comercial de pequeños negocios de confección. Producto Mínimo Viable (PMV) de un proyecto productivo del SENA (Tecnólogo en Análisis y Desarrollo de Software, ficha 3070183). Se valida inicialmente en **E & M Confecciones** (Ipiales, Nariño).

## Qué hace el PMV

Flujo: catálogo → solicitud de cotización → cotización → pedido → seguimiento hasta la entrega.

1. **Catálogo de productos y servicios**: vista pública con los productos y servicios del negocio.
2. **Clientes**: se registran al llegar una solicitud; el panel tiene la lista de clientes.
3. **Solicitud de cotización**: formulario público, y registro desde el panel para clientes que llegan al local o por WhatsApp (con medidas por prenda para trabajos a la medida).
4. **Cotizaciones y pedidos**: el negocio cotiza cada solicitud, la envía (enlace a WhatsApp) y la marca como enviada, aceptada o rechazada. Al aceptarla se crea el pedido.
5. **Seguimiento del pedido**: confirmado, en confección, listo, entregado (o cancelado).

WhatsApp es un canal complementario: el panel genera el mensaje con la cotización, pero el envío lo hace la persona desde WhatsApp.

## Fuera del PMV (posible desarrollo futuro)

Anticipos y pagos en línea, inventario, automatizaciones (n8n), aplicación móvil, facturación electrónica, varios negocios (multiempresa).

## Tecnología

React + Vite (frontend), Node.js + Express (backend), MySQL 8 (base de datos).

## Requisitos

- Node.js 20.19 o superior (o 22.12 o superior)
- MySQL 8
## Instalación

### 1. Base de datos

El script crea la base `confexpress`, todas las tablas y el catálogo inicial. **Atención:** borra y vuelve a crear las tablas, así que úsalo solo en una instalación nueva.

```
mysql -u root -p < database/confexpress.sql
```

(En PowerShell: `cmd /c "mysql -u root -p < database\confexpress.sql"`.)

### 2. Backend

```
cd backend
copy .env.example .env
```

Edita `.env` con tus datos (usuario y contraseña de MySQL, y la contraseña del panel en `ADMIN_PASSWORD`). Luego:

```
npm install
npm run dev
```

Queda en http://localhost:3001 (revisa http://localhost:3001/api/salud).

### 3. Frontend

En otra terminal:

```
cd frontend
npm install
npm run dev
```

Abre http://localhost:5173 (catálogo y formulario de solicitud). El panel administrativo está en http://localhost:5173/#/admin.
## Probar el flujo

1. En http://localhost:5173 envía una solicitud de cotización.
2. Entra al panel (`/#/admin`) con la contraseña de `ADMIN_PASSWORD`.
3. En **Solicitudes**, abre la solicitud, crea la cotización y márcala como enviada.
4. Acéptala con **Aceptar y crear pedido**.
5. En **Pedidos**, avanza el estado hasta entregado.

## Configuración del negocio

`frontend/src/config.js` tiene el nombre del negocio y el número de WhatsApp (con indicativo de país, sin signos). Si el número queda vacío, el botón de WhatsApp del formulario público no se muestra.

## Estructura

- `backend/`: API (Express). Rutas en `backend/src/routes`.
- `frontend/`: interfaz (React + Vite).
- `database/confexpress.sql`: esquema y catálogo inicial.

## Estado

PMV en desarrollo. El catálogo inicial es de demostración y no incluye precios verificados.