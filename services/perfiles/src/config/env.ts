import { leerEntorno, variables } from "@backline/comun";
import { z } from "zod";

/** Configuración del servicio Perfiles, validada al arrancar (ver @backline/comun). */
export const env = leerEntorno(
  z.object({
    NODE_ENV: variables.nodeEnv,
    PORT: variables.puerto(3002),
    DATABASE_URL: variables.urlPostgres,
    DB_POOL_MAX: variables.poolMax,
    // Llave pública de Identidad: verifica los tokens, no puede emitirlos
    JWT_LLAVE_PUBLICA: variables.archivo,
  }),
);
