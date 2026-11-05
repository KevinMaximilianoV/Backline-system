import { z } from "zod";
import { enlace, generoQuery, idsSinRepetir, listaEquipo, paginacionQuery, textoOpcional, uuid } from "../../comun/esquemas";

/** Esquemas de validación de bandas. Reflejan docs/openapi.yaml y las restricciones de db/init. */

export const bandaParams = z.object({ bandaId: uuid });

export const listarBandasQuery = paginacionQuery.extend({ genero: generoQuery });

const camposBanda = {
  nombre: z.string().trim().min(2).max(80),
  integrantes: z.number().int().min(1).max(20),
  generoIds: idsSinRepetir("géneros").pipe(z.array(z.number()).min(1).max(3)),
  enlaceDemo: enlace.nullable().optional(),
  descripcion: textoOpcional(500),
};

export const crearBandaBody = z
  .object({
    // TEMPORAL (Entrega 5): sin autenticación, el id de la cuenta dueña llega en el cuerpo.
    // En la Entrega 6 se toma del token JWT y este campo se elimina (ver docs/openapi.yaml).
    id: uuid,
    ...camposBanda,
  })
  .strict();

export const modificarBandaBody = z
  .object(camposBanda)
  .partial()
  .strict()
  .refine((cambios) => Object.keys(cambios).length > 0, { message: "Envía al menos un campo para modificar." });

export const riderBody = z.object({ requisitos: listaEquipo(10) }).strict();

export type CrearBanda = z.infer<typeof crearBandaBody>;
export type ModificarBanda = z.infer<typeof modificarBandaBody>;
export type ListarBandas = z.infer<typeof listarBandasQuery>;
export type RiderEntrada = z.infer<typeof riderBody>;
