import { Router } from "express";
import { pool } from "../db.js";

// Ruta publica: solo entrega los datos del negocio que la pagina necesita mostrar.
const router = Router();

async function leerPrecioMarquilla() {
  const [filas] = await pool.query("SELECT valor FROM configuracion WHERE clave = 'precio_marquilla'");
  const n = filas.length > 0 ? Number(filas[0].valor) : NaN;
  return Number.isFinite(n) ? n : 3000;
}

router.get("/", async (_req, res) => {
  try {
    res.json({ precio_marquilla: await leerPrecioMarquilla() });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo cargar la configuración." });
  }
});

// Ruta del panel: se monta dentro de admin.js, que ya exige requireAdmin.
export const configuracionAdminRouter = Router();

configuracionAdminRouter.put("/configuracion/marquilla", async (req, res) => {
  const crudo = req.body ? req.body.precio : undefined;
  const n = Number(crudo);
  if (crudo === "" || crudo === null || crudo === undefined || !Number.isInteger(n) || n < 0 || n > 10000000) {
    return res.status(400).json({ error: "El precio de la marquilla debe ser un número entero en pesos." });
  }
  try {
    await pool.query(
      "INSERT INTO configuracion (clave, valor) VALUES ('precio_marquilla', ?) ON DUPLICATE KEY UPDATE valor = VALUES(valor)",
      [String(n)]
    );
    res.json({ precio_marquilla: n });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo guardar el precio de la marquilla." });
  }
});

export default router;