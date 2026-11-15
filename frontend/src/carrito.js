import { useEffect, useState } from "react";

// Carrito "Mi solicitud": NO es una tienda, no cobra. Solo junta las prendas
// que el cliente quiere cotizar y las guarda en el navegador (localStorage).

const CLAVE_ALMACEN = "confexpress_carrito";
const EVENTO = "carrito-cambio";
const MAX_CANTIDAD = 10000;
// El backend acepta como maximo 20 items por solicitud.
export const MAX_ITEMS = 20;

export function leerCarrito() {
  try {
    const crudo = window.localStorage.getItem(CLAVE_ALMACEN);
    const lista = crudo ? JSON.parse(crudo) : [];
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

function guardar(lista) {
  try {
    window.localStorage.setItem(CLAVE_ALMACEN, JSON.stringify(lista));
  } catch {
    // Si el navegador no deja guardar, no se rompe nada.
  }
  window.dispatchEvent(new Event(EVENTO));
}

// prenda: { producto_id, nombre, colegio, talla, cantidad, con_marquilla,
//           nombre_marquilla, precio, dias_encargo, listo }
export function agregarAlCarrito(prenda) {
  const lista = leerCarrito();
  const clave = [
    prenda.producto_id,
    prenda.talla || "",
    prenda.con_marquilla ? 1 : 0,
    String(prenda.nombre_marquilla || "").toLowerCase(),
    prenda.colegio || "",
  ].join("|");
  const cantidad = Math.max(1, Math.min(MAX_CANTIDAD, Math.floor(Number(prenda.cantidad) || 1)));

  const existente = lista.find((i) => i.clave === clave);
  if (existente) {
    existente.cantidad = Math.min(MAX_CANTIDAD, existente.cantidad + cantidad);
  } else {
    if (lista.length >= MAX_ITEMS) {
      return { ok: false, error: `Tu solicitud ya tiene ${MAX_ITEMS} prendas, que es el máximo. Envíala y haz otra para el resto.` };
    }
    lista.push({ ...prenda, clave, cantidad });
  }
  guardar(lista);
  return { ok: true };
}

export function cambiarCantidad(clave, cantidad) {
  const n = Math.max(1, Math.min(MAX_CANTIDAD, Math.floor(Number(cantidad) || 1)));
  guardar(leerCarrito().map((i) => (i.clave === clave ? { ...i, cantidad: n } : i)));
}

export function quitarDelCarrito(clave) {
  guardar(leerCarrito().filter((i) => i.clave !== clave));
}

export function vaciarCarrito() {
  guardar([]);
}

// Plazo estimado (dias): el mayor entre las prendas que NO estan listas
// para entregar. Devuelve null si todo esta listo o no hay plazo definido.
export function plazoEstimadoDias(lista) {
  const dias = lista
    .filter((i) => !i.listo && i.dias_encargo !== null && i.dias_encargo !== undefined)
    .map((i) => Number(i.dias_encargo));
  return dias.length > 0 ? Math.max(...dias) : null;
}

// Convierte el carrito a los items que acepta POST /api/solicitudes.
export function itemsParaSolicitud(lista) {
  return lista.map((i) => {
    const partes = [];
    if (i.colegio) partes.push(`Colegio: ${i.colegio}`);
    if (i.con_marquilla) {
      partes.push(i.nombre_marquilla ? `Marquilla: ${i.nombre_marquilla}` : "Marquilla personalizada");
    }
    return {
      producto_id: i.producto_id,
      descripcion: i.nombre,
      cantidad: i.cantidad,
      talla: i.talla || "",
      especificaciones: partes.join(". "),
      con_marquilla: i.con_marquilla === true,
    };
  });
}

// Hook: devuelve el carrito y se actualiza solo cuando cambia.
export function useCarrito() {
  const [lista, setLista] = useState(() => leerCarrito());
  useEffect(() => {
    const actualizar = () => setLista(leerCarrito());
    window.addEventListener(EVENTO, actualizar);
    window.addEventListener("storage", actualizar);
    return () => {
      window.removeEventListener(EVENTO, actualizar);
      window.removeEventListener("storage", actualizar);
    };
  }, []);
  return lista;
}

// Precio de la marquilla personalizada: lo define el administrador en el panel.
// Se pide una sola vez por visita a la pagina y se comparte entre los componentes.
let precioMarquillaCache = null;
let precioMarquillaPromesa = null;

export function usePrecioMarquilla() {
  const [precio, setPrecio] = useState(precioMarquillaCache);
  useEffect(() => {
    if (!precioMarquillaPromesa) {
      precioMarquillaPromesa = fetch("/api/configuracion")
        .then((res) => (res.ok ? res.json() : null))
        .then((datos) => {
          const n = datos ? Number(datos.precio_marquilla) : NaN;
          if (Number.isFinite(n)) precioMarquillaCache = n;
        })
        .catch(() => {});
    }
    precioMarquillaPromesa.then(() => setPrecio(precioMarquillaCache));
  }, []);
  return precio;
}

// Separa lo que tiene precio final de lo aproximado. La marquilla siempre es precio final.
// Una prenda sin precio (o guardada antes de existir este dato) cuenta como aproximada.
export function resumenPrecios(lista, precioMarquilla) {
  const marquilla = Number(precioMarquilla) || 0;
  let fijo = 0;
  let aproximado = 0;
  let sinPrecio = false;
  for (const i of lista) {
    const cantidad = Number(i.cantidad) || 0;
    if (i.con_marquilla) fijo += marquilla * cantidad;
    if (i.precio === null || i.precio === undefined || i.precio === "") {
      sinPrecio = true;
      continue;
    }
    const subtotal = Number(i.precio) * cantidad;
    if (i.precio_aproximado === false) fijo += subtotal;
    else aproximado += subtotal;
  }
  return { fijo, aproximado, sinPrecio, todoFinal: lista.length > 0 && aproximado === 0 && !sinPrecio };
}