import { ApiError, esValorDuplicado, restriccion, type Pagina, type UsuarioAutenticado } from "@backline/comun";
import * as perfiles from "../../clientes/perfiles";
import { enTransaccion, registrarEvento } from "../../db/pool";
import { calcularFaltantes } from "../../equipo";
import * as franjas from "../franjas/franjas.repositorio";
import type { CambioEstadoNuevo, ListarSolicitudes, SolicitudNueva } from "./solicitudes.esquemas";
import * as repositorio from "./solicitudes.repositorio";
import { EVENTO, esPermitida, permitidas, type EstadoSolicitud } from "./transiciones";

/** Reglas de negocio de las solicitudes. No sabe nada de HTTP: recibe datos validados y lanza ApiError. */

// ------------------------------------------------------------------ representación

export function aSolicitud(s: repositorio.FilaSolicitud) {
  const guardado = (e: { tipoEquipo: string; cantidad: number }) => ({ tipoEquipo: e.tipoEquipo, cantidad: e.cantidad });
  return {
    id: s.id,
    franjaId: s.franja_id,
    banda: { id: s.banda_id, nombre: s.banda_nombre },
    foro: { id: s.foro_id, nombre: s.foro_nombre },
    inicio: s.inicio.toISOString(),
    fin: s.fin.toISOString(),
    tipoAcuerdo: s.tipo_acuerdo,
    montoMxn: s.monto_mxn === null ? null : Number(s.monto_mxn),
    porcentaje: s.porcentaje,
    notas: s.notas,
    estado: s.estado,
    faltantes: s.faltantes,
    riderAlSolicitar: s.rider_snapshot.map(guardado),
    inventarioAlSolicitar: s.inventario_snapshot.map(guardado),
    creadoEn: s.creado_en.toISOString(),
    actualizadoEn: s.actualizado_en.toISOString(),
  };
}

function aResumen(s: repositorio.FilaSolicitud) {
  return {
    id: s.id,
    banda: { id: s.banda_id, nombre: s.banda_nombre },
    foro: { id: s.foro_id, nombre: s.foro_nombre },
    inicio: s.inicio.toISOString(),
    fin: s.fin.toISOString(),
    estado: s.estado,
    totalFaltantes: s.faltantes.reduce((suma, f) => suma + f.faltan, 0),
  };
}

export function aCambio(c: repositorio.FilaCambio) {
  return {
    id: c.id,
    solicitudId: c.solicitud_id,
    estadoAnterior: c.estado_anterior,
    estadoNuevo: c.estado_nuevo,
    autorUsuarioId: c.autor_usuario_id,
    motivo: c.motivo,
    creadoEn: c.creado_en.toISOString(),
  };
}

/** Lo que viaja en cada evento: suficiente para que Notificaciones arme el aviso sin consultar a nadie. */
function payloadEvento(s: repositorio.FilaSolicitud, anterior: EstadoSolicitud | null, nuevo: EstadoSolicitud, motivo: string | null) {
  return {
    solicitudId: s.id,
    bandaId: s.banda_id,
    bandaNombre: s.banda_nombre,
    foroId: s.foro_id,
    foroNombre: s.foro_nombre,
    inicio: s.inicio.toISOString(),
    estadoNuevo: nuevo,
    estadoAnterior: anterior,
    motivo,
  };
}

// ------------------------------------------------------------------ permisos

/** Solo las dos partes de la solicitud (y el administrador, para consultar) pueden verla. */
function exigirParticipante(usuario: UsuarioAutenticado, s: repositorio.FilaSolicitud): void {
  const participa = usuario.rol === "admin" || usuario.id === s.banda_id || usuario.id === s.foro_id;
  if (!participa) throw ApiError.sinPermiso("Solo la banda y el foro de esta solicitud pueden consultarla.");
}

const noExiste = (id: string) => ApiError.noEncontrado(`No existe una solicitud con id ${id}.`);

// ------------------------------------------------------------------ E-24 crear

/**
 * Una banda pide tocar en una franja. Es la operación que cruza servicios:
 *
 * 1. Lee la franja en Booking: debe existir, estar libre y no haber empezado.
 * 2. Consulta en Perfiles, en paralelo: el rider de la banda y el inventario del foro (cada uno trae
 *    el nombre de su dueño y responde 404 si el perfil no está activo).
 * 3. Calcula los faltantes de equipo (RF-10).
 * 4. Abre la transacción, vuelve a revisar la franja con un bloqueo compartido y guarda la solicitud,
 *    su primer cambio de estado y el evento SolicitudCreada. Todo o nada.
 *
 * Las llamadas HTTP van ANTES de la transacción: tener una transacción abierta mientras se espera
 * a otro servicio retendría el bloqueo de la franja cientos de milisegundos (o segundos si Perfiles
 * está lento). Por eso la franja se revisa dos veces: lo que se leyó en el paso 1 pudo cambiar.
 */
export async function crear(usuario: UsuarioAutenticado, datos: SolicitudNueva, correlationId: string) {
  const franja = await franjas.vigente(datos.franjaId);
  if (!franja) throw ApiError.noEncontrado(`No existe una franja vigente con id ${datos.franjaId}.`);
  exigirFranjaDisponible(franja);

  const contexto = { usuario, correlationId };
  const [banda, foro] = await Promise.all([perfiles.rider(usuario.id, contexto), perfiles.inventario(franja.foro_id, contexto)]);
  if (!banda) {
    throw ApiError.conflicto("PERFIL_REQUERIDO", "Falta el perfil de la banda", "Crea el perfil de tu banda antes de enviar solicitudes.");
  }
  if (!foro) {
    throw ApiError.conflicto("FRANJA_NO_DISPONIBLE", "La franja no está disponible", "El foro de esta franja ya no está activo.");
  }
  const faltantes = calcularFaltantes(banda.equipo, foro.equipo);

  try {
    const creada = await enTransaccion(async (tx) => {
      const actual = await franjas.vigenteCompartida(datos.franjaId, tx);
      if (!actual) throw ApiError.noEncontrado(`No existe una franja vigente con id ${datos.franjaId}.`);
      exigirFranjaDisponible(actual);

      const id = await repositorio.insertar(
        {
          ...datos,
          foroId: actual.foro_id,
          bandaId: usuario.id,
          bandaNombre: banda.nombre,
          foroNombre: foro.nombre,
          rider: banda.equipo,
          inventario: foro.equipo,
          faltantes,
        },
        tx,
      );
      await repositorio.registrarCambio({ solicitudId: id, anterior: null, nuevo: "solicitada", autor: usuario.id, motivo: null }, tx);
      const creada = await repositorio.porId(id, tx);
      if (!creada) throw new Error("La solicitud recién creada no se pudo leer");
      await registrarEvento("SolicitudCreada", payloadEvento(creada, null, "solicitada", null), tx);
      return creada;
    });
    // Lo leído dentro de la transacción es lo que quedó guardado: no hace falta volver a consultarlo
    return aSolicitud(creada);
  } catch (error) {
    // ux_solicitud_banda_franja_activa: una banda no puede tener dos solicitudes activas para la misma franja
    if (esValorDuplicado(error) && restriccion(error) === "ux_solicitud_banda_franja_activa") {
      throw ApiError.conflicto("SOLICITUD_DUPLICADA", "Solicitud duplicada", "Ya tienes una solicitud activa para esta franja.");
    }
    throw error;
  }
}

function exigirFranjaDisponible(franja: franjas.FilaFranja): void {
  if (franja.estado !== "libre") {
    throw ApiError.conflicto("FRANJA_NO_DISPONIBLE", "La franja no está disponible", "La franja ya está reservada por otra banda.");
  }
  if (franja.inicio.getTime() <= Date.now()) {
    throw ApiError.conflicto("FRANJA_NO_DISPONIBLE", "La franja no está disponible", "La franja ya empezó o ya pasó.");
  }
}

// ------------------------------------------------------------------ E-25, E-26, E-27, E-29 consultas

export async function listar(usuario: UsuarioAutenticado, filtros: ListarSolicitudes): Promise<Pagina<ReturnType<typeof aResumen>>> {
  const { filas, total } = await repositorio.listar(usuario, filtros);
  return { datos: filas.map(aResumen), paginacion: { pagina: filtros.pagina, porPagina: filtros.porPagina, total } };
}

export async function obtener(usuario: UsuarioAutenticado, id: string) {
  const s = await repositorio.porId(id);
  if (!s) throw noExiste(id);
  exigirParticipante(usuario, s);
  return aSolicitud(s);
}

export async function historial(usuario: UsuarioAutenticado, id: string) {
  const s = await repositorio.porId(id);
  if (!s) throw noExiste(id);
  exigirParticipante(usuario, s);
  return { datos: (await repositorio.historial(id)).map(aCambio) };
}

export async function cambio(usuario: UsuarioAutenticado, solicitudId: string, cambioId: string) {
  const s = await repositorio.porId(solicitudId);
  if (!s) throw noExiste(solicitudId);
  exigirParticipante(usuario, s);
  const c = await repositorio.cambio(solicitudId, cambioId);
  if (!c) throw ApiError.noEncontrado(`La solicitud no tiene un cambio de estado con id ${cambioId}.`);
  return aCambio(c);
}

// ------------------------------------------------------------------ E-28 cambiar estado

/**
 * Aplica una transición de la máquina de estados (transiciones.ts) en UNA transacción:
 *
 * - aceptar: la franja pasa a reservada y las demás solicitudes pendientes de esa franja se
 *   rechazan solas, cada una con su cambio de estado (autor: el sistema) y su evento;
 * - cancelar algo ya aceptado o confirmado: la franja vuelve a quedar libre;
 * - todo cambio queda en el historial y genera un evento en el outbox.
 *
 * Si cualquier paso falla, no se aplica ninguno. El índice único ux_solicitud_franja_reservada
 * es el respaldo de la base contra la doble reserva, aunque dos aceptaciones llegaran en el mismo instante.
 */
export async function cambiarEstado(usuario: UsuarioAutenticado, id: string, datos: CambioEstadoNuevo) {
  const motivo = datos.motivo ?? null;
  try {
    return await enTransaccion(async (tx) => {
      // Orden fijo de bloqueos: franja y luego solicitud (ver franjas.repositorio.bloquear).
      // Primero se lee la solicitud SIN bloquear, solo para saber cuál es su franja.
      const previa = await repositorio.porId(id, tx);
      if (!previa) throw noExiste(id);
      const franja = await franjas.bloquear(previa.franja_id, tx);
      const s = await repositorio.porIdParaActualizar(id, tx);
      if (!s || !franja) throw noExiste(id);

      // ¿Es parte de la solicitud? La banda solo mueve las suyas; el foro, las de sus franjas.
      const esParte = (usuario.rol === "banda" && s.banda_id === usuario.id) || (usuario.rol === "foro" && s.foro_id === usuario.id);
      if (!esParte) throw ApiError.sinPermiso("Solo la banda o el foro de esta solicitud pueden cambiar su estado.");

      if (!esPermitida(usuario.rol, s.estado, datos.estadoNuevo)) {
        const opciones = permitidas(usuario.rol, s.estado);
        throw ApiError.conflicto(
          "TRANSICION_NO_PERMITIDA",
          "Cambio de estado no permitido",
          `Como ${usuario.rol} no puedes pasar una solicitud de ${s.estado} a ${datos.estadoNuevo}. ` +
            (opciones.length > 0 ? `Desde ${s.estado} puedes pasarla a: ${opciones.join(", ")}.` : `El estado ${s.estado} es final.`),
        );
      }
      if (s.inicio.getTime() <= Date.now()) {
        throw ApiError.conflicto("TRANSICION_NO_PERMITIDA", "La tocada ya empezó", "La franja ya empezó o ya pasó: la solicitud no se puede modificar.");
      }

      const efectos: { franjaEstado?: "libre" | "reservada"; solicitudesRechazadas: string[] } = { solicitudesRechazadas: [] };

      if (datos.estadoNuevo === "aceptada") {
        // La franja ya está bloqueada: dos aceptaciones simultáneas de la misma franja se forman en fila
        if (franja.estado !== "libre") {
          throw ApiError.conflicto("FRANJA_NO_DISPONIBLE", "La franja no está disponible", "La franja ya está reservada por otra solicitud.");
        }
        await franjas.cambiarEstado(s.franja_id, "reservada", tx);
        efectos.franjaEstado = "reservada";
      }

      if (datos.estadoNuevo === "cancelada" && (s.estado === "aceptada" || s.estado === "confirmada")) {
        // Se cae un compromiso: el horario vuelve a estar disponible para otras bandas
        await franjas.cambiarEstado(s.franja_id, "libre", tx);
        efectos.franjaEstado = "libre";
      }

      await repositorio.cambiarEstado(s.id, datos.estadoNuevo, tx);
      const cambio = await repositorio.registrarCambio(
        { solicitudId: s.id, anterior: s.estado, nuevo: datos.estadoNuevo, autor: usuario.id, motivo },
        tx,
      );
      await registrarEvento(EVENTO[datos.estadoNuevo], payloadEvento(s, s.estado, datos.estadoNuevo, motivo), tx);

      if (datos.estadoNuevo === "aceptada") {
        // La franja ya tiene banda: las demás solicitudes pendientes se rechazan solas (autor: el sistema)
        const rechazadas = await repositorio.rechazarPendientesDeFranja(s.franja_id, s.id, tx);
        for (const r of rechazadas) {
          const motivoSistema = "La franja se asignó a otra banda.";
          await repositorio.registrarCambio({ solicitudId: r.id, anterior: "solicitada", nuevo: "rechazada", autor: null, motivo: motivoSistema }, tx);
          await registrarEvento(
            EVENTO.rechazada,
            payloadEvento({ ...s, id: r.id, banda_id: r.banda_id, banda_nombre: r.banda_nombre }, "solicitada", "rechazada", motivoSistema),
            tx,
          );
          efectos.solicitudesRechazadas.push(r.id);
        }
      }

      return { ...aCambio(cambio), efectos };
    });
  } catch (error) {
    if (esValorDuplicado(error) && restriccion(error) === "ux_solicitud_franja_reservada") {
      throw ApiError.conflicto("FRANJA_NO_DISPONIBLE", "La franja no está disponible", "La franja ya está reservada por otra solicitud.");
    }
    throw error;
  }
}
