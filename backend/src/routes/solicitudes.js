import { Router } from "express";
import { validar, crearSolicitud, errorHttp } from "../solicitudesServicio.js";

const router = Router();

router.post("/", async (req, res) => {
  const { error, datos } = validar(req.body || {});
  if (error) return res.status(400).json({ error });

  try {
    const id = await crearSolicitud(datos, "web");
    res.status(201).json({ id });
  } catch (e) {
    const { estado, mensaje } = errorHttp(e);
    res.status(estado).json({ error: mensaje });
  }
});

export default router;