import { Router } from "express";
import { pool } from "../db.js";
import multer from "multer";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const router = Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const carpetaEscudos = path.resolve(__dirname, "../../uploads/escudos");
fs.mkdirSync(carpetaEscudos, { recursive: true });

const extensiones = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };

const subirEscudo = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, carpetaEscudos),
    filename: (_req, file, cb) => cb(null, `${crypto.randomUUID()}${extensiones[file.mimetype]}`),
  }),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!extensiones[file.mimetype]) {
      return cb(new Error("Solo se permiten imágenes JPG, PNG o WEBP."));
    }
    cb(null, true);
  },
});

function borrarArchivo(ruta) {
  if (!ruta || !ruta.startsWith("/uploads/escudos/")) return;
  const archivo = path.join(carpetaEscudos, path.basename(ruta));
  if (fs.existsSync(archivo)) fs.unlinkSync(archivo);
}

function nombreValido(valor) {
  const nombre = String(valor ?? "").trim();
  return nombre.length >= 2 && nombre.length <= 120 ? nombre : null;
}

router.get("/colegios", async (_req, res) => {
  try {
    const [filas] = await pool.query(
      `SELECT c.id, c.nombre, c.escudo, c.activo,
              (SELECT COUNT(*) FROM colegio_productos cp WHERE cp.colegio_id = c.id) AS prendas
       FROM colegios c
       ORDER BY c.activo DESC, c.nombre`
    );
    res.json(filas.map((f) => ({ ...f, activo: Boolean(f.activo), prendas: Number(f.prendas) })));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudieron cargar los colegios." });
  }
});

router.post("/colegios", async (req, res) => {
  const nombre = nombreValido(req.body?.nombre);
  if (!nombre) {
    return res.status(400).json({ error: "Escribe el nombre del colegio (2 a 120 caracteres)." });
  }
  try {
    const [r] = await pool.query("INSERT INTO colegios (nombre) VALUES (?)", [nombre]);
    res.status(201).json({ id: r.insertId });
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Ya existe un colegio con ese nombre." });
    }
    console.error(e);
    res.status(500).json({ error: "No se pudo crear el colegio." });
  }
});

router.put("/colegios/:id", async (req, res) => {
  const id = Number(req.params.id);
  const nombre = nombreValido(req.body?.nombre);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: "Colegio no válido." });
  }
  if (!nombre) {
    return res.status(400).json({ error: "Escribe el nombre del colegio (2 a 120 caracteres)." });
  }
  try {
    const [r] = await pool.query("UPDATE colegios SET nombre = ? WHERE id = ?", [nombre, id]);
    if (!r.affectedRows) return res.status(404).json({ error: "El colegio no existe." });
    res.json({ id, nombre });
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Ya existe un colegio con ese nombre." });
    }
    console.error(e);
    res.status(500).json({ error: "No se pudo actualizar el colegio." });
  }
});

// Un colegio no se borra: se desactiva y deja de verse en el catálogo público.
router.patch("/colegios/:id/estado", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: "Colegio no válido." });
  }
  if (typeof req.body?.activo !== "boolean") {
    return res.status(400).json({ error: "Falta indicar si está activo." });
  }
  try {
    const [r] = await pool.query("UPDATE colegios SET activo = ? WHERE id = ?", [req.body.activo ? 1 : 0, id]);
    if (!r.affectedRows) return res.status(404).json({ error: "El colegio no existe." });
    res.json({ id, activo: req.body.activo });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo cambiar el estado del colegio." });
  }
});

router.post(
  "/colegios/:id/escudo",
  (req, res, next) => {
    subirEscudo.single("escudo")(req, res, (error) => {
      if (error) {
        const mensaje =
          error.code === "LIMIT_FILE_SIZE"
            ? "El escudo no puede pesar más de 2 MB."
            : error.message || "No se pudo subir el escudo.";
        return res.status(400).json({ error: mensaje });
      }
      next();
    });
  },
  async (req, res) => {
    const archivo = req.file;
    const quitarNuevo = () => archivo && fs.existsSync(archivo.path) && fs.unlinkSync(archivo.path);
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id < 1) {
        quitarNuevo();
        return res.status(400).json({ error: "Colegio no válido." });
      }
      if (!archivo) {
        return res.status(400).json({ error: "Selecciona una imagen." });
      }
      const [filas] = await pool.query("SELECT escudo FROM colegios WHERE id = ?", [id]);
      if (filas.length === 0) {
        quitarNuevo();
        return res.status(404).json({ error: "El colegio no existe." });
      }
      const ruta = `/uploads/escudos/${archivo.filename}`;
      await pool.query("UPDATE colegios SET escudo = ? WHERE id = ?", [ruta, id]);
      borrarArchivo(filas[0].escudo);
      res.json({ id, escudo: ruta });
    } catch (e) {
      quitarNuevo();
      console.error(e);
      res.status(500).json({ error: "No se pudo guardar el escudo." });
    }
  }
);

export default router;