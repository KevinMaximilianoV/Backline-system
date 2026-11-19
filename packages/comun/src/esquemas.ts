import { z } from "zod";

/** Piezas de validación que comparten todos los servicios. */

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

export const textoOpcional = (max: number) => z.string().trim().max(max).nullable().optional();

/** Instante ISO 8601 con zona horaria, por ejemplo 2026-12-05T21:00:00-06:00. */
export const instante = z.iso.datetime({ offset: true, error: "Debe ser una fecha y hora ISO 8601 con zona horaria." });

/** Fecha sin hora, AAAA-MM-DD. */
export const fecha = z.iso.date({ error: "Debe ser una fecha AAAA-MM-DD." });

export interface Pagina<T> {
  datos: T[];
  paginacion: { pagina: number; porPagina: number; total: number };
}

/** LIMIT y OFFSET para SQL a partir de los parámetros de paginación. */
export function limites(p: { pagina: number; porPagina: number }): { limit: number; offset: number } {
  return { limit: p.porPagina, offset: (p.pagina - 1) * p.porPagina };
}
