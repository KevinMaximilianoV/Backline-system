import { crearApp, crearAutenticacion, leerLlave } from "@backline/comun";
import type { Express } from "express";
import { env } from "./config/env";
import { pool } from "./db/pool";
import { rutasFranjas } from "./modulos/franjas/franjas.rutas";
import { rutasSolicitudes } from "./modulos/solicitudes/solicitudes.rutas";

/**
 * Arma la aplicación sin abrir el puerto (server.ts lo abre).
 * Todo /api/v1 exige token: Booking no confía en que el Gateway ya lo revisó.
 */
export function crearAppBooking(): Express {
  const autenticar = crearAutenticacion(leerLlave(env.JWT_LLAVE_PUBLICA, "llave pública de los tokens"));

  return crearApp({
    servicio: "booking",
    pool,
    rutas: (app) => {
      app.use("/api/v1", autenticar);
      app.use("/api/v1/franjas", rutasFranjas);
      app.use("/api/v1/solicitudes", rutasSolicitudes);
    },
  });
}
