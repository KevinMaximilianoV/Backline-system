import { leerEntorno, variables } from "@backline/comun";
import { z } from "zod";

/** Configuración del servicio Booking, validada al arrancar (ver @backline/comun). */
export const env = leerEntorno(
  z.object({
    NODE_ENV: variables.nodeEnv,
    PORT: variables.puerto(3003),
    DATABASE_URL: variables.urlPostgres,
    DB_POOL_MAX: variables.poolMax,
    JWT_LLAVE_PUBLICA: variables.archivo,
    PERFILES_URL: variables.urlServicio,
  }),
);

/** Las fechas sin hora (desde, hasta) se interpretan en la hora de Querétaro. */
export const ZONA_HORARIA = "America/Mexico_City";
