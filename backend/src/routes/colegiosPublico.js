import { Router } from "express";
import { pool } from "../db.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const [filas] = await pool.query(
      `SELECT c.id, c.nombre, c.escudo,
              (SELECT COUNT(*) FROM colegio_productos cp
                 JOIN productos p ON p.id = cp.producto_id
                WHERE cp.colegio_id = c.id AND p.activo = 1) AS prendas
       FROM colegios c
       WHERE c.activo = 1
       ORDER BY c.nombre`
    );
    res.json(filas.map((f) => ({ ...f, prendas: Number(f.prendas) })));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudieron cargar los colegios." });
  }
});

router.get("/prendas-ids", async (_req, res) => {
  try {
    const [filas] = await pool.query(
      `SELECT DISTINCT cp.producto_id
       FROM colegio_productos cp
       JOIN colegios c ON c.id = cp.colegio_id
       WHERE c.activo = 1`
    );
    res.json(filas.map((f) => f.producto_id));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo cargar la lista." });
  }
});
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: "Colegio no válido." });
  }
  try {
    const [colegios] = await pool.query(
      "SELECT id, nombre, escudo FROM colegios WHERE id = ? AND activo = 1",
      [id]
    );
    if (colegios.length === 0) {
      return res.status(404).json({ error: "El colegio no existe." });
    }
    const [prendas] = await pool.query(
      `SELECT p.id, p.nombre, p.descripcion, p.linea, p.genero, p.a_medida,
              p.admite_marquilla, p.dias_encargo, p.precio_referencia, p.precio_aproximado, cp.es_opcional
       FROM colegio_productos cp
       JOIN productos p ON p.id = cp.producto_id
       WHERE cp.colegio_id = ? AND p.activo = 1
       ORDER BY p.linea, cp.es_opcional, p.nombre`,
      [id]
    );
    const ids = prendas.map((p) => p.id);
    let tallas = [];
    let imagenes = [];
    if (ids.length > 0) {
      [tallas] = await pool.query(
        "SELECT producto_id, talla, precio, cantidad FROM producto_tallas WHERE producto_id IN (?) ORDER BY producto_id, id",
        [ids]
      );
      [imagenes] = await pool.query(
        "SELECT producto_id, ruta_imagen, titulo FROM galeria_imagenes WHERE activo = 1 AND producto_id IN (?) ORDER BY producto_id, orden, id",
        [ids]
      );
    }
    res.json({
      ...colegios[0],
      prendas: prendas.map((p) => ({
        id: p.id,
        nombre: p.nombre,
        descripcion: p.descripcion,
        linea: p.linea,
        genero: p.genero,
        a_medida: Boolean(p.a_medida),
        admite_marquilla: Boolean(p.admite_marquilla),
        dias_encargo: p.dias_encargo,
        precio_referencia: p.precio_referencia === null ? null : Number(p.precio_referencia),
        precio_aproximado: Boolean(p.precio_aproximado),
        es_opcional: Boolean(p.es_opcional),
        imagenes: imagenes
          .filter((i) => i.producto_id === p.id)
          .map((i) => ({ ruta: i.ruta_imagen, titulo: i.titulo })),
        tallas: tallas
          .filter((t) => t.producto_id === p.id)
          .map((t) => ({ talla: t.talla, precio: Number(t.precio), cantidad: Number(t.cantidad) })),
      })),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo cargar el colegio." });
  }
});

export default router;