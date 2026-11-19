import { fecha, instante, paginacionQuery, uuid } from "@backline/comun";
import { z } from "zod";

/** Esquemas de franjas. Las reglas que dependen del reloj (inicio no pasado) van en el servicio. */

export const franjaParams = z.object({ franjaId: uuid });

export const franjaNuevaBody = z.object({ inicio: instante, fin: instante }).strict();

export const listarFranjasQuery = paginacionQuery.extend({
  foroId: uuid.optional(),
  desde: fecha.optional(),
  hasta: fecha.optional(),
  // "retirada" no se puede pedir: una franja retirada ya no existe para la API
  estado: z.enum(["libre", "reservada"]).optional(),
});

export const compatibilidadQuery = z.object({ bandaId: uuid });

export type FranjaNueva = z.infer<typeof franjaNuevaBody>;
export type ListarFranjas = z.infer<typeof listarFranjasQuery>;
