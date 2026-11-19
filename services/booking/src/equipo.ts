import type { ElementoEquipo } from "./clientes/perfiles";

export interface Faltante {
  tipoEquipoId: number;
  tipoEquipo: string;
  requerido: number;
  disponible: number;
  faltan: number;
}

/**
 * RF-10: qué equipo del rider de la banda no cubre el inventario del foro.
 * Un tipo de equipo falta si la banda requiere más unidades de las que el foro tiene.
 * Los faltantes no impiden solicitar: informan al foro qué tendría que conseguir la banda.
 */
export function calcularFaltantes(rider: ElementoEquipo[], inventario: ElementoEquipo[]): Faltante[] {
  const disponibles = new Map(inventario.map((e) => [e.tipoEquipoId, e.cantidad]));
  return rider
    .map((r) => {
      const disponible = disponibles.get(r.tipoEquipoId) ?? 0;
      return { tipoEquipoId: r.tipoEquipoId, tipoEquipo: r.tipoEquipo, requerido: r.cantidad, disponible, faltan: r.cantidad - disponible };
    })
    .filter((f) => f.faltan > 0)
    .sort((a, b) => a.tipoEquipoId - b.tipoEquipoId);
}
