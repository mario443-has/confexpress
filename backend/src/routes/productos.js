import { Router } from "express";
import { pool } from "../db.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const [filas] = await pool.query(
      "SELECT id, nombre, descripcion, tipo, categoria, precio_referencia, modalidad, a_medida, destacado FROM productos WHERE activo = 1 ORDER BY destacado DESC, categoria, nombre"
    );
    res.json(filas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "No se pudo obtener el catálogo." });
  }
});

export default router;