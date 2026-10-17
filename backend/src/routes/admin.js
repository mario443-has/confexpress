import { Router } from "express";
import { pool } from "../db.js";
import { crearToken, requireAdmin, verificarPassword } from "../auth.js";
import { validar, crearSolicitud, errorHttp } from "../solicitudesServicio.js";
import medidasRouter from "./medidas.js";

const router = Router();

// "cotizada" no se asigna a mano: lo hará el sistema al crear la cotización.
const ESTADOS_MANUALES = ["recibida", "en_revision", "cancelada"];

router.post("/login", (req, res) => {
  if (!process.env.ADMIN_PASSWORD) {
    return res
      .status(500)
      .json({ error: "Falta configurar ADMIN_PASSWORD en el archivo .env del backend." });
  }
  if (!verificarPassword(req.body?.password)) {
    return res.status(401).json({ error: "Contraseña incorrecta." });
  }
  res.json({ token: crearToken() });
});

router.use(requireAdmin);

router.get("/solicitudes", async (req, res) => {
  try {
    const [filas] = await pool.query(
      `SELECT s.id, s.estado, s.origen, s.creada_en, c.nombre AS cliente, c.telefono,
              (SELECT COUNT(*) FROM detalles_solicitud d WHERE d.solicitud_id = s.id) AS items
       FROM solicitudes s
       JOIN clientes c ON c.id = s.cliente_id
       ORDER BY s.creada_en DESC, s.id DESC`
    );
    res.json(filas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "No se pudieron obtener las solicitudes." });
  }
});

router.get("/solicitudes/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: "Identificador no válido." });
  }
  try {
    const [filas] = await pool.query(
      `SELECT s.id, s.estado, s.origen, s.observaciones, s.autorizacion_datos_en, s.creada_en,
              c.id AS cliente_id, c.nombre AS cliente, c.telefono, c.correo
       FROM solicitudes s
       JOIN clientes c ON c.id = s.cliente_id
       WHERE s.id = ?`,
      [id]
    );
    if (filas.length === 0) {
      return res.status(404).json({ error: "Solicitud no encontrada." });
    }
    const [items] = await pool.query(
      `SELECT d.id, d.descripcion_solicitada, d.cantidad, d.talla, d.especificaciones,
              p.nombre AS producto, p.a_medida
       FROM detalles_solicitud d
       LEFT JOIN productos p ON p.id = d.producto_id
       WHERE d.solicitud_id = ?
       ORDER BY d.id`,
      [id]
    );
    res.json({ ...filas[0], items });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "No se pudo obtener la solicitud." });
  }
});

router.patch("/solicitudes/:id/estado", async (req, res) => {
  const id = Number(req.params.id);
  const estado = req.body?.estado;
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: "Identificador no válido." });
  }
  if (!ESTADOS_MANUALES.includes(estado)) {
    return res.status(400).json({ error: "Estado no permitido." });
  }
  try {
    const [filas] = await pool.query("SELECT estado FROM solicitudes WHERE id = ?", [id]);
    if (filas.length === 0) {
      return res.status(404).json({ error: "Solicitud no encontrada." });
    }
    if (filas[0].estado === "cotizada") {
      return res
        .status(409)
        .json({ error: "Una solicitud cotizada ya no se cambia manualmente." });
    }
    await pool.query("UPDATE solicitudes SET estado = ? WHERE id = ?", [estado, id]);
    res.json({ id, estado });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "No se pudo actualizar el estado." });
  }
});

router.post("/solicitudes", async (req, res) => {
  const origen = req.body?.origen;
  if (!["presencial", "whatsapp"].includes(origen)) {
    return res.status(400).json({ error: "Origen no válido." });
  }
  const { error, datos } = validar(req.body || {}, { permitirMedidas: true });
  if (error) return res.status(400).json({ error });

  try {
    const id = await crearSolicitud(datos, origen);
    res.status(201).json({ id });
  } catch (e) {
    const { estado, mensaje } = errorHttp(e);
    res.status(estado).json({ error: mensaje });
  }
});

router.use(medidasRouter);

router.get("/clientes", async (req, res) => {
  try {
    const [filas] = await pool.query(
      `SELECT c.id, c.nombre, c.telefono, c.correo, c.creado_en,
              (SELECT COUNT(*) FROM solicitudes s WHERE s.cliente_id = c.id) AS solicitudes
       FROM clientes c
       ORDER BY c.creado_en DESC, c.id DESC`
    );
    res.json(filas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "No se pudieron obtener los clientes." });
  }
});

export default router;