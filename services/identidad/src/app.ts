import { crearApp, crearAutenticacion, leerLlave } from "@backline/comun";
import type { Express } from "express";
import { env } from "./config/env";
import { pool } from "./db/pool";
import { rutasSesiones } from "./modulos/sesiones/sesiones.rutas";
import { rutasUsuarios } from "./modulos/usuarios/usuarios.rutas";

/** Arma la aplicación sin abrir el puerto (server.ts lo abre). */
export function crearAppIdentidad(): Express {
  const autenticar = crearAutenticacion(leerLlave(env.JWT_LLAVE_PUBLICA, "llave pública de los tokens"));

  return crearApp({
    servicio: "identidad",
    pool,
    // Detrás del Gateway, la IP real del cliente llega en X-Forwarded-For (la usa el límite de intentos)
    confiarEnProxy: true,
    rutas: (app) => {
      app.use("/api/v1/sesiones", rutasSesiones);
      app.use("/api/v1/usuarios", rutasUsuarios(autenticar));
    },
  });
}
