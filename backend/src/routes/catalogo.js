import { Router } from "express";
import { pool } from "../db.js";
import { requireAdmin } from "../auth.js";
import multer from "multer";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const router = Router();

router.use(requireAdmin);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const carpetaImagenes = path.resolve(
  __dirname,
  "../../uploads/catalogo"
);

fs.mkdirSync(carpetaImagenes, { recursive: true });

const extensionesPermitidas = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const almacenamiento = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, carpetaImagenes);
  },
  filename: (_req, file, callback) => {
    const extension = extensionesPermitidas[file.mimetype];
    callback(null, `${crypto.randomUUID()}${extension}`);
  },
});

const subirImagenes = multer({
  storage: almacenamiento,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 8,
  },
  fileFilter: (_req, file, callback) => {
    if (!extensionesPermitidas[file.mimetype]) {
      return callback(
        new Error("Solo se permiten imágenes JPG, PNG o WEBP.")
      );
    }

    callback(null, true);
  },
});

function eliminarArchivos(files = []) {
  for (const file of files) {
    if (file?.path && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
  }
}

function convertirBooleano(valor) {
  return valor === true || valor === 1 || valor === "1" ||
    valor === "true" || valor === "on";
}

function validarProducto(datos) {
  const nombre = String(datos.nombre || "").trim();
  const tipo = datos.tipo;
  const modalidad = datos.modalidad || "requiere_consulta";

  if (!nombre || nombre.length > 120) {
    throw new Error("El nombre es obligatorio y no puede superar 120 caracteres.");
  }

  if (!["producto", "servicio"].includes(tipo)) {
    throw new Error("El tipo debe ser producto o servicio.");
  }

  if (!["entrega_inmediata", "por_encargo", "requiere_consulta"].includes(modalidad)) {
    throw new Error("La modalidad seleccionada no es válida.");
  }

  let precio = null;

  if (datos.precio_referencia !== null &&
      datos.precio_referencia !== undefined &&
      datos.precio_referencia !== "") {
    precio = Number(datos.precio_referencia);

    if (!Number.isFinite(precio) || precio < 0) {
      throw new Error("El precio debe ser un número igual o mayor que cero.");
    }
  }

  return {
    nombre,
    descripcion: datos.descripcion || null,
    tipo,
    categoria: datos.categoria || null,
    precio,
    modalidad,
    a_medida: convertirBooleano(datos.a_medida) ? 1 : 0,
    destacado: convertirBooleano(datos.destacado) ? 1 : 0,
  };
}

// Consultar todos los productos, incluidos los inactivos.
router.get("/", async (_req, res) => {
  try {
    const [productos] = await pool.query(
      `SELECT id, nombre, descripcion, tipo, categoria,
              precio_referencia, modalidad, a_medida,
              activo, destacado, creado_en
       FROM productos
       ORDER BY activo DESC, destacado DESC, categoria, nombre`
    );

    const [imagenes] = await pool.query(
      `SELECT id, producto_id, titulo, descripcion,
              ruta_imagen, orden, activo
       FROM galeria_imagenes
       WHERE producto_id IS NOT NULL
       ORDER BY orden, id`
    );

    const productosConImagenes = productos.map((producto) => ({
      ...producto,
      imagenes: imagenes.filter(
        (imagen) => imagen.producto_id === producto.id
      ),
    }));

    res.json(productosConImagenes);
  } catch (error) {
    console.error("Error consultando catálogo:", error);
    res.status(500).json({ error: "No se pudo consultar el catálogo." });
  }
});

// Crear un producto.
router.post("/", async (req, res) => {
  try {
    const datos = validarProducto(req.body);

    const [resultado] = await pool.query(
      `INSERT INTO productos
       (nombre, descripcion, tipo, categoria, precio_referencia,
        modalidad, a_medida, destacado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        datos.nombre,
        datos.descripcion,
        datos.tipo,
        datos.categoria,
        datos.precio,
        datos.modalidad,
        datos.a_medida,
        datos.destacado,
      ]
    );

    res.status(201).json({
      mensaje: "Producto creado correctamente.",
      id: resultado.insertId,
    });
  } catch (error) {
    console.error("Error creando producto:", error);
    res.status(400).json({ error: error.message || "No se pudo crear el producto." });
  }
});

// Editar un producto.
router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "Identificador no válido." });
    }

    const datos = validarProducto(req.body);

    const [resultado] = await pool.query(
      `UPDATE productos
       SET nombre = ?, descripcion = ?, tipo = ?, categoria = ?,
           precio_referencia = ?, modalidad = ?, a_medida = ?,
           destacado = ?
       WHERE id = ?`,
      [
        datos.nombre,
        datos.descripcion,
        datos.tipo,
        datos.categoria,
        datos.precio,
        datos.modalidad,
        datos.a_medida,
        datos.destacado,
        id,
      ]
    );

    if (!resultado.affectedRows) {
      return res.status(404).json({ error: "Producto no encontrado." });
    }

    res.json({ mensaje: "Producto actualizado correctamente." });
  } catch (error) {
    console.error("Error actualizando producto:", error);
    res.status(400).json({ error: error.message || "No se pudo actualizar el producto." });
  }
});

// Activar o desactivar un producto sin borrar su historial.
router.patch("/:id/estado", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const activo = convertirBooleano(req.body.activo) ? 1 : 0;

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "Identificador no válido." });
    }

    const [resultado] = await pool.query(
      "UPDATE productos SET activo = ? WHERE id = ?",
      [activo, id]
    );

    if (!resultado.affectedRows) {
      return res.status(404).json({ error: "Producto no encontrado." });
    }

    res.json({
      mensaje: activo ? "Producto activado." : "Producto desactivado.",
    });
  } catch (error) {
    console.error("Error cambiando estado:", error);
    res.status(500).json({ error: "No se pudo cambiar el estado del producto." });
  }
});

// Subir hasta ocho imágenes para un producto.
router.post("/:id/imagenes", (req, res, next) => {
  subirImagenes.array("imagenes", 8)(req, res, (error) => {
    if (error) {
      return res.status(400).json({
        error: error.message || "No se pudieron subir las imágenes.",
      });
    }

    next();
  });
}, async (req, res) => {
  const archivos = req.files || [];

  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      eliminarArchivos(archivos);
      return res.status(400).json({ error: "Identificador no válido." });
    }

    if (!archivos.length) {
      return res.status(400).json({ error: "Selecciona al menos una imagen." });
    }

    const [productos] = await pool.query(
      "SELECT id FROM productos WHERE id = ?",
      [id]
    );

    if (!productos.length) {
      eliminarArchivos(archivos);
      return res.status(404).json({ error: "Producto no encontrado." });
    }

    const conexion = await pool.getConnection();

    try {
      await conexion.beginTransaction();

      for (let i = 0; i < archivos.length; i++) {
        const archivo = archivos[i];
        const titulo = path.basename(
          archivo.originalname,
          path.extname(archivo.originalname)
        ).slice(0, 120);

        await conexion.query(
          `INSERT INTO galeria_imagenes
           (producto_id, titulo, ruta_imagen, orden, activo)
           VALUES (?, ?, ?, ?, 1)`,
          [
            id,
            titulo || "Imagen del producto",
            `/uploads/catalogo/${archivo.filename}`,
            i,
          ]
        );
      }

      await conexion.commit();
      res.status(201).json({
        mensaje: "Imágenes subidas correctamente.",
        cantidad: archivos.length,
      });
    } catch (error) {
      await conexion.rollback();
      throw error;
    } finally {
      conexion.release();
    }
  } catch (error) {
    eliminarArchivos(archivos);
    console.error("Error subiendo imágenes:", error);
    res.status(500).json({ error: "No se pudieron guardar las imágenes." });
  }
});

// Editar título, descripción y orden de una imagen.
router.patch("/imagenes/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { titulo, descripcion, orden } = req.body;

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "Identificador no válido." });
    }

    if (titulo !== undefined &&
        (typeof titulo !== "string" || titulo.trim().length > 120)) {
      return res.status(400).json({ error: "El título no puede superar 120 caracteres." });
    }

    if (descripcion !== undefined &&
        descripcion !== null &&
        (typeof descripcion !== "string" || descripcion.length > 255)) {
      return res.status(400).json({ error: "La descripción no puede superar 255 caracteres." });
    }

    if (orden !== undefined &&
        (!Number.isInteger(Number(orden)) || Number(orden) < 0)) {
      return res.status(400).json({ error: "El orden debe ser un número igual o mayor que cero." });
    }

    const [resultado] = await pool.query(
      `UPDATE galeria_imagenes
       SET titulo = COALESCE(?, titulo),
           descripcion = COALESCE(?, descripcion),
           orden = COALESCE(?, orden)
       WHERE id = ?`,
      [
        titulo === undefined ? null : titulo.trim(),
        descripcion === undefined ? null : descripcion,
        orden === undefined ? null : Number(orden),
        id,
      ]
    );

    if (!resultado.affectedRows) {
      return res.status(404).json({ error: "Imagen no encontrada." });
    }

    res.json({ mensaje: "Imagen actualizada correctamente." });
  } catch (error) {
    console.error("Error actualizando imagen:", error);
    res.status(500).json({ error: "No se pudo actualizar la imagen." });
  }
});

// Activar o desactivar una imagen sin eliminarla físicamente.
router.patch("/imagenes/:id/estado", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const activo = convertirBooleano(req.body.activo) ? 1 : 0;

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "Identificador no válido." });
    }

    const [resultado] = await pool.query(
      "UPDATE galeria_imagenes SET activo = ? WHERE id = ?",
      [activo, id]
    );

    if (!resultado.affectedRows) {
      return res.status(404).json({ error: "Imagen no encontrada." });
    }

    res.json({
      mensaje: activo ? "Imagen activada." : "Imagen desactivada.",
    });
  } catch (error) {
    console.error("Error cambiando estado de imagen:", error);
    res.status(500).json({ error: "No se pudo cambiar el estado de la imagen." });
  }
});

export default router;
