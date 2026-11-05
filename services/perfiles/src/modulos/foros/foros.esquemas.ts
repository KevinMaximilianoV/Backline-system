import { z } from "zod";
import { generoQuery, idsSinRepetir, listaEquipo, paginacionQuery, textoOpcional, uuid } from "../../comun/esquemas";

/** Esquemas de validación de foros. Reflejan docs/openapi.yaml y las restricciones de db/init. */

export const foroParams = z.object({ foroId: uuid });

/** `ids=a,b,c`: lo usa el Gateway para pedir varios foros en una sola llamada. */
const idsSeparadosPorComa = z
  .string()
  .transform((texto) => texto.split(",").map((id) => id.trim()).filter(Boolean))
  .pipe(z.array(uuid).min(1).max(50));

export const listarForosQuery = paginacionQuery.extend({
  genero: generoQuery,
  ids: idsSeparadosPorComa.optional(),
});

const camposForo = {
  nombre: z.string().trim().min(2).max(80),
  direccion: z.string().trim().min(1).max(200),
  capacidad: z.number().int().min(10).max(5000),
  // 12 = tamaño del catálogo de géneros; sin tope, un cliente podría mandar arreglos enormes
  generoIds: idsSinRepetir("géneros").pipe(z.array(z.number()).min(1).max(12)),
  descripcion: textoOpcional(500),
};

export const crearForoBody = z
  .object({
    // TEMPORAL (Entrega 5): sin autenticación, el id de la cuenta dueña llega en el cuerpo.
    // En la Entrega 6 se toma del token JWT y este campo se elimina (ver docs/openapi.yaml).
    id: uuid,
    ...camposForo,
  })
  .strict();

export const modificarForoBody = z
  .object(camposForo)
  .partial()
  .strict()
  .refine((cambios) => Object.keys(cambios).length > 0, { message: "Envía al menos un campo para modificar." });

export const inventarioBody = z.object({ elementos: listaEquipo(50) }).strict();

export type CrearForo = z.infer<typeof crearForoBody>;
export type ModificarForo = z.infer<typeof modificarForoBody>;
export type ListarForos = z.infer<typeof listarForosQuery>;
export type InventarioEntrada = z.infer<typeof inventarioBody>;
