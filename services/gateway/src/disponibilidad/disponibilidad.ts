import {
  ApiError,
  crearClienteServicio,
  fecha,
  paginacionQuery,
  requerirRol,
  usuarioActual,
  validado,
  validar,
} from "@backline/comun";
import { Router, type RequestHandler } from "express";
import { z } from "zod";
import { env } from "../config/env";

/**
 * E-30 GET /disponibilidad?fecha=&genero= (solo banda)
 *
 * Composición de API: la pregunta "¿qué foros tienen horario libre ese día?" necesita datos de
 * dos servicios. Booking sabe qué franjas están libres; Perfiles sabe qué foros están activos,
 * su nombre, capacidad y géneros. El Gateway pregunta a los dos y arma una sola respuesta,
 * para que la app no tenga que hacer N llamadas ni conocer a cada servicio.
 */

const ZONA_HORARIA = "America/Mexico_City";
const MAX_IDS_POR_CONSULTA = 50; // límite de ?ids= en GET /foros

const disponibilidadQuery = paginacionQuery.extend({
  fecha,
  genero: z.coerce.number().int().positive().optional(),
});

interface Franja {
  id: string;
  foroId: string;
  inicio: string;
  fin: string;
}
interface Foro {
  id: string;
  nombre: string;
  capacidad: number;
  generos: { id: number; nombre: string }[];
}
interface Pagina<T> {
  datos: T[];
  paginacion: { pagina: number; porPagina: number; total: number };
}

const booking = crearClienteServicio({ nombre: "Booking", urlBase: `${env.BOOKING_URL}/api/v1` });
const perfiles = crearClienteServicio({ nombre: "Perfiles", urlBase: `${env.PERFILES_URL}/api/v1` });

function hoyEnQueretaro(): string {
  // en-CA formatea como AAAA-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA_HORARIA }).format(new Date());
}

/** Lee todas las páginas de una lista (las franjas libres de un día son pocas, pero no se asume). */
async function todas<T>(obtener: (pagina: number) => Promise<Pagina<T>>): Promise<T[]> {
  const datos: T[] = [];
  for (let pagina = 1; ; pagina++) {
    const r = await obtener(pagina);
    datos.push(...r.datos);
    if (datos.length >= r.paginacion.total || r.datos.length === 0) return datos;
  }
}

export function rutasDisponibilidad(autenticar: RequestHandler): Router {
  const rutas = Router();

  rutas.get("/", autenticar, requerirRol("banda"), validar({ query: disponibilidadQuery }), async (_req, res) => {
    const consulta = validado(res, "query", disponibilidadQuery);
    if (consulta.fecha < hoyEnQueretaro()) {
      throw ApiError.parametroInvalido([{ campo: "fecha", codigo: "EN_EL_PASADO", mensaje: "La fecha debe ser hoy o posterior." }]);
    }
    const usuario = usuarioActual(res);
    const contexto = { token: usuario.token, correlationId: String(res.locals.correlationId) };

    // 1. Booking: franjas libres de ese día que todavía no empiezan
    const franjas = (
      await todas((pagina) =>
        booking<Pagina<Franja>>(
          `/franjas?desde=${consulta.fecha}&hasta=${consulta.fecha}&estado=libre&porPagina=100&pagina=${pagina}`,
          contexto,
        ).then((r) => r.datos!),
      )
    ).filter((f) => Date.parse(f.inicio) > Date.now());

    // 2. Perfiles: solo los foros activos (y del género pedido) de esas franjas
    const porForo = new Map<string, Franja[]>();
    for (const f of franjas) porForo.set(f.foroId, [...(porForo.get(f.foroId) ?? []), f]);
    const ids = [...porForo.keys()];
    const foros: Foro[] = [];
    for (let i = 0; i < ids.length; i += MAX_IDS_POR_CONSULTA) {
      const lote = ids.slice(i, i + MAX_IDS_POR_CONSULTA).join(",");
      const genero = consulta.genero ? `&genero=${consulta.genero}` : "";
      const r = await perfiles<Pagina<Foro>>(`/foros?ids=${lote}${genero}&porPagina=100`, contexto);
      foros.push(...r.datos!.datos);
    }

    // 3. Unir, ordenar por nombre del foro y paginar
    const datos = foros
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
      .map((foro) => ({
        foro: { id: foro.id, nombre: foro.nombre, capacidad: foro.capacidad, generos: foro.generos.map((g) => g.nombre) },
        franjasLibres: (porForo.get(foro.id) ?? []).map((f) => ({ id: f.id, inicio: f.inicio, fin: f.fin })),
      }));
    const desde = (consulta.pagina - 1) * consulta.porPagina;
    res.json({
      datos: datos.slice(desde, desde + consulta.porPagina),
      paginacion: { pagina: consulta.pagina, porPagina: consulta.porPagina, total: datos.length },
    });
  });

  return rutas;
}
