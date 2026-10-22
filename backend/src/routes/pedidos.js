import { Router } from "express";
import { pool } from "../db.js";

const router = Router();

// Desde qué estado se puede pasar a cuál. aceptada y rechazada son finales.
const TRANSICIONES = {
  borrador: ["enviada", "aceptada", "rechazada"],
  enviada: ["aceptada", "rechazada"],
};

router.patch("/cotizaciones/:id/estado", async (req, res) => {
  const id = Number(req.params.id);
  const estado = req.body?.estado;
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: "Cotización no válida." });
  }
  if (!["enviada", "aceptada", "rechazada"].includes(estado)) {
    return res.status(400).json({ error: "Estado no permitido." });
  }

  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();

    const [filas] = await conexion.query(
      "SELECT estado FROM cotizaciones WHERE id = ? FOR UPDATE",
      [id]
    );
    if (filas.length === 0) {
      await conexion.rollback();
      return res.status(404).json({ error: "La cotización no existe." });
    }
    const actual = filas[0].estado;
    if (!(TRANSICIONES[actual] ?? []).includes(estado)) {
      await conexion.rollback();
      return res
        .status(409)
        .json({ error: `Una cotización ${actual} no puede pasar a ${estado}.` });
    }

    await conexion.query("UPDATE cotizaciones SET estado = ? WHERE id = ?", [estado, id]);

    let pedidoId = null;
    if (estado === "aceptada") {
      const [pedido] = await conexion.query(
        "INSERT INTO pedidos (cotizacion_id, estado) VALUES (?, 'confirmado')",
        [id]
      );
      pedidoId = pedido.insertId;
    }

    await conexion.commit();
    res.json({ id, estado, pedido_id: pedidoId });
  } catch (e) {
    await conexion.rollback();
    console.error(e);
    res.status(500).json({ error: "No se pudo actualizar la cotización." });
  } finally {
    conexion.release();
  }
});

const TRANSICIONES_PEDIDO = {
  confirmado: ["en_confeccion", "cancelado"],
  en_confeccion: ["listo", "cancelado"],
  listo: ["entregado", "cancelado"],
};

router.get("/pedidos", async (req, res) => {
  try {
    const [filas] = await pool.query(
      `SELECT p.id, p.estado, p.creado_en, p.fecha_entrega_real,
              c.id AS cotizacion_id, s.id AS solicitud_id,
              cl.nombre AS cliente, cl.telefono,
              (SELECT COALESCE(SUM(d.cantidad * d.precio_unitario), 0)
                 FROM detalles_cotizacion d WHERE d.cotizacion_id = c.id) AS total,
              (SELECT GROUP_CONCAT(CONCAT(d.cantidad, ' × ', d.descripcion) SEPARATOR '; ')
                 FROM detalles_cotizacion d WHERE d.cotizacion_id = c.id) AS detalle
       FROM pedidos p
       JOIN cotizaciones c ON c.id = p.cotizacion_id
       JOIN solicitudes s ON s.id = c.solicitud_id
       JOIN clientes cl ON cl.id = s.cliente_id
       ORDER BY p.creado_en DESC, p.id DESC`
    );
    res.json(filas.map((f) => ({ ...f, total: Number(f.total) })));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudieron obtener los pedidos." });
  }
});

router.patch("/pedidos/:id/estado", async (req, res) => {
  const id = Number(req.params.id);
  const estado = req.body?.estado;
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: "Pedido no válido." });
  }
  if (!["en_confeccion", "listo", "entregado", "cancelado"].includes(estado)) {
    return res.status(400).json({ error: "Estado no permitido." });
  }
  try {
    const [filas] = await pool.query("SELECT estado FROM pedidos WHERE id = ?", [id]);
    if (filas.length === 0) {
      return res.status(404).json({ error: "El pedido no existe." });
    }
    const actual = filas[0].estado;
    if (!(TRANSICIONES_PEDIDO[actual] ?? []).includes(estado)) {
      return res
        .status(409)
        .json({ error: `Un pedido ${actual} no puede pasar a ${estado}.` });
    }
    if (estado === "entregado") {
      await pool.query(
        "UPDATE pedidos SET estado = ?, fecha_entrega_real = CURDATE() WHERE id = ?",
        [estado, id]
      );
    } else {
      await pool.query("UPDATE pedidos SET estado = ? WHERE id = ?", [estado, id]);
    }
    res.json({ id, estado });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo actualizar el pedido." });
  }
});

export default router;