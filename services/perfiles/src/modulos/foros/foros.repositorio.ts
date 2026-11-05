import { consultar, type Ejecutor } from "../../db/pool";
import type { CrearForo, InventarioEntrada, ListarForos, ModificarForo } from "./foros.esquemas";

/** Acceso a datos de foros. Solo SQL parametrizado: ningún valor se concatena en la consulta. */

export interface FilaForo {
  id: string;
  nombre: string;
  direccion: string;
  capacidad: number;
  descripcion: string | null;
  visible: boolean;
  creado_en: Date;
  actualizado_en: Date;
  generos: { id: number; nombre: string }[];
}

export interface FilaElemento {
  tipo_equipo_id: number;
  tipo_equipo: string;
  cantidad: number;
  notas: string | null;
}

/** Un foro está activo si su cuenta no está suspendida y no se dio de baja. */
const ACTIVO = "f.visible AND f.dado_de_baja_en IS NULL";

const SELECT_FORO = `
  SELECT f.id, f.nombre, f.direccion, f.capacidad, f.descripcion, f.visible, f.creado_en, f.actualizado_en,
         COALESCE(json_agg(json_build_object('id', g.id, 'nombre', g.nombre) ORDER BY g.id)
                  FILTER (WHERE g.id IS NOT NULL), '[]') AS generos
    FROM foro f
    LEFT JOIN foro_genero fg ON fg.foro_id = f.id
    LEFT JOIN genero g ON g.id = fg.genero_id`;

export async function obtenerActivo(id: string, ejecutor?: Ejecutor): Promise<FilaForo | undefined> {
  const filas = await consultar<FilaForo>(`${SELECT_FORO} WHERE f.id = $1 AND ${ACTIVO} GROUP BY f.id`, [id], ejecutor);
  return filas[0];
}

export async function listarActivos(filtros: ListarForos): Promise<{ filas: FilaForo[]; total: number }> {
  // Los filtros opcionales van como parámetros que pueden ser NULL; así el SQL es siempre el mismo
  const condicion = `${ACTIVO}
    AND ($1::smallint IS NULL OR EXISTS (SELECT 1 FROM foro_genero x WHERE x.foro_id = f.id AND x.genero_id = $1))
    AND ($2::uuid[] IS NULL OR f.id = ANY($2::uuid[]))`;
  const filtrosSql = [filtros.genero ?? null, filtros.ids ?? null];
  const [conteo] = await consultar<{ total: number }>(`SELECT count(*)::int AS total FROM foro f WHERE ${condicion}`, filtrosSql);
  const filas = await consultar<FilaForo>(
    `${SELECT_FORO} WHERE ${condicion} GROUP BY f.id ORDER BY f.nombre, f.id LIMIT $3 OFFSET $4`,
    [...filtrosSql, filtros.porPagina, (filtros.pagina - 1) * filtros.porPagina],
  );
  return { filas, total: conteo?.total ?? 0 };
}

export async function insertar(datos: CrearForo, ejecutor: Ejecutor): Promise<void> {
  await consultar(
    `INSERT INTO foro (id, nombre, direccion, capacidad, descripcion) VALUES ($1, $2, $3, $4, $5)`,
    [datos.id, datos.nombre, datos.direccion, datos.capacidad, datos.descripcion ?? null],
    ejecutor,
  );
  await reemplazarGeneros(datos.id, datos.generoIds, ejecutor);
}

/** Bloquea la fila del foro activo hasta que termine la transacción; devuelve false si no existe. */
export async function bloquearActivo(id: string, ejecutor: Ejecutor): Promise<boolean> {
  const filas = await consultar(`SELECT 1 FROM foro f WHERE f.id = $1 AND ${ACTIVO} FOR UPDATE`, [id], ejecutor);
  return filas.length > 0;
}

/** Columnas que se pueden modificar y su nombre en la base. Lo que no está aquí no llega al SQL. */
const COLUMNAS: Record<string, string> = {
  nombre: "nombre",
  direccion: "direccion",
  capacidad: "capacidad",
  descripcion: "descripcion",
};

export async function actualizar(id: string, cambios: ModificarForo, ejecutor: Ejecutor): Promise<void> {
  const asignaciones: string[] = [];
  const valores: unknown[] = [id];
  for (const [campo, columna] of Object.entries(COLUMNAS)) {
    if (campo in cambios) {
      valores.push(cambios[campo as keyof ModificarForo] ?? null);
      asignaciones.push(`${columna} = $${valores.length}`);
    }
  }
  // Aunque solo cambien los géneros, se actualiza el foro para que el trigger mueva actualizado_en
  const set = asignaciones.length > 0 ? asignaciones.join(", ") : "actualizado_en = now()";
  await consultar(`UPDATE foro SET ${set} WHERE id = $1`, valores, ejecutor);
  if (cambios.generoIds) await reemplazarGeneros(id, cambios.generoIds, ejecutor);
}

async function reemplazarGeneros(id: string, generoIds: number[], ejecutor: Ejecutor): Promise<void> {
  await consultar("DELETE FROM foro_genero WHERE foro_id = $1", [id], ejecutor);
  await consultar(
    "INSERT INTO foro_genero (foro_id, genero_id) SELECT $1, unnest($2::smallint[])",
    [id, generoIds],
    ejecutor,
  );
}

/** Baja lógica: la fila se conserva para no romper el historial de franjas y solicitudes. */
export async function darDeBaja(id: string): Promise<boolean> {
  const filas = await consultar(
    `UPDATE foro f SET dado_de_baja_en = now() WHERE f.id = $1 AND ${ACTIVO} RETURNING f.id`,
    [id],
  );
  return filas.length > 0;
}

export async function obtenerInventario(foroId: string, ejecutor?: Ejecutor): Promise<FilaElemento[]> {
  return consultar<FilaElemento>(
    `SELECT i.tipo_equipo_id, t.nombre AS tipo_equipo, i.cantidad, i.notas
       FROM inventario_item i JOIN tipo_equipo t ON t.id = i.tipo_equipo_id
      WHERE i.foro_id = $1
      ORDER BY i.tipo_equipo_id`,
    [foroId],
    ejecutor,
  );
}

/** PUT del inventario: se borra la lista anterior y se inserta la nueva, en la transacción del llamador. */
export async function reemplazarInventario(foroId: string, inventario: InventarioEntrada, ejecutor: Ejecutor): Promise<void> {
  await consultar("DELETE FROM inventario_item WHERE foro_id = $1", [foroId], ejecutor);
  if (inventario.elementos.length > 0) {
    await consultar(
      `INSERT INTO inventario_item (foro_id, tipo_equipo_id, cantidad, notas)
       SELECT $1, * FROM unnest($2::smallint[], $3::smallint[], $4::varchar[])`,
      [
        foroId,
        inventario.elementos.map((e) => e.tipoEquipoId),
        inventario.elementos.map((e) => e.cantidad),
        inventario.elementos.map((e) => e.notas ?? null),
      ],
      ejecutor,
    );
  }
  await consultar("UPDATE foro SET actualizado_en = now() WHERE id = $1", [foroId], ejecutor);
}
