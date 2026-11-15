import assert from "node:assert/strict";
import mysql from "mysql2/promise";

const baseUrl = process.env.TEST_API_URL || "http://localhost:3002";
const telefonoNacional = `3${String(Date.now()).slice(-9)}`;
const telefonoInternacional = `57${telefonoNacional}`;
const nombreCliente = `Prueba PMV ${telefonoNacional.slice(-4)}`;

async function llamar(ruta, opciones = {}, token = "") {
  const respuesta = await fetch(`${baseUrl}${ruta}`, {
    ...opciones,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opciones.headers,
    },
  });
  const datos = await respuesta.json().catch(() => ({}));
  return { estado: respuesta.status, datos };
}

function confirmar(resultado, estado) {
  assert.equal(resultado.estado, estado, resultado.datos.error || JSON.stringify(resultado.datos));
  return resultado.datos;
}

function solicitud(telefono) {
  return {
    nombre: nombreCliente,
    telefono,
    correo: "prueba-pmv@example.com",
    autoriza_datos: true,
    observaciones: "Solicitud creada por la prueba funcional.",
    items: [
      {
        descripcion: "Sudadera de prueba",
        cantidad: 1,
        talla: "M",
        especificaciones: "Prueba funcional",
      },
    ],
  };
}

function cotizacion(detalleSolicitudId, precio) {
  return {
    dias_validez: 15,
    observaciones: "Cotización creada por la prueba funcional.",
    lineas: [
      {
        detalle_solicitud_id: detalleSolicitudId,
        descripcion: "Sudadera de prueba",
        cantidad: 1,
        precio_unitario: precio,
      },
    ],
  };
}

if (!String(process.env.DB_NAME).endsWith("_prueba")) {
  throw new Error("Esta prueba solo corre sobre una base cuyo nombre termine en _prueba (por ejemplo confexpress_prueba).");
}

const baseDeDatos = await mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

try {
  const primeraSolicitud = confirmar(
    await llamar("/api/solicitudes", {
      method: "POST",
      body: JSON.stringify(solicitud(`+${telefonoInternacional}`)),
    }),
    201
  );
  confirmar(
    await llamar("/api/solicitudes", {
      method: "POST",
      body: JSON.stringify(solicitud(telefonoInternacional)),
    }),
    201
  );

  const sesion = confirmar(
    await llamar("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ password: process.env.ADMIN_PASSWORD }),
    }),
    200
  );
  const token = sesion.token;

  const clientes = confirmar(await llamar("/api/admin/clientes", {}, token), 200);
  assert.equal(clientes.filter((cliente) => cliente.telefono === telefonoInternacional).length, 1);

  const detalle = confirmar(
    await llamar(`/api/admin/solicitudes/${primeraSolicitud.id}`, {}, token),
    200
  );
  const detalleSolicitudId = detalle.items[0].id;

  const vencida = confirmar(
    await llamar(
      `/api/admin/solicitudes/${primeraSolicitud.id}/cotizaciones`,
      { method: "POST", body: JSON.stringify(cotizacion(detalleSolicitudId, 90000)) },
      token
    ),
    201
  );
  await baseDeDatos.query(
    "UPDATE cotizaciones SET fecha_vencimiento = CURDATE() - INTERVAL 1 DAY WHERE id = ?",
    [vencida.id]
  );

  const cotizacionesVencidas = confirmar(
    await llamar(`/api/admin/solicitudes/${primeraSolicitud.id}/cotizaciones`, {}, token),
    200
  );
  assert.equal(cotizacionesVencidas.find((item) => item.id === vencida.id).estado, "vencida");
  confirmar(
    await llamar(
      `/api/admin/cotizaciones/${vencida.id}/estado`,
      { method: "PATCH", body: JSON.stringify({ estado: "aceptada" }) },
      token
    ),
    409
  );

  const rechazada = confirmar(
    await llamar(
      `/api/admin/solicitudes/${primeraSolicitud.id}/cotizaciones`,
      { method: "POST", body: JSON.stringify(cotizacion(detalleSolicitudId, 95000)) },
      token
    ),
    201
  );
  confirmar(
    await llamar(
      `/api/admin/cotizaciones/${rechazada.id}/estado`,
      { method: "PATCH", body: JSON.stringify({ estado: "rechazada" }) },
      token
    ),
    200
  );

  const aceptada = confirmar(
    await llamar(
      `/api/admin/solicitudes/${primeraSolicitud.id}/cotizaciones`,
      { method: "POST", body: JSON.stringify(cotizacion(detalleSolicitudId, 100000)) },
      token
    ),
    201
  );
  const alternativa = confirmar(
    await llamar(
      `/api/admin/solicitudes/${primeraSolicitud.id}/cotizaciones`,
      { method: "POST", body: JSON.stringify(cotizacion(detalleSolicitudId, 105000)) },
      token
    ),
    201
  );
  const intentosAceptacion = await Promise.all([
    llamar(
      `/api/admin/cotizaciones/${aceptada.id}/estado`,
      { method: "PATCH", body: JSON.stringify({ estado: "aceptada" }) },
      token
    ),
    llamar(
      `/api/admin/cotizaciones/${alternativa.id}/estado`,
      { method: "PATCH", body: JSON.stringify({ estado: "aceptada" }) },
      token
    ),
  ]);
  const exitos = intentosAceptacion.filter((resultado) => resultado.estado === 200);
  const conflictos = intentosAceptacion.filter((resultado) => resultado.estado === 409);
  assert.equal(exitos.length, 1);
  assert.equal(conflictos.length, 1);
  const resultadoAceptacion = exitos[0].datos;
  assert.ok(resultadoAceptacion.pedido_id);

  const pedidos = confirmar(await llamar("/api/admin/pedidos", {}, token), 200);
  const pedido = pedidos.find((item) => item.id === resultadoAceptacion.pedido_id);
  assert.ok(pedido);
  assert.equal(pedidos.filter((item) => item.solicitud_id === primeraSolicitud.id).length, 1);

  const rutaPedido = `/api/admin/pedidos/${pedido.id}`;
  const cambiarEstado = (estado) =>
    llamar(`${rutaPedido}/estado`, { method: "PATCH", body: JSON.stringify({ estado }) }, token);
  const pagarPedido = (monto, metodo = "efectivo") =>
    llamar(`${rutaPedido}/pagos`, { method: "POST", body: JSON.stringify({ monto, metodo }) }, token);
  const anularPago = (id) =>
    llamar(`/api/admin/pagos/${id}/anular`, { method: "PATCH", body: JSON.stringify({ motivo: "prueba" }) }, token);
  let primerPago;

  for (const estado of ["en_confeccion", "listo", "entregado"]) {
    if (estado === "en_confeccion") {
      // Esta línea no viene del catálogo: cuenta como confección y exige anticipo.
      confirmar(await cambiarEstado("en_confeccion"), 409);
      confirmar(await pagarPedido(0), 400);
      confirmar(await pagarPedido(1500.5), 400);
      confirmar(await pagarPedido(pedido.total + 1), 409);
      primerPago = confirmar(await pagarPedido(40000), 201);
      assert.equal(primerPago.saldo, pedido.total - 40000);
    }
    if (estado === "listo") {
      const extra = confirmar(await pagarPedido(10000, "transferencia"), 201);
      const tras = confirmar(await anularPago(extra.id), 200);
      assert.equal(tras.pagado, 40000);
    }
    if (estado === "entregado") {
      confirmar(await cambiarEstado("entregado"), 409);
      confirmar(await pagarPedido(pedido.total - 40000), 201);
    }
    confirmar(
      await llamar(
        `/api/admin/pedidos/${pedido.id}/estado`,
        { method: "PATCH", body: JSON.stringify({ estado }) },
        token
      ),
      200
    );
  }
  confirmar(
    await llamar(
      `/api/admin/pedidos/${pedido.id}/estado`,
      { method: "PATCH", body: JSON.stringify({ estado: "en_confeccion" }) },
      token
    ),
    409
  );

  const pedidosFinales = confirmar(await llamar("/api/admin/pedidos", {}, token), 200);
  const pedidoFinal = pedidosFinales.find((item) => item.id === pedido.id);
  assert.equal(pedidoFinal.estado, "entregado");
  assert.ok(pedidoFinal.fecha_entrega_real);

  confirmar(await anularPago(primerPago.id), 409);

  // Arreglo del catálogo: no exige anticipo, pero tampoco se entrega con saldo.
  const productosPublicos = confirmar(await llamar("/api/productos"), 200);
  const servicio = productosPublicos.find((p) => p.tipo === "servicio");
  assert.ok(servicio, "Falta un producto de tipo servicio (carga database/datos_demo.sql).");
  const solicitudArreglo = confirmar(
    await llamar("/api/solicitudes", {
      method: "POST",
      body: JSON.stringify({
        ...solicitud(telefonoInternacional),
        items: [{ producto_id: servicio.id, descripcion: "Arreglo de prueba", cantidad: 1 }],
      }),
    }),
    201
  );
  const detalleArreglo = confirmar(
    await llamar(`/api/admin/solicitudes/${solicitudArreglo.id}`, {}, token),
    200
  );
  const cotizacionArreglo = confirmar(
    await llamar(
      `/api/admin/solicitudes/${solicitudArreglo.id}/cotizaciones`,
      { method: "POST", body: JSON.stringify(cotizacion(detalleArreglo.items[0].id, 20000)) },
      token
    ),
    201
  );
  const aceptadaArreglo = confirmar(
    await llamar(
      `/api/admin/cotizaciones/${cotizacionArreglo.id}/estado`,
      { method: "PATCH", body: JSON.stringify({ estado: "aceptada" }) },
      token
    ),
    200
  );
  const rutaArreglo = `/api/admin/pedidos/${aceptadaArreglo.pedido_id}`;
  const estadoArreglo = (estado) =>
    llamar(`${rutaArreglo}/estado`, { method: "PATCH", body: JSON.stringify({ estado }) }, token);
  confirmar(await estadoArreglo("en_confeccion"), 200);
  confirmar(await estadoArreglo("listo"), 200);
  confirmar(await estadoArreglo("entregado"), 409);
  confirmar(
    await llamar(`${rutaArreglo}/pagos`, { method: "POST", body: JSON.stringify({ monto: 20000, metodo: "efectivo" }) }, token),
    201
  );
  confirmar(await estadoArreglo("entregado"), 200);

  console.log("Flujo PMV completado correctamente.");
} finally {
  await baseDeDatos.end();
}
