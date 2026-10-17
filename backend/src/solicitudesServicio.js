import { pool } from "./db.js";

const REGEX_TELEFONO = /^\+?\d{7,15}$/;
const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validar(body) {
  const nombre = String(body.nombre ?? "").trim();
  const telefono = String(body.telefono ?? "").replace(/[\s()-]/g, "");
  const correo = String(body.correo ?? "").trim();
  const observaciones = String(body.observaciones ?? "").trim();

  if (nombre.length < 2 || nombre.length > 120) {
    return { error: "Ingresa el nombre (máximo 120 caracteres)." };
  }
  if (!REGEX_TELEFONO.test(telefono)) {
    return { error: "Ingresa un teléfono válido, solo números (7 a 15 dígitos)." };
  }
  if (correo && (correo.length > 120 || !REGEX_CORREO.test(correo))) {
    return { error: "El correo no es válido." };
  }
  if (body.autoriza_datos !== true) {
    return { error: "Debe autorizarse el tratamiento de los datos personales para registrar la solicitud." };
  }
  if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > 20) {
    return { error: "Agrega entre 1 y 20 productos o servicios." };
  }

  const items = [];
  for (const [i, it] of body.items.entries()) {
    const n = i + 1;
    const descripcion = String(it.descripcion ?? "").trim();
    const cantidad = Number(it.cantidad);
    const talla = String(it.talla ?? "").trim();
    const especificaciones = String(it.especificaciones ?? "").trim();
    const vacio = it.producto_id === null || it.producto_id === undefined || it.producto_id === "";
    const productoId = vacio ? null : Number(it.producto_id);

    if (!descripcion || descripcion.length > 200) {
      return { error: `Ítem ${n}: describe lo que se necesita (máximo 200 caracteres).` };
    }
    if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 10000) {
      return { error: `Ítem ${n}: la cantidad debe ser un entero entre 1 y 10000.` };
    }
    if (talla.length > 50) {
      return { error: `Ítem ${n}: la talla es demasiado larga.` };
    }
    if (especificaciones.length > 2000) {
      return { error: `Ítem ${n}: las especificaciones son demasiado largas.` };
    }
    if (productoId !== null && !Number.isInteger(productoId)) {
      return { error: `Ítem ${n}: producto no válido.` };
    }
    items.push({
      productoId,
      descripcion,
      cantidad,
      talla: talla || null,
      especificaciones: especificaciones || null,
    });
  }

  return {
    datos: {
      nombre,
      telefono,
      correo: correo || null,
      observaciones: observaciones || null,
      items,
    },
  };
}

export async function crearSolicitud(datos, origen) {
  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();

    const [existentes] = await conexion.query(
      "SELECT id FROM clientes WHERE telefono = ? ORDER BY id LIMIT 1",
      [datos.telefono]
    );

    let clienteId;
    if (existentes.length > 0) {
      clienteId = existentes[0].id;
    } else {
      const [nuevo] = await conexion.query(
        "INSERT INTO clientes (nombre, telefono, correo) VALUES (?, ?, ?)",
        [datos.nombre, datos.telefono, datos.correo]
      );
      clienteId = nuevo.insertId;
    }

    const [solicitud] = await conexion.query(
      "INSERT INTO solicitudes (cliente_id, origen, observaciones, autorizacion_datos_en) VALUES (?, ?, ?, NOW())",
      [clienteId, origen, datos.observaciones]
    );
    const solicitudId = solicitud.insertId;

    for (const it of datos.items) {
      await conexion.query(
        "INSERT INTO detalles_solicitud (solicitud_id, producto_id, descripcion_solicitada, cantidad, talla, especificaciones) VALUES (?, ?, ?, ?, ?, ?)",
        [solicitudId, it.productoId, it.descripcion, it.cantidad, it.talla, it.especificaciones]
      );
    }

    await conexion.commit();
    return solicitudId;
  } catch (e) {
    await conexion.rollback();
    throw e;
  } finally {
    conexion.release();
  }
}

export function errorHttp(e) {
  console.error(e);
  if (e.code === "ER_NO_REFERENCED_ROW_2") {
    return { estado: 400, mensaje: "Uno de los productos seleccionados no existe." };
  }
  return { estado: 500, mensaje: "No se pudo registrar la solicitud." };
}