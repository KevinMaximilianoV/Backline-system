import { ApiError } from "../errores/ApiError";

/**
 * Cliente HTTP para que un servicio llame a otro (por ejemplo, Booking a Perfiles).
 *
 * - Reenvía el token del usuario (propagación de identidad): el servicio llamado aplica
 *   sus propias reglas de permisos, no confía en quien lo llama.
 * - Reenvía el X-Correlation-Id: la petición se puede seguir en el registro de ambos servicios.
 * - Tiene tiempo límite: si el otro servicio no contesta, se responde 503 en lugar de colgarse.
 */
export function crearClienteServicio(opciones: { nombre: string; urlBase: string; tiempoLimiteMs?: number }) {
  const tiempoLimite = opciones.tiempoLimiteMs ?? 3_000;

  return async function obtener<T>(
    ruta: string,
    contexto: { token: string; correlationId: string },
  ): Promise<{ status: number; datos: T | null }> {
    let respuesta: Response;
    try {
      respuesta = await fetch(`${opciones.urlBase}${ruta}`, {
        headers: {
          Authorization: `Bearer ${contexto.token}`,
          "X-Correlation-Id": contexto.correlationId,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(tiempoLimite),
      });
    } catch {
      throw ApiError.noDisponible(`El servicio ${opciones.nombre} no responde. Intenta de nuevo en unos segundos.`);
    }
    if (respuesta.status === 404) return { status: 404, datos: null };
    if (!respuesta.ok) {
      // Un 401/403 aquí significa que el token no alcanza para leer el dato que necesitamos.
      // Un 5xx es un fallo del otro servicio. En ambos casos no es culpa del cliente final.
      throw ApiError.noDisponible(`El servicio ${opciones.nombre} respondió ${respuesta.status} al consultar ${ruta}.`);
    }
    return { status: respuesta.status, datos: (await respuesta.json()) as T };
  };
}

export type ClienteServicio = ReturnType<typeof crearClienteServicio>;
