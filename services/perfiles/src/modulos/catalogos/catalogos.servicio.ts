import { ApiError } from "../../errores/ApiError";
import type { Ejecutor } from "../../db/pool";
import * as repositorio from "./catalogos.repositorio";

export async function generos() {
  return { datos: await repositorio.listarGeneros() };
}

export async function tiposEquipo() {
  return { datos: await repositorio.listarTiposEquipo() };
}

/** Lanza 422 si algún id de género no existe en el catálogo. */
export async function exigirGeneros(ids: number[], ejecutor?: Ejecutor): Promise<void> {
  const faltan = await repositorio.generosInexistentes(ids, ejecutor);
  if (faltan.length > 0) {
    throw ApiError.validacion([
      { campo: "generoIds", codigo: "NO_EXISTE", mensaje: `No existen en el catálogo los géneros: ${faltan.join(", ")}.` },
    ]);
  }
}

/** Lanza 422 si algún tipo de equipo no existe en el catálogo. */
export async function exigirTiposEquipo(campo: string, ids: number[], ejecutor?: Ejecutor): Promise<void> {
  const faltan = await repositorio.tiposEquipoInexistentes(ids, ejecutor);
  if (faltan.length > 0) {
    throw ApiError.validacion([
      { campo, codigo: "NO_EXISTE", mensaje: `No existen en el catálogo los tipos de equipo: ${faltan.join(", ")}.` },
    ]);
  }
}
