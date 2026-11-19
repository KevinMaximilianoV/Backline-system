import { leerEntorno, variables } from "@backline/comun";
import { z } from "zod";

/** Configuración del servicio Identidad, validada al arrancar (ver @backline/comun). */
export const env = leerEntorno(
  z.object({
    NODE_ENV: variables.nodeEnv,
    PORT: variables.puerto(3001),
    DATABASE_URL: variables.urlPostgres,
    DB_POOL_MAX: variables.poolMax,
    JWT_LLAVE_PRIVADA: variables.archivo,
    JWT_LLAVE_PUBLICA: variables.archivo,
    TOKEN_MINUTOS: z.coerce.number({ error: "debe ser un número" }).int().min(5).max(24 * 60).default(60),
    INTENTOS_SESION_POR_MINUTO: z.coerce.number({ error: "debe ser un número" }).int().min(1).max(100).default(5),
    // Costo de bcrypt: cada +1 duplica el tiempo de cálculo. 10 tarda ~70 ms, suficiente para frenar fuerza bruta.
    BCRYPT_COSTO: z.coerce.number({ error: "debe ser un número" }).int().min(4).max(15).default(10),
  }),
);
