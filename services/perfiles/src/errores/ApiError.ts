/** Códigos de error del contrato (docs/openapi.yaml, esquema Problema) que usa este servicio. */
export type CodigoError =
  | "SOLICITUD_MAL_FORMADA"
  | "PARAMETRO_INVALIDO"
  | "RECURSO_NO_ENCONTRADO"
  | "PERFIL_YA_EXISTE"
  | "VALIDACION_FALLIDA"
  | "ERROR_INTERNO"
  | "SERVICIO_NO_DISPONIBLE";

export interface ErrorCampo {
  campo: string;
  codigo: string;
  mensaje: string;
}

/**
 * Error que el servicio lanza a propósito. El manejador de errores lo convierte
 * en una respuesta Problem Details (RFC 9457) con su código HTTP.
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly codigo: CodigoError,
    public readonly titulo: string,
    detalle: string,
    public readonly errores?: ErrorCampo[],
  ) {
    super(detalle);
    this.name = "ApiError";
  }

  static noEncontrado(detalle: string): ApiError {
    return new ApiError(404, "RECURSO_NO_ENCONTRADO", "Recurso no encontrado", detalle);
  }

  static validacion(errores: ErrorCampo[]): ApiError {
    return new ApiError(422, "VALIDACION_FALLIDA", "Los datos enviados no son válidos", "Revisa los campos marcados.", errores);
  }

  static parametroInvalido(errores: ErrorCampo[]): ApiError {
    return new ApiError(400, "PARAMETRO_INVALIDO", "Parámetro inválido", "Revisa los parámetros de la ruta o de la consulta.", errores);
  }

  static malFormada(detalle: string): ApiError {
    return new ApiError(400, "SOLICITUD_MAL_FORMADA", "La petición está mal formada", detalle);
  }

  static noDisponible(detalle: string): ApiError {
    return new ApiError(503, "SERVICIO_NO_DISPONIBLE", "Servicio no disponible", detalle);
  }

  static conflicto(codigo: CodigoError, titulo: string, detalle: string): ApiError {
    return new ApiError(409, codigo, titulo, detalle);
  }
}
