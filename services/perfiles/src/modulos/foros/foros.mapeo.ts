import type { FilaElemento, FilaForo } from "./foros.repositorio";

/** Traduce filas de la base (snake_case) a la representación del contrato (camelCase). */
export function aForo(fila: FilaForo) {
  return {
    id: fila.id,
    nombre: fila.nombre,
    direccion: fila.direccion,
    capacidad: fila.capacidad,
    generos: fila.generos,
    descripcion: fila.descripcion,
    visible: fila.visible,
    creadoEn: fila.creado_en.toISOString(),
    actualizadoEn: fila.actualizado_en.toISOString(),
  };
}

export function aInventario(foroId: string, elementos: FilaElemento[], actualizadoEn: Date) {
  return {
    foroId,
    elementos: elementos.map((e) => ({
      tipoEquipoId: e.tipo_equipo_id,
      tipoEquipo: e.tipo_equipo,
      cantidad: e.cantidad,
      notas: e.notas,
    })),
    actualizadoEn: actualizadoEn.toISOString(),
  };
}
