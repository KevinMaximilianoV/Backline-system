import { crearClienteServicio, type UsuarioAutenticado } from "@backline/comun";
import { env } from "../config/env";

/**
 * Lo que Booking necesita saber de Perfiles. Booking NUNCA lee la base de Perfiles:
 * pregunta por su API, con el token del usuario que hizo la petición.
 * Si Perfiles cambia su base, Booking no se entera; solo depende del contrato.
 */

export interface ElementoEquipo {
  tipoEquipoId: number;
  tipoEquipo: string;
  cantidad: number;
}

interface Parte {
  id: string;
  nombre: string;
}

const obtener = crearClienteServicio({ nombre: "Perfiles", urlBase: `${env.PERFILES_URL}/api/v1` });

export interface Contexto {
  usuario: UsuarioAutenticado;
  correlationId: string;
}

const ctx = (c: Contexto) => ({ token: c.usuario.token, correlationId: c.correlationId });

/** Banda activa o null si no existe, se dio de baja o está suspendida. */
export async function banda(id: string, c: Contexto): Promise<Parte | null> {
  return (await obtener<Parte>(`/bandas/${id}`, ctx(c))).datos;
}

export async function foro(id: string, c: Contexto): Promise<Parte | null> {
  return (await obtener<Parte>(`/foros/${id}`, ctx(c))).datos;
}

export async function rider(bandaId: string, c: Contexto): Promise<ElementoEquipo[] | null> {
  const r = await obtener<{ requisitos: ElementoEquipo[] }>(`/bandas/${bandaId}/rider`, ctx(c));
  return r.datos ? r.datos.requisitos.map(soloEquipo) : null;
}

export async function inventario(foroId: string, c: Contexto): Promise<ElementoEquipo[] | null> {
  const r = await obtener<{ elementos: ElementoEquipo[] }>(`/foros/${foroId}/inventario`, ctx(c));
  return r.datos ? r.datos.elementos.map(soloEquipo) : null;
}

/** Solo lo que se guarda en el snapshot: sin notas. */
function soloEquipo(e: ElementoEquipo): ElementoEquipo {
  return { tipoEquipoId: e.tipoEquipoId, tipoEquipo: e.tipoEquipo, cantidad: e.cantidad };
}
