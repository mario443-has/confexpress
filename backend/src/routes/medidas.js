import { Router } from "express";
import { pool } from "../db.js";

const router = Router();

async function itemAMedida(id) {
  const [filas] = await pool.query(
    `SELECT d.id, d.producto_id
     FROM detalles_solicitud d
     JOIN productos p ON p.id = d.producto_id
     WHERE d.id = ? AND p.a_medida = 1`,
    [id]
  );
  return filas[0] ?? null;
}

async function cargarCatalogo() {
  const [tipos] = await pool.query("SELECT id, nombre FROM tipos_prenda ORDER BY id");
  const [medidas] = await pool.query(
    "SELECT id, tipo_prenda_id, nombre FROM medidas_prenda ORDER BY tipo_prenda_id, orden"
  );
  return tipos.map((t) => ({
    id: t.id,
    nombre: t.nombre,
    medidas: medidas
      .filter((m) => m.tipo_prenda_id === t.id)
      .map((m) => ({ id: m.id, nombre: m.nombre })),
  }));
}

router.get("/medidas/catalogo", async (req, res) => {
  try {
    const catalogo = await cargarCatalogo();
    const [filas] = await pool.query(
      "SELECT producto_id, tipo_prenda_id FROM producto_prendas ORDER BY producto_id, tipo_prenda_id"
    );
    const precargas = {};
    for (const f of filas) {
      (precargas[f.producto_id] ??= []).push(f.tipo_prenda_id);
    }
    res.json({ catalogo, precargas });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudo cargar el catálogo de medidas." });
  }
});

router.get("/items/:id/medidas", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: "Ítem no válido." });
  }
  try {
    const item = await itemAMedida(id);
    if (!item) {
      return res.status(404).json({ error: "El ítem no existe o no es a la medida." });
    }

    const catalogo = await cargarCatalogo();
    const [guardadas] = await pool.query(
      "SELECT tipo_prenda_id, medida_id, valor FROM medidas_item WHERE detalle_solicitud_id = ? ORDER BY tipo_prenda_id",
      [id]
    );

    let tipos;
    if (guardadas.length > 0) {
      tipos = [...new Set(guardadas.map((g) => g.tipo_prenda_id))];
    } else {
      const [precarga] = await pool.query(
        "SELECT tipo_prenda_id FROM producto_prendas WHERE producto_id = ? ORDER BY tipo_prenda_id",
        [item.producto_id]
      );
      tipos = precarga.map((p) => p.tipo_prenda_id);
    }

    const valores = {};
    for (const g of guardadas) {
      valores[`${g.tipo_prenda_id}-${g.medida_id}`] = String(Number(g.valor));
    }

    res.json({ catalogo, tipos, valores });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudieron cargar las medidas." });
  }
});

router.put("/items/:id/medidas", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: "Ítem no válido." });
  }
  const prendas = req.body?.prendas;
  if (!Array.isArray(prendas) || prendas.length > 10) {
    return res.status(400).json({ error: "Formato de medidas no válido." });
  }

  try {
    const item = await itemAMedida(id);
    if (!item) {
      return res.status(404).json({ error: "El ítem no existe o no es a la medida." });
    }

    const catalogo = await cargarCatalogo();
    const filas = [];
    const vistos = new Set();

    for (const prenda of prendas) {
      const tipo = catalogo.find((t) => t.id === Number(prenda.tipo_prenda_id));
      if (!tipo) {
        return res.status(400).json({ error: "Tipo de prenda no válido." });
      }
      if (!Array.isArray(prenda.medidas)) {
        return res.status(400).json({ error: "Formato de medidas no válido." });
      }
      for (const m of prenda.medidas) {
        const medida = tipo.medidas.find((x) => x.id === Number(m.medida_id));
        if (!medida) {
          return res.status(400).json({ error: `Medida no válida para ${tipo.nombre}.` });
        }
        const valor = Number(String(m.valor).replace(",", "."));
        if (!Number.isFinite(valor) || valor <= 0 || valor > 300) {
          return res.status(400).json({
            error: `${tipo.nombre} · ${medida.nombre}: ingresa un número entre 0 y 300.`,
          });
        }
        const clave = `${tipo.id}-${medida.id}`;
        if (vistos.has(clave)) continue;
        vistos.add(clave);
        filas.push([id, tipo.id, medida.id, Math.round(valor * 10) / 10]);
      }
    }

    const conexion = await pool.getConnection();
    try {
      await conexion.beginTransaction();
      await conexion.query("DELETE FROM medidas_item WHERE detalle_solicitud_id = ?", [id]);
      for (const f of filas) {
        await conexion.query(
          "INSERT INTO medidas_item (detalle_solicitud_id, tipo_prenda_id, medida_id, valor) VALUES (?, ?, ?, ?)",
          f
        );
      }
      await conexion.commit();
    } catch (e) {
      await conexion.rollback();
      throw e;
    } finally {
      conexion.release();
    }

    res.json({ guardadas: filas.length });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "No se pudieron guardar las medidas." });
  }
});

export default router;