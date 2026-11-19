import { textoOpcional } from "@backline/comun";
import { z } from "zod";

export { paginacionQuery, textoOpcional, uuid } from "@backline/comun";

/** Piezas de validación que comparten bandas y foros (las generales vienen de @backline/comun). */

export const generoQuery = z.coerce.number().int().positive().optional();

/** Lista de ids enteros sin repetidos. */
export function idsSinRepetir(nombre: string) {
  return z
    .array(z.number().int().positive())
    .refine((ids) => new Set(ids).size === ids.length, { message: `No repitas ${nombre}.` });
}

export const enlace = z
  .string()
  .trim()
  .max(300)
  .url()
  .regex(/^https?:\/\//, "Debe empezar con http:// o https://.");

/** Elementos del rider o del inventario: tipo de equipo del catálogo, cantidad y notas. */
export function listaEquipo(maximoPorElemento: number) {
  return z
    .array(
      z
        .object({
          tipoEquipoId: z.number().int().positive(),
          cantidad: z.number().int().min(1).max(maximoPorElemento),
          notas: textoOpcional(120),
        })
        .strict(),
    )
    .max(30)
    .refine((items) => new Set(items.map((i) => i.tipoEquipoId)).size === items.length, {
      message: "Un tipo de equipo no se puede repetir.",
    });
}
