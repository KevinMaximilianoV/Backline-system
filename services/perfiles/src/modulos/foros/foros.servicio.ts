import { enTransaccion } from "../../db/pool";
import { ApiError, exigirDueno, type UsuarioAutenticado } from "@backline/comun";
import { esValorDuplicado } from "@backline/comun";
import type { Pagina } from "@backline/comun";
import { exigirIdLibre, perfilDuplicado } from "../../comun/perfiles";
import { exigirGeneros, exigirTiposEquipo } from "../catalogos/catalogos.servicio";
import type { CrearForo, InventarioEntrada, ListarForos, ModificarForo } from "./foros.esquemas";
import { aForo, aInventario } from "./foros.mapeo";
import * as repositorio from "./foros.repositorio";

/** Reglas de negocio de foros. No sabe nada de HTTP: recibe datos ya validados y lanza ApiError. */

type Foro = ReturnType<typeof aForo>;

const noExiste = (id: string) => ApiError.noEncontrado(`No existe un foro activo con id ${id}.`);

export async function listar(filtros: ListarForos): Promise<Pagina<Foro>> {
  const { filas, total } = await repositorio.listarActivos(filtros);
  return { datos: filas.map(aForo), paginacion: { pagina: filtros.pagina, porPagina: filtros.porPagina, total } };
}

export async function obtener(id: string): Promise<Foro> {
  const fila = await repositorio.obtenerActivo(id);
  if (!fila) throw noExiste(id);
  return aForo(fila);
}

/** El perfil toma el id de la cuenta del token: cada cuenta crea solo su propio perfil. */
export async function crear(usuario: UsuarioAutenticado, datos: CrearForo): Promise<Foro> {
  const id = usuario.id;
  try {
    return await enTransaccion(async (tx) => {
      await exigirIdLibre("foro", id, tx);
      await exigirGeneros(datos.generoIds, tx);
      await repositorio.insertar(id, datos, tx);
      const creado = await repositorio.obtenerActivo(id, tx);
      if (!creado) throw new Error("El foro recién creado no se pudo leer");
      return aForo(creado);
    });
  } catch (error) {
    // Dos peticiones simultáneas con el mismo id: la base rechaza la segunda (llave primaria)
    if (esValorDuplicado(error)) throw perfilDuplicado("foro", id);
    throw error;
  }
}

export async function modificar(usuario: UsuarioAutenticado, id: string, cambios: ModificarForo): Promise<Foro> {
  exigirDueno(usuario, id, "este perfil");
  return enTransaccion(async (tx) => {
    if (!(await repositorio.bloquearActivo(id, tx))) throw noExiste(id);
    if (cambios.generoIds) await exigirGeneros(cambios.generoIds, tx);
    await repositorio.actualizar(id, cambios, tx);
    const fila = await repositorio.obtenerActivo(id, tx);
    if (!fila) throw noExiste(id);
    return aForo(fila);
  });
}

export async function darDeBaja(usuario: UsuarioAutenticado, id: string): Promise<void> {
  exigirDueno(usuario, id, "este perfil");
  if (!(await repositorio.darDeBaja(id))) throw noExiste(id);
}

export async function obtenerInventario(id: string) {
  const foro = await repositorio.obtenerActivo(id);
  if (!foro) throw noExiste(id);
  return aInventario(id, await repositorio.obtenerInventario(id), foro.actualizado_en);
}

export async function reemplazarInventario(usuario: UsuarioAutenticado, id: string, inventario: InventarioEntrada) {
  exigirDueno(usuario, id, "este perfil");
  return enTransaccion(async (tx) => {
    // El bloqueo evita que dos PUT simultáneos del mismo inventario se mezclen
    if (!(await repositorio.bloquearActivo(id, tx))) throw noExiste(id);
    await exigirTiposEquipo("elementos", inventario.elementos.map((e) => e.tipoEquipoId), tx);
    await repositorio.reemplazarInventario(id, inventario, tx);
    const foro = await repositorio.obtenerActivo(id, tx);
    if (!foro) throw noExiste(id);
    return aInventario(id, await repositorio.obtenerInventario(id, tx), foro.actualizado_en);
  });
}
