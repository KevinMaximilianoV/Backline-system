import { consultar, type Ejecutor } from "../db/pool";
import { ApiError } from "../errores/ApiError";

/** Reglas que comparten bandas y foros: un usuario tiene como máximo un perfil, de banda o de foro. */

type TipoPerfil = "banda" | "foro";

/** ¿Ya existe un perfil (activo o dado de baja) con ese id? Un perfil dado de baja no libera su id. */
async function perfilConId(id: string, ejecutor: Ejecutor): Promise<TipoPerfil | null> {
  const [fila] = await consultar<{ tipo: TipoPerfil }>(
    `SELECT 'banda' AS tipo FROM banda WHERE id = $1
     UNION ALL
     SELECT 'foro' FROM foro WHERE id = $1
     LIMIT 1`,
    [id],
    ejecutor,
  );
  return fila?.tipo ?? null;
}

export function perfilDuplicado(tipo: TipoPerfil, id: string): ApiError {
  return ApiError.conflicto("PERFIL_YA_EXISTE", "El perfil ya existe", `Ya existe un perfil de ${tipo} con id ${id}.`);
}

/** Lanza 409 si el id ya tiene un perfil de cualquier tipo. */
export async function exigirIdLibre(tipo: TipoPerfil, id: string, ejecutor: Ejecutor): Promise<void> {
  const existente = await perfilConId(id, ejecutor);
  if (existente === tipo) throw perfilDuplicado(tipo, id);
  if (existente) {
    throw ApiError.conflicto(
      "PERFIL_YA_EXISTE",
      "El perfil ya existe",
      `El id ${id} ya tiene un perfil de ${existente}; una cuenta solo puede tener un perfil.`,
    );
  }
}
