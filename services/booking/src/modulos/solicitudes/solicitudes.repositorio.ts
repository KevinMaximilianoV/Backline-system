import { limites, type Ejecutor, type UsuarioAutenticado } from "@backline/comun";
import type { ElementoEquipo } from "../../clientes/perfiles";
import { consultar } from "../../db/pool";
import type { Faltante } from "../../equipo";
import type { ListarSolicitudes, SolicitudNueva } from "./solicitudes.esquemas";
import type { EstadoSolicitud } from "./transiciones";

/** Acceso a datos de solicitudes y su historial. Solo SQL parametrizado. */

export interface FilaSolicitud {
  id: string;
  franja_id: string;
  foro_id: string;
  banda_id: string;
  banda_nombre: string;
  foro_nombre: string;
  tipo_acuerdo: SolicitudNueva["tipoAcuerdo"];
  monto_mxn: string | null; // NUMERIC llega como texto para no perder precisión
  porcentaje: number | null;
  notas: string | null;
  estado: EstadoSolicitud;
  rider_snapshot: ElementoEquipo[];
  inventario_snapshot: ElementoEquipo[];
  faltantes: Faltante[];
  creado_en: Date;
  actualizado_en: Date;
  inicio: Date;
  fin: Date;
}

export interface FilaCambio {
  id: string;
  solicitud_id: string;
  estado_anterior: EstadoSolicitud | null;
  estado_nuevo: EstadoSolicitud;
  autor_usuario_id: string | null;
  motivo: string | null;
  creado_en: Date;
}

const SELECT_SOLICITUD = `
  SELECT s.id, s.franja_id, s.foro_id, s.banda_id, s.banda_nombre, s.foro_nombre, s.tipo_acuerdo,
         s.monto_mxn, s.porcentaje, s.notas, s.estado, s.rider_snapshot, s.inventario_snapshot,
         s.faltantes, s.creado_en, s.actualizado_en, f.inicio, f.fin
    FROM solicitud s
    JOIN franja f ON f.id = s.franja_id`;

const CAMBIO = "id, solicitud_id, estado_anterior, estado_nuevo, autor_usuario_id, motivo, creado_en";

export async function insertar(
  datos: SolicitudNueva & {
    foroId: string;
    bandaId: string;
    bandaNombre: string;
    foroNombre: string;
    rider: ElementoEquipo[];
    inventario: ElementoEquipo[];
    faltantes: Faltante[];
  },
  ejecutor: Ejecutor,
): Promise<string> {
  const [fila] = await consultar<{ id: string }>(
    `INSERT INTO solicitud (franja_id, foro_id, banda_id, banda_nombre, foro_nombre, tipo_acuerdo, monto_mxn,
                            porcentaje, notas, rider_snapshot, inventario_snapshot, faltantes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING id`,
    [
      datos.franjaId,
      datos.foroId,
      datos.bandaId,
      datos.bandaNombre,
      datos.foroNombre,
      datos.tipoAcuerdo,
      datos.montoMxn ?? null,
      datos.porcentaje ?? null,
      datos.notas ?? null,
      JSON.stringify(datos.rider),
      JSON.stringify(datos.inventario),
      JSON.stringify(datos.faltantes),
    ],
    ejecutor,
  );
  if (!fila) throw new Error("INSERT de solicitud sin fila de regreso");
  return fila.id;
}

export async function porId(id: string, ejecutor?: Ejecutor): Promise<FilaSolicitud | undefined> {
  const [fila] = await consultar<FilaSolicitud>(`${SELECT_SOLICITUD} WHERE s.id = $1`, [id], ejecutor);
  return fila;
}

/** Bloquea SOLO la fila de la solicitud (FOR UPDATE OF s), no la franja: esa se bloquea aparte, cuando hace falta. */
export async function porIdParaActualizar(id: string, ejecutor: Ejecutor): Promise<FilaSolicitud | undefined> {
  const [fila] = await consultar<FilaSolicitud>(`${SELECT_SOLICITUD} WHERE s.id = $1 FOR UPDATE OF s`, [id], ejecutor);
  return fila;
}

/**
 * Cada quien ve solo lo suyo: la banda sus solicitudes enviadas, el foro las recibidas,
 * el administrador todas. El filtro va en el SQL, no se filtra después en memoria.
 */
export async function listar(usuario: UsuarioAutenticado, filtros: ListarSolicitudes): Promise<{ filas: FilaSolicitud[]; total: number }> {
  const condicion = `($1::text = 'admin' OR ($1 = 'banda' AND s.banda_id = $2) OR ($1 = 'foro' AND s.foro_id = $2))
    AND ($3::estado_solicitud IS NULL OR s.estado = $3)
    AND ($4::uuid IS NULL OR s.franja_id = $4)`;
  const valores = [usuario.rol, usuario.id, filtros.estado ?? null, filtros.franjaId ?? null];
  const [conteo] = await consultar<{ total: number }>(`SELECT count(*)::int AS total FROM solicitud s WHERE ${condicion}`, valores);
  const { limit, offset } = limites(filtros);
  const filas = await consultar<FilaSolicitud>(
    `${SELECT_SOLICITUD} WHERE ${condicion} ORDER BY s.creado_en DESC, s.id LIMIT $5 OFFSET $6`,
    [...valores, limit, offset],
  );
  return { filas, total: conteo?.total ?? 0 };
}

export async function cambiarEstado(id: string, estado: EstadoSolicitud, ejecutor: Ejecutor): Promise<void> {
  await consultar("UPDATE solicitud SET estado = $2 WHERE id = $1", [id, estado], ejecutor);
}

/** Rechaza las demás solicitudes pendientes de la franja y regresa las que rechazó. */
export async function rechazarPendientesDeFranja(
  franjaId: string,
  excepto: string,
  ejecutor: Ejecutor,
): Promise<{ id: string; banda_id: string; banda_nombre: string }[]> {
  return consultar(
    `UPDATE solicitud SET estado = 'rechazada'
      WHERE franja_id = $1 AND id <> $2 AND estado = 'solicitada'
      RETURNING id, banda_id, banda_nombre`,
    [franjaId, excepto],
    ejecutor,
  );
}

/** El historial solo crece: no hay UPDATE ni DELETE sobre cambio_estado (ni el permiso para hacerlo). */
export async function registrarCambio(
  cambio: { solicitudId: string; anterior: EstadoSolicitud | null; nuevo: EstadoSolicitud; autor: string | null; motivo: string | null },
  ejecutor: Ejecutor,
): Promise<FilaCambio> {
  const [fila] = await consultar<FilaCambio>(
    `INSERT INTO cambio_estado (solicitud_id, estado_anterior, estado_nuevo, autor_usuario_id, motivo)
     VALUES ($1, $2, $3, $4, $5) RETURNING ${CAMBIO}`,
    [cambio.solicitudId, cambio.anterior, cambio.nuevo, cambio.autor, cambio.motivo],
    ejecutor,
  );
  if (!fila) throw new Error("INSERT de cambio_estado sin fila de regreso");
  return fila;
}

export async function historial(solicitudId: string): Promise<FilaCambio[]> {
  return consultar<FilaCambio>(`SELECT ${CAMBIO} FROM cambio_estado WHERE solicitud_id = $1 ORDER BY creado_en, id`, [solicitudId]);
}

export async function cambio(solicitudId: string, cambioId: string): Promise<FilaCambio | undefined> {
  const [fila] = await consultar<FilaCambio>(`SELECT ${CAMBIO} FROM cambio_estado WHERE solicitud_id = $1 AND id = $2`, [
    solicitudId,
    cambioId,
  ]);
  return fila;
}
