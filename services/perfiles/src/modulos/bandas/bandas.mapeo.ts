import type { FilaBanda, FilaRequisito } from "./bandas.repositorio";

/**
 * Traduce filas de la base (snake_case) a la representación del contrato (camelCase).
 * Separar ambas formas permite cambiar la base sin romper a los consumidores, y al revés.
 */
export function aBanda(fila: FilaBanda) {
  return {
    id: fila.id,
    nombre: fila.nombre,
    integrantes: fila.integrantes,
    generos: fila.generos,
    enlaceDemo: fila.enlace_demo,
    descripcion: fila.descripcion,
    visible: fila.visible,
    creadoEn: fila.creado_en.toISOString(),
    actualizadoEn: fila.actualizado_en.toISOString(),
  };
}

export function aRider(bandaId: string, requisitos: FilaRequisito[], actualizadoEn: Date) {
  return {
    bandaId,
    requisitos: requisitos.map((r) => ({
      tipoEquipoId: r.tipo_equipo_id,
      tipoEquipo: r.tipo_equipo,
      cantidad: r.cantidad,
      notas: r.notas,
    })),
    actualizadoEn: actualizadoEn.toISOString(),
  };
}
