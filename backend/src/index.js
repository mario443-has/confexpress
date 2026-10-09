import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { pool } from "./db.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/salud", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true, base_de_datos: "conectada" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ ok: false, error: error.code || "Error de conexión" });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`ConfeXpress backend en http://localhost:${PORT}`);
});
