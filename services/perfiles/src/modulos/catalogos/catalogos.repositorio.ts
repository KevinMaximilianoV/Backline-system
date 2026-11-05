import { consultar, type Ejecutor } from "../../db/pool";

export interface FilaGenero {
  id: number;
  nombre: string;
}

export interface FilaTipoEquipo {
  id: number;
  nombre: string;
  categoria: string;
}

export function listarGeneros(): Promise<FilaGenero[]> {
  return consultar<FilaGenero>("SELECT id, nombre FROM genero ORDER BY id");
}

export function listarTiposEquipo(): Promise<FilaTipoEquipo[]> {
  return consultar<FilaTipoEquipo>("SELECT id, nombre, categoria FROM tipo_equipo ORDER BY id");
}

/** Devuelve los ids de la lista que NO existen en el catálogo de géneros. */
export async function generosInexistentes(ids: number[], ejecutor?: Ejecutor): Promise<number[]> {
  if (ids.length === 0) return [];
  const filas = await consultar<{ id: number }>(
    `SELECT x.id FROM unnest($1::int[]) AS x(id)
      WHERE NOT EXISTS (SELECT 1 FROM genero g WHERE g.id = x.id)`,
    [ids],
    ejecutor,
  );
  return filas.map((f) => f.id);
}

/** Devuelve los ids de la lista que NO existen en el catálogo de tipos de equipo. */
export async function tiposEquipoInexistentes(ids: number[], ejecutor?: Ejecutor): Promise<number[]> {
  if (ids.length === 0) return [];
  const filas = await consultar<{ id: number }>(
    `SELECT x.id FROM unnest($1::int[]) AS x(id)
      WHERE NOT EXISTS (SELECT 1 FROM tipo_equipo t WHERE t.id = x.id)`,
    [ids],
    ejecutor,
  );
  return filas.map((f) => f.id);
}
