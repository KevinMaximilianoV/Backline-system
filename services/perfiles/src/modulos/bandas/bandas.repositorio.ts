import { consultar, type Ejecutor } from "../../db/pool";
import type { CrearBanda, ListarBandas, ModificarBanda, RiderEntrada } from "./bandas.esquemas";

/** Acceso a datos de bandas. Solo SQL parametrizado: ningún valor se concatena en la consulta. */

export interface FilaBanda {
  id: string;
  nombre: string;
  integrantes: number;
  enlace_demo: string | null;
  descripcion: string | null;
  visible: boolean;
  creado_en: Date;
  actualizado_en: Date;
  generos: { id: number; nombre: string }[];
}

export interface FilaRequisito {
  tipo_equipo_id: number;
  tipo_equipo: string;
  cantidad: number;
  notas: string | null;
}

/** Una banda está activa si su cuenta no está suspendida y no se dio de baja. */
const ACTIVA = "b.visible AND b.dado_de_baja_en IS NULL";

const SELECT_BANDA = `
  SELECT b.id, b.nombre, b.integrantes, b.enlace_demo, b.descripcion, b.visible, b.creado_en, b.actualizado_en,
         COALESCE(json_agg(json_build_object('id', g.id, 'nombre', g.nombre) ORDER BY g.id)
                  FILTER (WHERE g.id IS NOT NULL), '[]') AS generos
    FROM banda b
    LEFT JOIN banda_genero bg ON bg.banda_id = b.id
    LEFT JOIN genero g ON g.id = bg.genero_id`;

export async function obtenerActiva(id: string, ejecutor?: Ejecutor): Promise<FilaBanda | undefined> {
  const filas = await consultar<FilaBanda>(`${SELECT_BANDA} WHERE b.id = $1 AND ${ACTIVA} GROUP BY b.id`, [id], ejecutor);
  return filas[0];
}

export async function listarActivas(filtros: ListarBandas): Promise<{ filas: FilaBanda[]; total: number }> {
  const condicion = `${ACTIVA} AND ($1::smallint IS NULL OR EXISTS
                     (SELECT 1 FROM banda_genero x WHERE x.banda_id = b.id AND x.genero_id = $1))`;
  const genero = filtros.genero ?? null;
  const [conteo] = await consultar<{ total: number }>(`SELECT count(*)::int AS total FROM banda b WHERE ${condicion}`, [genero]);
  const filas = await consultar<FilaBanda>(
    `${SELECT_BANDA} WHERE ${condicion} GROUP BY b.id ORDER BY b.nombre, b.id LIMIT $2 OFFSET $3`,
    [genero, filtros.porPagina, (filtros.pagina - 1) * filtros.porPagina],
  );
  return { filas, total: conteo?.total ?? 0 };
}

export async function insertar(datos: CrearBanda, ejecutor: Ejecutor): Promise<void> {
  await consultar(
    `INSERT INTO banda (id, nombre, integrantes, enlace_demo, descripcion) VALUES ($1, $2, $3, $4, $5)`,
    [datos.id, datos.nombre, datos.integrantes, datos.enlaceDemo ?? null, datos.descripcion ?? null],
    ejecutor,
  );
  await reemplazarGeneros(datos.id, datos.generoIds, ejecutor);
}

/** Bloquea la fila de la banda activa hasta que termine la transacción; devuelve false si no existe. */
export async function bloquearActiva(id: string, ejecutor: Ejecutor): Promise<boolean> {
  const filas = await consultar(`SELECT 1 FROM banda b WHERE b.id = $1 AND ${ACTIVA} FOR UPDATE`, [id], ejecutor);
  return filas.length > 0;
}

/** Columnas que se pueden modificar y su nombre en la base. Lo que no está aquí no llega al SQL. */
const COLUMNAS: Record<string, string> = {
  nombre: "nombre",
  integrantes: "integrantes",
  enlaceDemo: "enlace_demo",
  descripcion: "descripcion",
};

export async function actualizar(id: string, cambios: ModificarBanda, ejecutor: Ejecutor): Promise<void> {
  const asignaciones: string[] = [];
  const valores: unknown[] = [id];
  for (const [campo, columna] of Object.entries(COLUMNAS)) {
    if (campo in cambios) {
      valores.push(cambios[campo as keyof ModificarBanda] ?? null);
      asignaciones.push(`${columna} = $${valores.length}`);
    }
  }
  // Aunque solo cambien los géneros, se actualiza la banda para que el trigger mueva actualizado_en
  const set = asignaciones.length > 0 ? asignaciones.join(", ") : "actualizado_en = now()";
  await consultar(`UPDATE banda SET ${set} WHERE id = $1`, valores, ejecutor);
  if (cambios.generoIds) await reemplazarGeneros(id, cambios.generoIds, ejecutor);
}

async function reemplazarGeneros(id: string, generoIds: number[], ejecutor: Ejecutor): Promise<void> {
  await consultar("DELETE FROM banda_genero WHERE banda_id = $1", [id], ejecutor);
  await consultar(
    "INSERT INTO banda_genero (banda_id, genero_id) SELECT $1, unnest($2::smallint[])",
    [id, generoIds],
    ejecutor,
  );
}

/** Baja lógica: la fila se conserva para no romper el historial de solicitudes que la referencian. */
export async function darDeBaja(id: string): Promise<boolean> {
  const filas = await consultar(
    `UPDATE banda b SET dado_de_baja_en = now() WHERE b.id = $1 AND ${ACTIVA} RETURNING b.id`,
    [id],
  );
  return filas.length > 0;
}

export async function obtenerRider(bandaId: string, ejecutor?: Ejecutor): Promise<FilaRequisito[]> {
  return consultar<FilaRequisito>(
    `SELECT r.tipo_equipo_id, t.nombre AS tipo_equipo, r.cantidad, r.notas
       FROM rider_requisito r JOIN tipo_equipo t ON t.id = r.tipo_equipo_id
      WHERE r.banda_id = $1
      ORDER BY r.tipo_equipo_id`,
    [bandaId],
    ejecutor,
  );
}

/** PUT del rider: se borra la lista anterior y se inserta la nueva, en la transacción del llamador. */
export async function reemplazarRider(bandaId: string, rider: RiderEntrada, ejecutor: Ejecutor): Promise<void> {
  await consultar("DELETE FROM rider_requisito WHERE banda_id = $1", [bandaId], ejecutor);
  if (rider.requisitos.length > 0) {
    await consultar(
      `INSERT INTO rider_requisito (banda_id, tipo_equipo_id, cantidad, notas)
       SELECT $1, * FROM unnest($2::smallint[], $3::smallint[], $4::varchar[])`,
      [
        bandaId,
        rider.requisitos.map((r) => r.tipoEquipoId),
        rider.requisitos.map((r) => r.cantidad),
        rider.requisitos.map((r) => r.notas ?? null),
      ],
      ejecutor,
    );
  }
  await consultar("UPDATE banda SET actualizado_en = now() WHERE id = $1", [bandaId], ejecutor);
}
