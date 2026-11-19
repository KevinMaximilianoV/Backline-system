import { limites, type Ejecutor, type Rol } from "@backline/comun";
import { consultar } from "../../db/pool";
import type { EstadoCuenta, ListarUsuarios } from "./usuarios.esquemas";

/** Acceso a datos de usuarios. Solo SQL parametrizado. */

export interface FilaUsuario {
  id: string;
  correo: string;
  hash_contrasena: string;
  rol: Rol;
  estado: EstadoCuenta;
  creado_en: Date;
}

const COLUMNAS = "id, correo, hash_contrasena, rol, estado, creado_en";

export async function insertar(
  datos: { correo: string; hash: string; rol: Rol },
  ejecutor: Ejecutor,
): Promise<FilaUsuario> {
  const [fila] = await consultar<FilaUsuario>(
    `INSERT INTO usuario (correo, hash_contrasena, rol) VALUES ($1, $2, $3) RETURNING ${COLUMNAS}`,
    [datos.correo, datos.hash, datos.rol],
    ejecutor,
  );
  if (!fila) throw new Error("INSERT de usuario sin fila de regreso");
  return fila;
}

/** Búsqueda por correo sin importar mayúsculas: usa el índice único ux_usuario_correo (lower(correo)). */
export async function porCorreo(correo: string): Promise<FilaUsuario | undefined> {
  const [fila] = await consultar<FilaUsuario>(`SELECT ${COLUMNAS} FROM usuario WHERE lower(correo) = lower($1)`, [correo]);
  return fila;
}

export async function porId(id: string, ejecutor?: Ejecutor): Promise<FilaUsuario | undefined> {
  const [fila] = await consultar<FilaUsuario>(`SELECT ${COLUMNAS} FROM usuario WHERE id = $1`, [id], ejecutor);
  return fila;
}

/** Bloquea la fila hasta el fin de la transacción: dos cambios simultáneos se aplican en orden. */
export async function porIdParaActualizar(id: string, ejecutor: Ejecutor): Promise<FilaUsuario | undefined> {
  const [fila] = await consultar<FilaUsuario>(`SELECT ${COLUMNAS} FROM usuario WHERE id = $1 FOR UPDATE`, [id], ejecutor);
  return fila;
}

export async function listar(filtros: ListarUsuarios): Promise<{ filas: FilaUsuario[]; total: number }> {
  // El texto se busca literal: % y _ del usuario no actúan como comodines de LIKE
  const texto = filtros.correo ? `%${filtros.correo.replace(/[\\%_]/g, "\\$&")}%` : null;
  const condicion = `($1::text IS NULL OR correo ILIKE $1)
                 AND ($2::rol_usuario IS NULL OR rol = $2)
                 AND ($3::estado_cuenta IS NULL OR estado = $3)`;
  const filtrosSql = [texto, filtros.rol ?? null, filtros.estado ?? null];
  const [conteo] = await consultar<{ total: number }>(`SELECT count(*)::int AS total FROM usuario WHERE ${condicion}`, filtrosSql);
  const { limit, offset } = limites(filtros);
  const filas = await consultar<FilaUsuario>(
    `SELECT ${COLUMNAS} FROM usuario WHERE ${condicion} ORDER BY creado_en DESC, id LIMIT $4 OFFSET $5`,
    [...filtrosSql, limit, offset],
  );
  return { filas, total: conteo?.total ?? 0 };
}

export async function cambiarEstado(id: string, estado: EstadoCuenta, ejecutor: Ejecutor): Promise<FilaUsuario> {
  const [fila] = await consultar<FilaUsuario>(
    `UPDATE usuario SET estado = $2 WHERE id = $1 RETURNING ${COLUMNAS}`,
    [id, estado],
    ejecutor,
  );
  if (!fila) throw new Error("UPDATE de usuario sin fila de regreso");
  return fila;
}

/**
 * Bandeja de salida (outbox): el evento se escribe en la MISMA transacción que el cambio.
 * Así nunca hay un usuario suspendido sin su evento, ni un evento de algo que no pasó.
 * Un proceso lo publicará en RabbitMQ en la siguiente entrega.
 */
export async function registrarEvento(tipo: string, payload: object, ejecutor: Ejecutor): Promise<void> {
  await consultar("INSERT INTO evento_pendiente (tipo, payload) VALUES ($1, $2)", [tipo, JSON.stringify(payload)], ejecutor);
}
