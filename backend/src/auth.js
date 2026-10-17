import crypto from "crypto";

const DURACION_MS = 8 * 60 * 60 * 1000;

function huella(texto) {
  return crypto.createHash("sha256").update(String(texto)).digest();
}

function iguales(a, b) {
  return crypto.timingSafeEqual(huella(a), huella(b));
}

function firmar(expira) {
  return crypto
    .createHmac("sha256", process.env.ADMIN_PASSWORD)
    .update(String(expira))
    .digest("hex");
}

export function verificarPassword(intento) {
  const real = process.env.ADMIN_PASSWORD;
  return Boolean(real) && iguales(intento ?? "", real);
}

export function crearToken() {
  const expira = Date.now() + DURACION_MS;
  return `${expira}.${firmar(expira)}`;
}

export function requireAdmin(req, res, next) {
  if (!process.env.ADMIN_PASSWORD) {
    return res
      .status(500)
      .json({ error: "Falta configurar ADMIN_PASSWORD en el archivo .env del backend." });
  }
  const cabecera = req.headers.authorization || "";
  const token = cabecera.startsWith("Bearer ") ? cabecera.slice(7) : "";
  const [expira, firma] = token.split(".");
  const vigente = Number.isFinite(Number(expira)) && Number(expira) > Date.now();
  if (!expira || !firma || !vigente || !iguales(firma, firmar(expira))) {
    return res.status(401).json({ error: "No autorizado." });
  }
  next();
}