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

export default router;