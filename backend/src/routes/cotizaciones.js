import { Router } from "express";
import { pool } from "../db.js";

const router = Router();

router.get("/solicitudes/:id/cotizaciones", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: "Solicitud no válida." });
  }
  try {
    const [cotizaciones] = await pool.query(
      "SELECT id, estado, fecha_emision, fecha_vencimiento, observaciones FROM cotizaciones WHERE solicitud_id = ? ORDER BY id DESC",
      [id]
    );
    if (cotizaciones.length === 0) return res.json([]);

    const [lineas] = await pool.query(
      "SELECT id, cotizacion_id, descripcion, cantidad, precio_unitario, detalle_solicitud_id FROM detalles_cotizacion WHERE cotizacion_id IN (?) ORDER BY id",
      [cotizaciones.map((c) => c.id)]
    );

    res.json(
      cotizaciones.map((c) => {
        const propias = lineas
          .filter((l) => l.cotizacion_id === c.id)
          .map((l) => ({
            id: l.id,
            descripcion: l.descripcion,
            cantidad: Number(l.cantidad),
            precio_unitario: Number(l.precio_unitario),
            detalle_solicitud_id: l.detalle_solicitud_id,
          }));
        return {
          ...c,
          lineas: propias,
          total: propias.reduce((suma, l) => suma + l.cantidad * l.precio_unitario, 0),
        };
      })
    );
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudieron cargar las cotizaciones." });
  }
});

router.post("/solicitudes/:id/cotizaciones", async (req, res) => {
  const solicitudId = Number(req.params.id);
  if (!Number.isInteger(solicitudId) || solicitudId < 1) {
    return res.status(400).json({ error: "Solicitud no válida." });
  }

  const cuerpo = req.body || {};
  const diasValidez = cuerpo.dias_validez === undefined ? 15 : Number(cuerpo.dias_validez);
  const observaciones = String(cuerpo.observaciones ?? "").trim();

  if (!Number.isInteger(diasValidez) || diasValidez < 1 || diasValidez > 90) {
    return res.status(400).json({ error: "La vigencia debe ser de 1 a 90 días." });
  }
  if (observaciones.length > 2000) {
    return res.status(400).json({ error: "Las observaciones son demasiado largas." });
  }
  if (!Array.isArray(cuerpo.lineas) || cuerpo.lineas.length < 1 || cuerpo.lineas.length > 20) {
    return res.status(400).json({ error: "La cotización debe tener entre 1 y 20 líneas." });
  }

  const lineas = [];
  for (const [i, l] of cuerpo.lineas.entries()) {
    const n = i + 1;
    const descripcion = String(l.descripcion ?? "").trim();
    const cantidad = Number(l.cantidad);
    const precio = Number(l.precio_unitario);
    const vinculo =
      l.detalle_solicitud_id === null || l.detalle_solicitud_id === undefined
        ? null
        : Number(l.detalle_solicitud_id);

    if (!descripcion || descripcion.length > 200) {
      return res.status(400).json({ error: `Línea ${n}: escribe una descripción (máximo 200 caracteres).` });
    }
    if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 10000) {
      return res.status(400).json({ error: `Línea ${n}: la cantidad debe ser un entero entre 1 y 10000.` });
    }
    if (!Number.isInteger(precio) || precio < 1 || precio > 100000000) {
      return res.status(400).json({ error: `Línea ${n}: escribe el precio unitario en pesos (mayor que 0).` });
    }
    if (vinculo !== null && !Number.isInteger(vinculo)) {
      return res.status(400).json({ error: `Línea ${n}: ítem de la solicitud no válido.` });
    }
    lineas.push({ descripcion, cantidad, precio, vinculo });
  }

  try {
    const [solicitudes] = await pool.query("SELECT estado FROM solicitudes WHERE id = ?", [solicitudId]);
    if (solicitudes.length === 0) {
      return res.status(404).json({ error: "La solicitud no existe." });
    }
    if (solicitudes[0].estado === "cancelada") {
      return res.status(400).json({ error: "La solicitud está cancelada." });
    }

    const [propios] = await pool.query("SELECT id FROM detalles_solicitud WHERE solicitud_id = ?", [solicitudId]);
    const idsValidos = new Set(propios.map((p) => p.id));
    for (const l of lineas) {
      if (l.vinculo !== null && !idsValidos.has(l.vinculo)) {
        return res.status(400).json({ error: "Una línea apunta a un ítem que no es de esta solicitud." });
      }
    }

    const conexion = await pool.getConnection();
    try {
      await conexion.beginTransaction();
      const [cotizacion] = await conexion.query(
        "INSERT INTO cotizaciones (solicitud_id, estado, fecha_emision, fecha_vencimiento, observaciones) VALUES (?, 'borrador', NOW(), DATE_ADD(CURDATE(), INTERVAL ? DAY), ?)",
        [solicitudId, diasValidez, observaciones]
      );
      for (const l of lineas) {
        await conexion.query(
          "INSERT INTO detalles_cotizacion (cotizacion_id, descripcion, cantidad, precio_unitario, detalle_solicitud_id) VALUES (?, ?, ?, ?, ?)",
          [cotizacion.insertId, l.descripcion, l.cantidad, l.precio, l.vinculo]
        );
      }
      await conexion.query("UPDATE solicitudes SET estado = 'cotizada' WHERE id = ?", [solicitudId]);
      await conexion.commit();
      res.status(201).json({ id: cotizacion.insertId });
    } catch (e) {
      await conexion.rollback();
      throw e;
    } finally {
      conexion.release();
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo crear la cotización." });
  }
});

export default router;