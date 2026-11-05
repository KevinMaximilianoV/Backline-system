import { z } from "zod";

/** Piezas de validación que comparten bandas y foros. */

/**
 * Id con forma de UUID (8-4-4-4-12 hexadecimal). Se usa z.guid() y no z.uuid() porque
 * z.uuid() exige la versión y variante del RFC 9562, y PostgreSQL acepta cualquier UUID
 * (los datos de prueba usan ids como 11111111-1111-1111-1111-111111111111).
 */
export const uuid = z.guid();

export const paginacionQuery = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  porPagina: z.coerce.number().int().min(1).max(100).default(20),
});

export const generoQuery = z.coerce.number().int().positive().optional();

/** Lista de ids enteros sin repetidos. */
export function idsSinRepetir(nombre: string) {
  return z
    .array(z.number().int().positive())
    .refine((ids) => new Set(ids).size === ids.length, { message: `No repitas ${nombre}.` });
}

export const textoOpcional = (max: number) => z.string().trim().max(max).nullable().optional();

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

export interface Pagina<T> {
  datos: T[];
  paginacion: { pagina: number; porPagina: number; total: number };
}
