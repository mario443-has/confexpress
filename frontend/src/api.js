const CLAVE = "confexpress_token_admin";

export const obtenerToken = () => sessionStorage.getItem(CLAVE);
export const guardarToken = (token) => sessionStorage.setItem(CLAVE, token);
export const borrarToken = () => sessionStorage.removeItem(CLAVE);

export async function llamarAdmin(ruta, opciones = {}) {
  const esFormData = opciones.body instanceof FormData;

  const headers = {
    ...(esFormData ? {} : { "Content-Type": "application/json" }),
    ...(opciones.headers || {}),
    Authorization: `Bearer ${obtenerToken() ?? ""}`,
  };

  const res = await fetch(`/api/admin${ruta}`, {
    ...opciones,
    headers,
  });

  const datos = await res.json().catch(() => ({}));

  if (!res.ok) {
    const error = new Error(datos.error || "Error en la solicitud.");
    error.estado = res.status;
    throw error;
  }

  return datos;
}
