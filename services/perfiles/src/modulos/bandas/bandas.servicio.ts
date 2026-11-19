import { enTransaccion } from "../../db/pool";
import { ApiError, exigirDueno, type UsuarioAutenticado } from "@backline/comun";
import { esValorDuplicado } from "@backline/comun";
import type { Pagina } from "@backline/comun";
import { exigirIdLibre, perfilDuplicado } from "../../comun/perfiles";
import { exigirGeneros, exigirTiposEquipo } from "../catalogos/catalogos.servicio";
import type { CrearBanda, ListarBandas, ModificarBanda, RiderEntrada } from "./bandas.esquemas";
import { aBanda, aRider } from "./bandas.mapeo";
import * as repositorio from "./bandas.repositorio";

/** Reglas de negocio de bandas. No sabe nada de HTTP: recibe datos ya validados y lanza ApiError. */

type Banda = ReturnType<typeof aBanda>;

const noExiste = (id: string) => ApiError.noEncontrado(`No existe una banda activa con id ${id}.`);

export async function listar(filtros: ListarBandas): Promise<Pagina<Banda>> {
  const { filas, total } = await repositorio.listarActivas(filtros);
  return { datos: filas.map(aBanda), paginacion: { pagina: filtros.pagina, porPagina: filtros.porPagina, total } };
}

export async function obtener(id: string): Promise<Banda> {
  const fila = await repositorio.obtenerActiva(id);
  if (!fila) throw noExiste(id);
  return aBanda(fila);
}

/** El perfil toma el id de la cuenta del token: cada cuenta crea solo su propio perfil. */
export async function crear(usuario: UsuarioAutenticado, datos: CrearBanda): Promise<Banda> {
  const id = usuario.id;
  try {
    return await enTransaccion(async (tx) => {
      await exigirIdLibre("banda", id, tx);
      await exigirGeneros(datos.generoIds, tx);
      await repositorio.insertar(id, datos, tx);
      const creada = await repositorio.obtenerActiva(id, tx);
      if (!creada) throw new Error("La banda recién creada no se pudo leer");
      return aBanda(creada);
    });
  } catch (error) {
    // Dos peticiones simultáneas con el mismo id: la base rechaza la segunda (llave primaria)
    if (esValorDuplicado(error)) throw perfilDuplicado("banda", id);
    throw error;
  }
}

export async function modificar(usuario: UsuarioAutenticado, id: string, cambios: ModificarBanda): Promise<Banda> {
  exigirDueno(usuario, id, "este perfil");
  return enTransaccion(async (tx) => {
    if (!(await repositorio.bloquearActiva(id, tx))) throw noExiste(id);
    if (cambios.generoIds) await exigirGeneros(cambios.generoIds, tx);
    await repositorio.actualizar(id, cambios, tx);
    const fila = await repositorio.obtenerActiva(id, tx);
    if (!fila) throw noExiste(id);
    return aBanda(fila);
  });
}

export async function darDeBaja(usuario: UsuarioAutenticado, id: string): Promise<void> {
  exigirDueno(usuario, id, "este perfil");
  if (!(await repositorio.darDeBaja(id))) throw noExiste(id);
}

export async function obtenerRider(id: string) {
  const banda = await repositorio.resumenSiActiva(id);
  if (!banda) throw noExiste(id);
  return aRider(id, banda.nombre, await repositorio.obtenerRider(id), banda.actualizado_en);
}

export async function reemplazarRider(usuario: UsuarioAutenticado, id: string, rider: RiderEntrada) {
  exigirDueno(usuario, id, "este perfil");
  return enTransaccion(async (tx) => {
    // El bloqueo evita que dos PUT simultáneos del mismo rider se mezclen
    if (!(await repositorio.bloquearActiva(id, tx))) throw noExiste(id);
    await exigirTiposEquipo("requisitos", rider.requisitos.map((r) => r.tipoEquipoId), tx);
    await repositorio.reemplazarRider(id, rider, tx);
    const banda = await repositorio.obtenerActiva(id, tx);
    if (!banda) throw noExiste(id);
    return aRider(id, banda.nombre, await repositorio.obtenerRider(id, tx), banda.actualizado_en);
  });
}
