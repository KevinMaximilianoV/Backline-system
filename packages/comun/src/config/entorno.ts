import { z } from "zod";

/**
 * Lee y valida las variables de entorno al arrancar. Si falta algo o tiene formato
 * inválido, el servicio no arranca: es mejor fallar de inmediato con un mensaje
 * claro que fallar después, en una petición, con un error difícil de rastrear.
 */
export function leerEntorno<T extends z.ZodType>(esquema: T): z.infer<T> {
  const resultado = esquema.safeParse(process.env);
  if (!resultado.success) {
    console.error("Configuración inválida. Revisa el archivo .env (puedes partir de .env.example):");
    for (const issue of resultado.error.issues) {
      console.error(`  ${issue.path.join(".") || "(entorno)"}: ${issue.message}`);
    }
    process.exit(1);
  }
  return resultado.data;
}

/** Piezas que repiten todos los servicios. */
export const variables = {
  nodeEnv: z.enum(["development", "test", "production"]).default("development"),
  puerto: (porDefecto: number) =>
    z.coerce
      .number({ error: "debe ser un número" })
      .int()
      .min(1, "debe estar entre 1 y 65535")
      .max(65535, "debe estar entre 1 y 65535")
      .default(porDefecto),
  urlPostgres: z
    .string({ error: "es obligatoria" })
    .regex(/^postgres(ql)?:\/\//, "debe ser una URL de PostgreSQL (postgresql://...)"),
  urlServicio: z.string({ error: "es obligatoria" }).regex(/^https?:\/\//, "debe ser una URL http:// o https://"),
  poolMax: z.coerce
    .number({ error: "debe ser un número" })
    .int()
    .min(1, "debe estar entre 1 y 50")
    .max(50, "debe estar entre 1 y 50")
    .default(10),
  archivo: z.string({ error: "es obligatoria (ruta a un archivo .pem)" }).min(1, "no puede estar vacía"),
};
