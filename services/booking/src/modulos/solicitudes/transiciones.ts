import type { Rol } from "@backline/comun";

export type EstadoSolicitud = "solicitada" | "aceptada" | "rechazada" | "confirmada" | "cancelada";

/**
 * Máquina de estados de una solicitud (E-28), escrita como datos y no como if anidados:
 * para saber qué puede hacer cada quien basta con leer la tabla.
 *
 *   foro:  solicitada → aceptada | rechazada;  aceptada → cancelada;  confirmada → cancelada
 *   banda: solicitada → cancelada;  aceptada → confirmada | cancelada;  confirmada → cancelada
 *
 * rechazada y cancelada son finales: desde ahí nadie puede mover la solicitud.
 * El administrador no participa en la negociación entre banda y foro.
 */
const TRANSICIONES: Record<Rol, Partial<Record<EstadoSolicitud, readonly EstadoSolicitud[]>>> = {
  foro: {
    solicitada: ["aceptada", "rechazada"],
    aceptada: ["cancelada"],
    confirmada: ["cancelada"],
  },
  banda: {
    solicitada: ["cancelada"],
    aceptada: ["confirmada", "cancelada"],
    confirmada: ["cancelada"],
  },
  admin: {},
};

export function permitidas(rol: Rol, actual: EstadoSolicitud): readonly EstadoSolicitud[] {
  return TRANSICIONES[rol][actual] ?? [];
}

export function esPermitida(rol: Rol, actual: EstadoSolicitud, nuevo: EstadoSolicitud): boolean {
  return permitidas(rol, actual).includes(nuevo);
}

/** Nombre del evento que se publica para cada estado nuevo. */
export const EVENTO: Record<Exclude<EstadoSolicitud, "solicitada">, string> = {
  aceptada: "SolicitudAceptada",
  rechazada: "SolicitudRechazada",
  confirmada: "SolicitudConfirmada",
  cancelada: "SolicitudCancelada",
};
