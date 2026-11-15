import { Router } from "express";
import { pool } from "../db.js";

const router = Router();

async function analizar(conexion, solicitudId) {
  const [solicitudes] = await conexion.query(
    "SELECT id, estado, fecha_requerida FROM solicitudes WHERE id = ?",
    [solicitudId]
  );
  if (solicitudes.length === 0) return null;

  const [config] = await conexion.query(
    "SELECT valor FROM configuracion WHERE clave = 'precio_marquilla'"
  );
  const bruta = config.length ? Math.round(Number(config[0].valor)) : null;
  const marquilla = Number.isFinite(bruta) && bruta > 0 ? bruta : null;

  const [filas] = await conexion.query(
    `SELECT d.id, d.descripcion_solicitada, d.cantidad, d.talla, d.especificaciones,
            d.con_marquilla, d.producto_id,
            p.a_medida, p.precio_aproximado, p.precio_referencia,
            (SELECT COUNT(*) FROM producto_tallas x WHERE x.producto_id = d.producto_id) AS n_tallas,
            (SELECT t.precio FROM producto_tallas t
              WHERE t.producto_id = d.producto_id AND t.talla = d.talla LIMIT 1) AS precio_talla
     FROM detalles_solicitud d
     LEFT JOIN productos p ON p.id = d.producto_id
     WHERE d.solicitud_id = ?
     ORDER BY d.id`,
    [solicitudId]
  );

  const items = filas.map((f) => {
    const cantidad = Number(f.cantidad);
    const conMarquilla = Boolean(f.con_marquilla);
    const bruto = Number(f.n_tallas) > 0 ? f.precio_talla : f.precio_referencia;
    const precio = bruto === null || bruto === undefined ? null : Math.round(Number(bruto));
    const marcadoFijo =
      f.producto_id !== null &&
      f.precio_aproximado !== null &&
      Number(f.precio_aproximado) === 0 &&
      !Boolean(f.a_medida);
    let fijo = marcadoFijo && precio !== null && Number.isFinite(precio) && precio >= 1;
    if (fijo && conMarquilla && marquilla === null) fijo = false;
    const porMarquilla = conMarquilla && marquilla !== null ? marquilla : 0;
    return {
      id: f.id,
      descripcion: f.descripcion_solicitada,
      talla: f.talla,
      cantidad,
      especificaciones: f.especificaciones,
      con_marquilla: conMarquilla,
      fijo,
      precio: fijo ? precio : null,
      marquilla_unitaria: fijo ? porMarquilla : null,
      subtotal: fijo ? cantidad * (precio + porMarquilla) : null,
    };
  });

  const [aceptadas] = await conexion.query(
    "SELECT id FROM cotizaciones WHERE solicitud_id = ? AND estado = 'aceptada'",
    [solicitudId]
  );
  const todoFijo = items.length > 0 && items.every((i) => i.fijo);
  return {
    solicitud: solicitudes[0],
    items,
    algun_fijo: items.some((i) => i.fijo),
    todo_fijo: todoFijo,
    total: todoFijo ? items.reduce((suma, i) => suma + i.subtotal, 0) : null,
    ya_tiene_pedido: aceptadas.length > 0,
  };
}

router.get("/solicitudes/:id/precios-catalogo", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: "Solicitud no válida." });
  }
  try {
    const resultado = await analizar(pool, id);
    if (!resultado) return res.status(404).json({ error: "La solicitud no existe." });
    res.json(resultado);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudieron calcular los precios del catálogo." });
  }
});

// Crea la cotización con los precios del catálogo, la deja aceptada y genera el pedido.
router.post("/solicitudes/:id/confirmar-catalogo", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: "Solicitud no válida." });
  }
  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();
    const [bloqueo] = await conexion.query(
      "SELECT estado FROM solicitudes WHERE id = ? FOR UPDATE",
      [id]
    );
    if (bloqueo.length === 0) {
      await conexion.rollback();
      return res.status(404).json({ error: "La solicitud no existe." });
    }
    if (bloqueo[0].estado === "cancelada") {
      await conexion.rollback();
      return res.status(409).json({ error: "La solicitud está cancelada." });
    }
    const r = await analizar(conexion, id);
    if (r.ya_tiene_pedido) {
      await conexion.rollback();
      return res.status(409).json({ error: "Esta solicitud ya tiene una cotización aceptada y un pedido." });
    }
    if (!r.todo_fijo) {
      await conexion.rollback();
      return res.status(409).json({
        error: "Hay líneas sin precio fijo en el catálogo: cotiza esta solicitud con el formulario normal.",
      });
    }

    const [cot] = await conexion.query(
      "INSERT INTO cotizaciones (solicitud_id, estado, fecha_emision, fecha_vencimiento, observaciones) VALUES (?, 'aceptada', NOW(), NULL, ?)",
      [id, "Precios fijos del catálogo, confirmada desde el panel."]
    );
    for (const it of r.items) {
      const texto = it.talla ? `${it.descripcion} (talla ${it.talla})` : it.descripcion;
      await conexion.query(
        "INSERT INTO detalles_cotizacion (cotizacion_id, descripcion, cantidad, precio_unitario, detalle_solicitud_id) VALUES (?, ?, ?, ?, ?)",
        [cot.insertId, texto.slice(0, 200), it.cantidad, it.precio, it.id]
      );
      if (it.con_marquilla && it.marquilla_unitaria > 0) {
        await conexion.query(
          "INSERT INTO detalles_cotizacion (cotizacion_id, descripcion, cantidad, precio_unitario, detalle_solicitud_id) VALUES (?, ?, ?, ?, NULL)",
          [cot.insertId, `Marquilla personalizada: ${it.descripcion}`.slice(0, 200), it.cantidad, it.marquilla_unitaria]
        );
      }
    }
    const [pedido] = await conexion.query(
      "INSERT INTO pedidos (cotizacion_id, estado) VALUES (?, 'confirmado')",
      [cot.insertId]
    );
    await conexion.query("UPDATE solicitudes SET estado = 'cotizada' WHERE id = ?", [id]);
    await conexion.commit();
    res.status(201).json({ cotizacion_id: cot.insertId, pedido_id: pedido.insertId, total: r.total });
  } catch (e) {
    await conexion.rollback();
    console.error(e);
    res.status(500).json({ error: "No se pudo confirmar la solicitud con los precios del catálogo." });
  } finally {
    conexion.release();
  }
});

export default router;