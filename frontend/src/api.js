const CLAVE = "confexpress_token_admin";

export const obtenerToken = () => sessionStorage.getItem(CLAVE);
export const guardarToken = (token) => sessionStorage.setItem(CLAVE, token);
export const borrarToken = () => sessionStorage.removeItem(CLAVE);

export async function llamarAdmin(ruta, opciones = {}) {
  const res = await fetch(`/api/admin${ruta}`, {
    ...opciones,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${obtenerToken() ?? ""}`,
    },
  });
  const datos = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(datos.error || "Error en la solicitud.");
    error.estado = res.status;
    throw error;
  }
  return datos;
}