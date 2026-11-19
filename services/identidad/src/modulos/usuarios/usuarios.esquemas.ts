import { paginacionQuery, uuid } from "@backline/comun";
import { z } from "zod";

/** Correo normalizado: sin espacios y en minúsculas, para que "Ana@X.com" y "ana@x.com" sean la misma cuenta. */
export const correo = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .pipe(z.email({ error: "Debe ser un correo válido." }));

/**
 * bcrypt solo usa los primeros 72 BYTES de la contraseña: más allá se ignoran en silencio.
 * Por eso el límite se mide en bytes (una "ñ" ocupa 2), no en caracteres.
 */
const contrasena = z
  .string()
  .min(8, "Debe tener al menos 8 caracteres.")
  .refine((c) => Buffer.byteLength(c, "utf8") <= 72, { message: "Debe ocupar como máximo 72 bytes." })
  .refine((c) => /[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(c) && /\d/.test(c), {
    message: "Debe combinar letras y números.",
  });

export const registroBody = z
  .object({
    correo,
    contrasena,
    // Las cuentas de administrador no se registran por la API: se crean directo en la base
    rol: z.enum(["banda", "foro"], { error: "Debe ser banda o foro." }),
  })
  .strict();

export const usuarioParams = z.object({ usuarioId: uuid });

export const listarUsuariosQuery = paginacionQuery.extend({
  correo: z.string().trim().max(254).optional(),
  rol: z.enum(["banda", "foro", "admin"]).optional(),
  estado: z.enum(["activa", "suspendida"]).optional(),
});

export const cambioEstadoBody = z.object({ estado: z.enum(["activa", "suspendida"]) }).strict();

export type Registro = z.infer<typeof registroBody>;
export type ListarUsuarios = z.infer<typeof listarUsuariosQuery>;
export type EstadoCuenta = z.infer<typeof cambioEstadoBody>["estado"];
