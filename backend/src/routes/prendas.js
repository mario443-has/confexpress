import { Router } from "express";
import { pool } from "../db.js";

const router = Router();

class ErrorValidacion extends Error {}

function entero(valor, minimo, maximo, mensaje) {
  if (valor === "" || valor === null || valor === undefined) throw new ErrorValidacion(mensaje);
  const n = Number(valor);
  if (!Number.isInteger(n) || n < minimo || n > maximo) throw new ErrorValidacion(mensaje);
  return n;
}

function validar(cuerpo) {
  const linea = cuerpo.linea ? String(cuerpo.linea) : null;
  const genero = cuerpo.genero ? String(cuerpo.genero) : null;
  if (linea !== null && !["diario", "deportes"].includes(linea)) {
    throw new ErrorValidacion("La línea debe ser diario o deportes.");
  }
  if (genero !== null && !["nino", "nina", "todos"].includes(genero)) {
    throw new ErrorValidacion("El género no es válido.");
  }
  const admiteMarquilla = cuerpo.admite_marquilla === true ? 1 : 0;
  const dias =
    cuerpo.dias_encargo === "" || cuerpo.dias_encargo === null || cuerpo.dias_encargo === undefined
      ? null
      : entero(cuerpo.dias_encargo, 0, 365, "Los días de encargo deben ser un número entero entre 0 y 365.");

  const tallasEntrada = Array.isArray(cuerpo.tallas) ? cuerpo.tallas : [];
  if (tallasEntrada.length > 40) throw new ErrorValidacion("Máximo 40 tallas por prenda.");
  const vistas = new Set();
  const tallas = [];
  for (const [i, t] of tallasEntrada.entries()) {
    const nombre = String(t.talla ?? "").trim();
    if (!nombre || nombre.length > 20) {
      throw new ErrorValidacion(`Talla ${i + 1}: escribe la talla (máximo 20 caracteres).`);
    }
    const clave = nombre.toLowerCase();
    if (vistas.has(clave)) throw new ErrorValidacion(`La talla "${nombre}" está repetida.`);
    vistas.add(clave);
    const precio = entero(t.precio, 0, 100000000, `Talla ${nombre}: escribe el precio en pesos (número entero).`);
    const cantidad = entero(
      t.cantidad === "" || t.cantidad === undefined ? 0 : t.cantidad,
      0,
      100000,
      `Talla ${nombre}: la cantidad debe ser un número entero de 0 en adelante.`
    );
    tallas.push({ nombre, precio, cantidad });
  }

  const colegiosEntrada = Array.isArray(cuerpo.colegios) ? cuerpo.colegios : [];
  if (colegiosEntrada.length > 300) throw new ErrorValidacion("Demasiados colegios en una prenda.");
  const idsVistos = new Set();
  const colegios = [];
  for (const c of colegiosEntrada) {
    const colegioId = Number(c.colegio_id);
    if (!Number.isInteger(colegioId) || colegioId < 1) throw new ErrorValidacion("Colegio no válido.");
    if (idsVistos.has(colegioId)) continue;
    idsVistos.add(colegioId);
    colegios.push({ colegioId, esOpcional: c.es_opcional === true ? 1 : 0 });
  }

  return { linea, genero, admiteMarquilla, dias, tallas, colegios };
}

router.get("/prendas", async (_req, res) => {
  try {
    const [productos] = await pool.query(
      "SELECT id, linea, genero, admite_marquilla, dias_encargo FROM productos"
    );
    const [tallas] = await pool.query(
      "SELECT producto_id, talla, precio, cantidad FROM producto_tallas ORDER BY producto_id, id"
    );
    const [colegios] = await pool.query(
      "SELECT producto_id, colegio_id, es_opcional FROM colegio_productos ORDER BY producto_id, colegio_id"
    );
    res.json(
      productos.map((p) => ({
        id: p.id,
        linea: p.linea,
        genero: p.genero,
        admite_marquilla: Boolean(p.admite_marquilla),
        dias_encargo: p.dias_encargo,
        tallas: tallas
          .filter((t) => t.producto_id === p.id)
          .map((t) => ({ talla: t.talla, precio: Number(t.precio), cantidad: Number(t.cantidad) })),
        colegios: colegios
          .filter((c) => c.producto_id === p.id)
          .map((c) => ({ colegio_id: c.colegio_id, es_opcional: Boolean(c.es_opcional) })),
      }))
    );
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudieron cargar los datos de las prendas." });
  }
});

router.put("/prendas/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: "Producto no válido." });
  }
  let datos;
  try {
    datos = validar(req.body || {});
  } catch (e) {
    if (e instanceof ErrorValidacion) return res.status(400).json({ error: e.message });
    throw e;
  }

  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();
    const [filas] = await conexion.query("SELECT id FROM productos WHERE id = ? FOR UPDATE", [id]);
    if (filas.length === 0) {
      await conexion.rollback();
      return res.status(404).json({ error: "El producto no existe." });
    }
    await conexion.query(
      "UPDATE productos SET linea = ?, genero = ?, admite_marquilla = ?, dias_encargo = ? WHERE id = ?",
      [datos.linea, datos.genero, datos.admiteMarquilla, datos.dias, id]
    );
    await conexion.query("DELETE FROM producto_tallas WHERE producto_id = ?", [id]);
    for (const t of datos.tallas) {
      await conexion.query(
        "INSERT INTO producto_tallas (producto_id, talla, precio, cantidad) VALUES (?, ?, ?, ?)",
        [id, t.nombre, t.precio, t.cantidad]
      );
    }
    await conexion.query("DELETE FROM colegio_productos WHERE producto_id = ?", [id]);
    for (const c of datos.colegios) {
      await conexion.query(
        "INSERT INTO colegio_productos (colegio_id, producto_id, es_opcional) VALUES (?, ?, ?)",
        [c.colegioId, id, c.esOpcional]
      );
    }
    await conexion.commit();
    res.json({ id });
  } catch (e) {
    await conexion.rollback();
    if (e.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({ error: "Uno de los colegios seleccionados no existe." });
    }
    console.error(e);
    res.status(500).json({ error: "No se pudieron guardar las tallas y los colegios." });
  } finally {
    conexion.release();
  }
});

export default router;