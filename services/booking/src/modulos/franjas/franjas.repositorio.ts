import { limites, type Ejecutor } from "@backline/comun";
import { ZONA_HORARIA } from "../../config/env";
import { consultar } from "../../db/pool";

/** Acceso a datos de franjas. Solo SQL parametrizado. */

export interface FilaFranja {
  id: string;
  foro_id: string;
  inicio: Date;
  fin: Date;
  estado: "libre" | "reservada" | "retirada";
  creado_en: Date;
}

const COLUMNAS = "id, foro_id, inicio, fin, estado, creado_en";

export async function insertar(foroId: string, inicio: string, fin: string): Promise<FilaFranja> {
  const [fila] = await consultar<FilaFranja>(
    `INSERT INTO franja (foro_id, inicio, fin) VALUES ($1, $2, $3) RETURNING ${COLUMNAS}`,
    [foroId, inicio, fin],
  );
  if (!fila) throw new Error("INSERT de franja sin fila de regreso");
  return fila;
}

/**
 * Bloquea la franja (aunque esté retirada) hasta el fin de la transacción.
 * Regla del servicio: quien vaya a cambiar una solicitud bloquea PRIMERO su franja y DESPUÉS la
 * solicitud. Si cada transacción tomara los bloqueos en distinto orden, dos de ellas podrían
 * esperarse mutuamente para siempre (deadlock).
 */
export async function bloquear(id: string, ejecutor: Ejecutor): Promise<FilaFranja | undefined> {
  const [fila] = await consultar<FilaFranja>(`SELECT ${COLUMNAS} FROM franja WHERE id = $1 FOR UPDATE`, [id], ejecutor);
  return fila;
}

/** Una franja retirada no existe para la API: estas consultas no la regresan. */
export async function vigente(id: string, ejecutor?: Ejecutor): Promise<FilaFranja | undefined> {
  const [fila] = await consultar<FilaFranja>(
    `SELECT ${COLUMNAS} FROM franja WHERE id = $1 AND estado <> 'retirada'`,
    [id],
    ejecutor,
  );
  return fila;
}

/** Igual que `vigente`, pero bloquea la fila hasta el fin de la transacción. */
export async function vigenteParaActualizar(id: string, ejecutor: Ejecutor): Promise<FilaFranja | undefined> {
  const [fila] = await consultar<FilaFranja>(
    `SELECT ${COLUMNAS} FROM franja WHERE id = $1 AND estado <> 'retirada' FOR UPDATE`,
    [id],
    ejecutor,
  );
  return fila;
}

export async function listar(
  filtros: { foroId?: string; desde: string; hasta: string; estado?: string; pagina: number; porPagina: number },
): Promise<{ filas: FilaFranja[]; total: number }> {
  // desde y hasta son días completos en la hora de Querétaro: [desde 00:00, hasta+1 00:00)
  const condicion = `estado <> 'retirada'
    AND inicio >= ($1::date)::timestamp AT TIME ZONE '${ZONA_HORARIA}'
    AND inicio <  ($2::date + 1)::timestamp AT TIME ZONE '${ZONA_HORARIA}'
    AND ($3::uuid IS NULL OR foro_id = $3)
    AND ($4::estado_franja IS NULL OR estado = $4)`;
  const valores = [filtros.desde, filtros.hasta, filtros.foroId ?? null, filtros.estado ?? null];
  const [conteo] = await consultar<{ total: number }>(`SELECT count(*)::int AS total FROM franja WHERE ${condicion}`, valores);
  const { limit, offset } = limites(filtros);
  const filas = await consultar<FilaFranja>(
    `SELECT ${COLUMNAS} FROM franja WHERE ${condicion} ORDER BY inicio, id LIMIT $5 OFFSET $6`,
    [...valores, limit, offset],
  );
  return { filas, total: conteo?.total ?? 0 };
}

export async function solicitudesActivas(franjaId: string, ejecutor: Ejecutor): Promise<number> {
  const [fila] = await consultar<{ total: number }>(
    `SELECT count(*)::int AS total FROM solicitud
      WHERE franja_id = $1 AND estado IN ('solicitada', 'aceptada', 'confirmada')`,
    [franjaId],
    ejecutor,
  );
  return fila?.total ?? 0;
}

/** Borrado lógico (RF-19): la franja pasa a retirada y conserva su historial. */
export async function retirar(id: string, ejecutor: Ejecutor): Promise<void> {
  await consultar("UPDATE franja SET estado = 'retirada', retirada_en = now() WHERE id = $1", [id], ejecutor);
}

export async function cambiarEstado(id: string, estado: "libre" | "reservada", ejecutor: Ejecutor): Promise<void> {
  await consultar("UPDATE franja SET estado = $2 WHERE id = $1", [id, estado], ejecutor);
}

/** Hoy en la hora de Querétaro, como AAAA-MM-DD. */
export async function hoy(): Promise<string> {
  const [fila] = await consultar<{ hoy: string }>(`SELECT (now() AT TIME ZONE '${ZONA_HORARIA}')::date::text AS hoy`);
  if (!fila) throw new Error("Sin fecha de la base");
  return fila.hoy;
}
