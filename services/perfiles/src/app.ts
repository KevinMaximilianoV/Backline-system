import { crearApp, crearAutenticacion, leerLlave } from "@backline/comun";
import type { Express } from "express";
import { env } from "./config/env";
import { pool } from "./db/pool";
import { rutasBandas } from "./modulos/bandas/bandas.rutas";
import { rutasCatalogos } from "./modulos/catalogos/catalogos.rutas";
import { rutasForos } from "./modulos/foros/foros.rutas";

/**
 * Arma la aplicación sin abrir el puerto (server.ts lo abre).
 * Todo lo que cuelga de /api/v1 exige un token válido; /salud no.
 */
export function crearAppPerfiles(): Express {
  const autenticar = crearAutenticacion(leerLlave(env.JWT_LLAVE_PUBLICA, "llave pública de los tokens"));

  return crearApp({
    servicio: "perfiles",
    pool,
    rutas: (app) => {
      app.use("/api/v1", autenticar);
      app.use("/api/v1/catalogos", rutasCatalogos);
      app.use("/api/v1/bandas", rutasBandas);
      app.use("/api/v1/foros", rutasForos);
    },
  });
}
