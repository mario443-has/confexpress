import { Router } from "express";
import { pool } from "../db.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const [filas] = await pool.query(
      "SELECT id, nombre, descripcion, tipo, categoria, precio_referencia, modalidad, a_medida, destacado FROM productos WHERE activo = 1 ORDER BY destacado DESC, categoria, nombre"
    );
    // Solo imagenes visibles (activo = 1) de productos visibles.
    const [imagenes] = await pool.query(
      `SELECT g.id, g.producto_id, g.titulo, g.descripcion, g.ruta_imagen
       FROM galeria_imagenes g
       JOIN productos p ON p.id = g.producto_id
       WHERE g.activo = 1 AND p.activo = 1
       ORDER BY g.orden, g.id`
    );

    res.json(
      filas.map((producto) => ({
        ...producto,
        imagenes: imagenes
          .filter((imagen) => imagen.producto_id === producto.id)
          .map(({ producto_id, ...resto }) => resto),
      }))
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "No se pudo obtener el catálogo." });
  }
});

export default router;