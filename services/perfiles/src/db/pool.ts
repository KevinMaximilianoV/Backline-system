import { crearBaseDatos } from "@backline/comun";
import { env } from "../config/env";

/** Conexión a backline_perfiles con el usuario svc_perfiles, que no puede entrar a otras bases. */
export const { pool, consultar, enTransaccion } = crearBaseDatos({
  url: env.DATABASE_URL,
  max: env.DB_POOL_MAX,
  servicio: "perfiles",
});
