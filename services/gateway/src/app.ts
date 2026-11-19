import { ApiError, crearApp, crearAutenticacion, leerLlave } from "@backline/comun";
import type { Express } from "express";
import { env, RUTAS } from "./config/env";
import { rutasDisponibilidad } from "./disponibilidad/disponibilidad";
import { proxyHacia } from "./proxy";

/**
 * API Gateway: el único punto de entrada para los clientes (http://localhost:8080/api/v1).
 * - Enruta cada prefijo a su servicio (proxy.ts) sin leer ni modificar los cuerpos.
 * - Compone respuestas que necesitan varios servicios (disponibilidad).
 * - No reemplaza la autenticación de los servicios: cada uno vuelve a verificar el token,
 *   así que llamar a un servicio directo por su puerto no salta la seguridad.
 */
export function crearAppGateway(): Express {
  const autenticar = crearAutenticacion(leerLlave(env.JWT_LLAVE_PUBLICA, "llave pública de los tokens"));

  return crearApp({
    servicio: "gateway",
    sinCuerpoJson: true,
    saludExtra: async () => {
      // El Gateway está sano solo si alcanza a todos los servicios que tiene detrás
      const servicios = await Promise.all(
        RUTAS.map(async ({ servicio, url }) => {
          try {
            const r = await fetch(`${url}/salud`, { signal: AbortSignal.timeout(2_000) });
            return [servicio, r.ok ? "ok" : `responde ${r.status}`] as const;
          } catch {
            return [servicio, "sin respuesta"] as const;
          }
        }),
      );
      const caidos = servicios.filter(([, estado]) => estado !== "ok");
      if (caidos.length > 0) {
        throw ApiError.noDisponible(`Servicios sin respuesta: ${caidos.map(([s, e]) => `${s} (${e})`).join(", ")}.`);
      }
      return { servicios: Object.fromEntries(servicios) };
    },
    rutas: (app) => {
      app.use("/api/v1/disponibilidad", rutasDisponibilidad(autenticar));
      for (const { servicio, url, prefijos } of RUTAS) app.use(proxyHacia(servicio, url, prefijos));
    },
  });
}
