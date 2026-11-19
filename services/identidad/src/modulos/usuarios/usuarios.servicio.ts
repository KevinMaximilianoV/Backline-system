import { ApiError, esValorDuplicado, type Pagina, type UsuarioAutenticado } from "@backline/comun";
import bcrypt from "bcryptjs";
import { env } from "../../config/env";
import { enTransaccion } from "../../db/pool";
import type { EstadoCuenta, ListarUsuarios, Registro } from "./usuarios.esquemas";
import * as repositorio from "./usuarios.repositorio";

/** Reglas de negocio de las cuentas. No sabe nada de HTTP: recibe datos validados y lanza ApiError. */

type Usuario = ReturnType<typeof aUsuario>;

/** La representación pública nunca incluye el hash de la contraseña. */
export function aUsuario(fila: repositorio.FilaUsuario) {
  return { id: fila.id, correo: fila.correo, rol: fila.rol, estado: fila.estado, creadoEn: fila.creado_en.toISOString() };
}

export async function registrar(datos: Registro): Promise<Usuario> {
  // Se guarda el hash, nunca la contraseña. bcrypt agrega una sal distinta a cada hash.
  const hash = await bcrypt.hash(datos.contrasena, env.BCRYPT_COSTO);
  try {
    return await enTransaccion(async (tx) => {
      const fila = await repositorio.insertar({ correo: datos.correo, hash, rol: datos.rol }, tx);
      await repositorio.registrarEvento("UsuarioRegistrado", { usuarioId: fila.id, correo: fila.correo, rol: fila.rol }, tx);
      return aUsuario(fila);
    });
  } catch (error) {
    // El índice único sobre lower(correo) decide, incluso con dos registros simultáneos
    if (esValorDuplicado(error)) {
      throw ApiError.conflicto("CORREO_YA_REGISTRADO", "El correo ya está registrado", "Ya existe una cuenta con ese correo. Inicia sesión.");
    }
    throw error;
  }
}

/** E-03: datos frescos de la base, no del token (el estado pudo cambiar después de emitirlo). */
export async function yo(usuario: UsuarioAutenticado): Promise<Usuario> {
  const fila = await repositorio.porId(usuario.id);
  if (!fila) throw ApiError.noEncontrado("La cuenta del token ya no existe.");
  return aUsuario(fila);
}

export async function listar(filtros: ListarUsuarios): Promise<Pagina<Usuario>> {
  const { filas, total } = await repositorio.listar(filtros);
  return { datos: filas.map(aUsuario), paginacion: { pagina: filtros.pagina, porPagina: filtros.porPagina, total } };
}

/**
 * E-05: suspender o reactivar. Reglas:
 * - el administrador no puede suspenderse a sí mismo (se quedaría sin poder reactivarse);
 * - las cuentas de administrador no se suspenden por la API;
 * - repetir el mismo estado no es un error: responde la cuenta sin generar otro evento (idempotente).
 */
export async function cambiarEstado(admin: UsuarioAutenticado, usuarioId: string, estado: EstadoCuenta): Promise<Usuario> {
  if (admin.id === usuarioId) {
    throw ApiError.sinPermiso("No puedes cambiar el estado de tu propia cuenta.", "AUTOSUSPENSION_NO_PERMITIDA");
  }
  return enTransaccion(async (tx) => {
    const actual = await repositorio.porIdParaActualizar(usuarioId, tx);
    if (!actual) throw ApiError.noEncontrado(`No existe una cuenta con id ${usuarioId}.`);
    if (actual.rol === "admin") throw ApiError.sinPermiso("Las cuentas de administrador no se suspenden por la API.");
    if (actual.estado === estado) return aUsuario(actual);

    const fila = await repositorio.cambiarEstado(usuarioId, estado, tx);
    await repositorio.registrarEvento(
      estado === "suspendida" ? "UsuarioSuspendido" : "UsuarioReactivado",
      { usuarioId, rol: fila.rol, porAdministrador: admin.id },
      tx,
    );
    return aUsuario(fila);
  });
}
