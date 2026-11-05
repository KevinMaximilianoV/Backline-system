import { z } from "zod";

/**
 * Configuración leída de variables de entorno y validada al arrancar.
 * Si falta algo o tiene formato inválido, el servicio no arranca: es mejor
 * fallar de inmediato con un mensaje claro que fallar después en una petición.
 */
const esquema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce
    .number({ error: "debe ser un número" })
    .int()
    .min(1, "debe estar entre 1 y 65535")
    .max(65535, "debe estar entre 1 y 65535")
    .default(3002),
  DATABASE_URL: z
    .string({ error: "es obligatoria" })
    .regex(/^postgres(ql)?:\/\//, "debe ser una URL de PostgreSQL (postgresql://...)"),
  DB_POOL_MAX: z.coerce
    .number({ error: "debe ser un número" })
    .int()
    .min(1, "debe estar entre 1 y 50")
    .max(50, "debe estar entre 1 y 50")
    .default(10),
});

const resultado = esquema.safeParse(process.env);

if (!resultado.success) {
  console.error("Configuración inválida. Revisa el archivo .env (puedes partir de .env.example):");
  for (const [variable, errores] of Object.entries(z.flattenError(resultado.error).fieldErrors)) {
    console.error(`  ${variable}: ${errores?.join(", ")}`);
  }
  process.exit(1);
}

export const env = resultado.data;
