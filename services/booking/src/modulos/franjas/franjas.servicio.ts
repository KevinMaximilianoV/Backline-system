import {
  ApiError,
  esCheckViolado,
  esExclusionViolada,
  exigirDueno,
  type Pagina,
  type UsuarioAutenticado,
} from "@backline/comun";
import * as perfiles from "../../clientes/perfiles";
import { enTransaccion } from "../../db/pool";
import { calcularFaltantes, type Faltante } from "../../equipo";
import type { FranjaNueva, ListarFranjas } from "./franjas.esquemas";
import * as repositorio from "./franjas.repositorio";

/** Reglas de negocio de las franjas. No sabe nada de HTTP: recibe datos validados y lanza ApiError. */

const HORA = 60 * 60 * 1000;
const DIA = 24 * HORA;
const DURACION_MINIMA = 30 * 60 * 1000;
const DURACION_MAXIMA = 12 * HORA;
const ANTICIPACION_MAXIMA = 365 * DIA;
const RANGO_MAXIMO_DIAS = 92;

export function aFranja(f: repositorio.FilaFranja) {
  return {
    id: f.id,
    foroId: f.foro_id,
    inicio: f.inicio.toISOString(),
    fin: f.fin.toISOString(),
    estado: f.estado as "libre" | "reservada",
    creadoEn: f.creado_en.toISOString(),
  };
}
type Franja = ReturnType<typeof aFranja>;

const noExiste = (id: string) => ApiError.noEncontrado(`No existe una franja vigente con id ${id}.`);

/**
 * E-19: un foro publica un horario libre. Reglas:
 * - el foro debe tener su perfil creado y activo en Perfiles (se pregunta por HTTP);
 * - el inicio no puede ser pasado ni estar a más de un año;
 * - dura entre 30 minutos y 12 horas;
 * - no se encima con otra franja vigente del mismo foro (lo garantiza el EXCLUDE de la base).
 */
export async function publicar(usuario: UsuarioAutenticado, datos: FranjaNueva, correlationId: string): Promise<Franja> {
  const inicio = new Date(datos.inicio);
  const fin = new Date(datos.fin);
  const ahora = Date.now();

  if (inicio.getTime() <= ahora) throw ApiError.reglaNegocio("inicio", "EN_EL_PASADO", "El inicio debe ser una fecha y hora futura.");
  if (inicio.getTime() - ahora > ANTICIPACION_MAXIMA) {
    throw ApiError.reglaNegocio("inicio", "DEMASIADO_LEJOS", "Solo se publican franjas con hasta un año de anticipación.");
  }
  const duracion = fin.getTime() - inicio.getTime();
  if (duracion <= 0) throw ApiError.reglaNegocio("fin", "ANTES_DEL_INICIO", "El fin debe ser posterior al inicio.");
  if (duracion < DURACION_MINIMA) throw ApiError.reglaNegocio("fin", "DEMASIADO_CORTA", "Una franja dura al menos 30 minutos.");
  if (duracion > DURACION_MAXIMA) throw ApiError.reglaNegocio("fin", "DEMASIADO_LARGA", "Una franja dura como máximo 12 horas.");

  const foro = await perfiles.foro(usuario.id, { usuario, correlationId });
  if (!foro) {
    throw ApiError.conflicto("PERFIL_REQUERIDO", "Falta el perfil del foro", "Crea el perfil de tu foro antes de publicar franjas.");
  }

  try {
    return aFranja(await repositorio.insertar(usuario.id, datos.inicio, datos.fin));
  } catch (error) {
    // La restricción EXCLUDE decide, incluso si dos peticiones llegan al mismo tiempo
    if (esExclusionViolada(error)) {
      throw ApiError.conflicto("FRANJA_TRASLAPADA", "La franja se encima con otra", "Ya tienes una franja publicada que se encima con ese horario.");
    }
    throw error;
  }
}

/** E-20: franjas vigentes en un rango de días, con filtros y paginación. */
export async function listar(filtros: ListarFranjas): Promise<Pagina<Franja>> {
  const desde = filtros.desde ?? (await repositorio.hoy());
  const hasta = filtros.hasta ?? sumarDias(desde, 30);
  const dias = (Date.parse(hasta) - Date.parse(desde)) / DIA;
  if (dias < 0) {
    throw ApiError.parametroInvalido([{ campo: "hasta", codigo: "ANTES_DE_DESDE", mensaje: "hasta no puede ser anterior a desde." }]);
  }
  if (dias > RANGO_MAXIMO_DIAS) {
    throw ApiError.parametroInvalido([{ campo: "hasta", codigo: "RANGO_EXCEDIDO", mensaje: `El rango máximo es de ${RANGO_MAXIMO_DIAS} días.` }]);
  }
  const { filas, total } = await repositorio.listar({ ...filtros, desde, hasta });
  return { datos: filas.map(aFranja), paginacion: { pagina: filtros.pagina, porPagina: filtros.porPagina, total } };
}

export async function obtener(id: string): Promise<Franja> {
  const fila = await repositorio.vigente(id);
  if (!fila) throw noExiste(id);
  return aFranja(fila);
}

/**
 * E-22: el foro dueño retira una franja (borrado lógico). No se puede retirar si tiene
 * solicitudes activas: primero hay que rechazarlas o cancelarlas. El trigger de la base
 * aplica la misma regla como respaldo.
 */
export async function retirar(usuario: UsuarioAutenticado, id: string): Promise<void> {
  try {
    await enTransaccion(async (tx) => {
      const franja = await repositorio.vigenteParaActualizar(id, tx);
      if (!franja) throw noExiste(id);
      exigirDueno(usuario, franja.foro_id, "esta franja");
      const activas = await repositorio.solicitudesActivas(id, tx);
      if (activas > 0) {
        throw ApiError.conflicto(
          "FRANJA_CON_SOLICITUDES",
          "La franja tiene solicitudes activas",
          `La franja tiene ${activas} solicitud(es) activa(s). Recházalas o cancélalas antes de retirarla.`,
        );
      }
      await repositorio.retirar(id, tx);
    });
  } catch (error) {
    if (esCheckViolado(error)) {
      throw ApiError.conflicto("FRANJA_CON_SOLICITUDES", "La franja tiene solicitudes activas", "La franja tiene solicitudes activas.");
    }
    throw error;
  }
}

/**
 * E-23: qué equipo le faltaría a la banda en esta franja. Combina datos de dos servicios:
 * la franja (Booking) con el rider de la banda y el inventario del foro (Perfiles).
 */
export async function compatibilidad(
  usuario: UsuarioAutenticado,
  franjaId: string,
  bandaId: string,
  correlationId: string,
): Promise<{ franjaId: string; bandaId: string; compatible: boolean; faltantes: Faltante[] }> {
  if (usuario.id !== bandaId) throw ApiError.sinPermiso("Solo puedes calcular la compatibilidad de tu propia banda.");
  const franja = await repositorio.vigente(franjaId);
  if (!franja) throw noExiste(franjaId);

  const contexto = { usuario, correlationId };
  // Las dos consultas son independientes: se hacen en paralelo
  const [rider, inventario] = await Promise.all([perfiles.rider(bandaId, contexto), perfiles.inventario(franja.foro_id, contexto)]);
  if (!rider) throw ApiError.conflicto("PERFIL_REQUERIDO", "Falta el perfil de la banda", "Crea el perfil de tu banda primero.");
  if (!inventario) throw noExiste(franjaId); // el foro se dio de baja: para la banda, la franja ya no existe

  const faltantes = calcularFaltantes(rider, inventario);
  return { franjaId, bandaId, compatible: faltantes.length === 0, faltantes };
}

function sumarDias(fechaTexto: string, dias: number): string {
  return new Date(Date.parse(fechaTexto) + dias * DIA).toISOString().slice(0, 10);
}
