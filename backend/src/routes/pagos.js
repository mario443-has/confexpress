import { Router } from "express";
import { pool } from "../db.js";

const router = Router();

const ESTADOS_QUE_ADMITEN_PAGOS = ["confirmado", "en_confeccion", "listo"];

// Total, pagado y saldo de un pedido. Un pedido es "solo arreglos" cuando todas sus
// lineas vienen de un producto de tipo servicio del catalogo.
export async function cuentaDelPedido(conexion, pedidoId) {
  const [filas] = await conexion.query(
    `SELECT p.estado,
            (SELECT COALESCE(SUM(d.cantidad * d.precio_unitario), 0)
               FROM detalles_cotizacion d WHERE d.cotizacion_id = p.cotizacion_id) AS total,
            (SELECT COALESCE(SUM(g.monto), 0)
               FROM pagos g WHERE g.pedido_id = p.id AND g.anulado = 0) AS pagado,
            (SELECT COUNT(*)
               FROM detalles_cotizacion d WHERE d.cotizacion_id = p.cotizacion_id) AS lineas,
            (SELECT COUNT(*)
               FROM detalles_cotizacion d
               LEFT JOIN detalles_solicitud ds ON ds.id = d.detalle_solicitud_id
               LEFT JOIN productos pr ON pr.id = ds.producto_id
               WHERE d.cotizacion_id = p.cotizacion_id
                 AND (pr.tipo IS NULL OR pr.tipo <> 'servicio')) AS lineas_confeccion
     FROM pedidos p
     WHERE p.id = ?`,
    [pedidoId]
  );
  if (filas.length === 0) return null;
  const f = filas[0];
  const total = Number(f.total);
  const pagado = Number(f.pagado);
  return {
    estado: f.estado,
    total,
    pagado,
    saldo: total - pagado,
    soloArreglos: Number(f.lineas) > 0 && Number(f.lineas_confeccion) === 0,
  };
}

function fechaValida(texto) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;
  const d = new Date(`${texto}T00:00:00`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === texto;
}

function pesos(valor) {
  return Number(valor).toLocaleString("es-CO");
}

router.get("/pedidos/:id/pagos", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: "Pedido no válido." });
  }
  try {
    const cuenta = await cuentaDelPedido(pool, id);
    if (!cuenta) return res.status(404).json({ error: "El pedido no existe." });
    const [pagos] = await pool.query(
      `SELECT id, monto, metodo, DATE_FORMAT(fecha_pago, '%Y-%m-%d') AS fecha_pago, nota,
              anulado, motivo_anulacion, anulado_en, registrado_en
       FROM pagos WHERE pedido_id = ? ORDER BY id`,
      [id]
    );
    res.json({
      ...cuenta,
      pagos: pagos.map((p) => ({ ...p, monto: Number(p.monto), anulado: Boolean(p.anulado) })),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudieron cargar los anticipos." });
  }
});

router.post("/pedidos/:id/pagos", async (req, res) => {
  const id = Number(req.params.id);
  const monto = Number(req.body?.monto);
  const metodo = req.body?.metodo;
  const nota = String(req.body?.nota ?? "").trim();
  const fecha = req.body?.fecha_pago ? String(req.body.fecha_pago) : null;

  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: "Pedido no válido." });
  }
  if (!Number.isInteger(monto) || monto < 1 || monto > 100000000) {
    return res.status(400).json({ error: "El monto debe ser un número entero en pesos, mayor que 0." });
  }
  if (!["efectivo", "transferencia"].includes(metodo)) {
    return res.status(400).json({ error: "Elige si pagó en efectivo o por transferencia." });
  }
  if (fecha !== null && !fechaValida(fecha)) {
    return res.status(400).json({ error: "La fecha no es válida (usa AAAA-MM-DD)." });
  }
  if (nota.length > 255) {
    return res.status(400).json({ error: "La nota es demasiado larga (máximo 255 caracteres)." });
  }

  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();
    const [filas] = await conexion.query("SELECT estado FROM pedidos WHERE id = ? FOR UPDATE", [id]);
    if (filas.length === 0) {
      await conexion.rollback();
      return res.status(404).json({ error: "El pedido no existe." });
    }
    if (!ESTADOS_QUE_ADMITEN_PAGOS.includes(filas[0].estado)) {
      await conexion.rollback();
      return res.status(409).json({ error: `Un pedido ${filas[0].estado} no admite anticipos.` });
    }
    const antes = await cuentaDelPedido(conexion, id);
    if (monto > antes.saldo) {
      await conexion.rollback();
      return res.status(409).json({
        error: `El anticipo ($${pesos(monto)}) supera el saldo ($${pesos(antes.saldo)}).`,
      });
    }
    const [pago] = await conexion.query(
      "INSERT INTO pagos (pedido_id, monto, metodo, fecha_pago, nota) VALUES (?, ?, ?, COALESCE(?, CURDATE()), ?)",
      [id, monto, metodo, fecha, nota || null]
    );
    const despues = await cuentaDelPedido(conexion, id);
    await conexion.commit();
    res.status(201).json({ id: pago.insertId, total: despues.total, pagado: despues.pagado, saldo: despues.saldo });
  } catch (e) {
    await conexion.rollback();
    console.error(e);
    res.status(500).json({ error: "No se pudo registrar el anticipo." });
  } finally {
    conexion.release();
  }
});

// Un pago nunca se borra: se anula con un motivo y queda en el historial.
router.patch("/pagos/:id/anular", async (req, res) => {
  const id = Number(req.params.id);
  const motivo = String(req.body?.motivo ?? "").trim();
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: "Pago no válido." });
  }
  if (!motivo || motivo.length > 255) {
    return res.status(400).json({ error: "Escribe el motivo de la anulación (máximo 255 caracteres)." });
  }

  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();
    const [previos] = await conexion.query("SELECT pedido_id FROM pagos WHERE id = ?", [id]);
    if (previos.length === 0) {
      await conexion.rollback();
      return res.status(404).json({ error: "El pago no existe." });
    }
    const pedidoId = previos[0].pedido_id;
    const [pedidos] = await conexion.query("SELECT estado FROM pedidos WHERE id = ? FOR UPDATE", [pedidoId]);
    if (pedidos[0].estado === "entregado") {
      await conexion.rollback();
      return res.status(409).json({ error: "No se pueden anular anticipos de un pedido ya entregado." });
    }
    const [pagos] = await conexion.query("SELECT anulado FROM pagos WHERE id = ? FOR UPDATE", [id]);
    if (pagos[0].anulado) {
      await conexion.rollback();
      return res.status(409).json({ error: "Ese pago ya está anulado." });
    }
    await conexion.query(
      "UPDATE pagos SET anulado = 1, motivo_anulacion = ?, anulado_en = NOW() WHERE id = ?",
      [motivo, id]
    );
    const cuenta = await cuentaDelPedido(conexion, pedidoId);
    await conexion.commit();
    res.json({ id, total: cuenta.total, pagado: cuenta.pagado, saldo: cuenta.saldo });
  } catch (e) {
    await conexion.rollback();
    console.error(e);
    res.status(500).json({ error: "No se pudo anular el anticipo." });
  } finally {
    conexion.release();
  }
});

export default router;