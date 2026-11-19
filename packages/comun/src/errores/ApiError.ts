/** Códigos de error del contrato (docs/openapi.yaml, esquema Problema). */
export type CodigoError =
  | "SOLICITUD_MAL_FORMADA"
  | "PARAMETRO_INVALIDO"
  | "CREDENCIALES_INVALIDAS"
  | "TOKEN_INVALIDO"
  | "TOKEN_EXPIRADO"
  | "CUENTA_SUSPENDIDA"
  | "PERMISO_INSUFICIENTE"
  | "AUTOSUSPENSION_NO_PERMITIDA"
  | "RECURSO_NO_ENCONTRADO"
  | "CORREO_YA_REGISTRADO"
  | "PERFIL_YA_EXISTE"
  | "PERFIL_REQUERIDO"
  | "FRANJA_TRASLAPADA"
  | "FRANJA_NO_DISPONIBLE"
  | "FRANJA_CON_SOLICITUDES"
  | "SOLICITUD_DUPLICADA"
  | "TRANSICION_NO_PERMITIDA"
  | "VALIDACION_FALLIDA"
  | "LIMITE_EXCEDIDO"
  | "ERROR_INTERNO"
  | "SERVICIO_NO_DISPONIBLE";

export interface ErrorCampo {
  campo: string;
  codigo: string;
  mensaje: string;
}

/**
 * Error que un servicio lanza a propósito. El manejador de errores lo convierte
 * en una respuesta Problem Details (RFC 9457) con su código HTTP.
 * Los servicios no escriben respuestas de error a mano: lanzan uno de estos.
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

  static malFormada(detalle: string): ApiError {
    return new ApiError(400, "SOLICITUD_MAL_FORMADA", "La petición está mal formada", detalle);
  }

  static parametroInvalido(errores: ErrorCampo[]): ApiError {
    return new ApiError(400, "PARAMETRO_INVALIDO", "Parámetro inválido", "Revisa los parámetros de la ruta o de la consulta.", errores);
  }

  /** 401: no sabemos quién eres (sin token, token inválido o vencido, credenciales incorrectas). */
  static noAutenticado(
    codigo: "TOKEN_INVALIDO" | "TOKEN_EXPIRADO" | "CREDENCIALES_INVALIDAS",
    detalle: string,
  ): ApiError {
    return new ApiError(401, codigo, "No autenticado", detalle);
  }

  /** 403: sabemos quién eres, pero no puedes hacer esto. */
  static sinPermiso(detalle: string, codigo: CodigoError = "PERMISO_INSUFICIENTE"): ApiError {
    return new ApiError(403, codigo, "Sin permiso", detalle);
  }

  static noEncontrado(detalle: string): ApiError {
    return new ApiError(404, "RECURSO_NO_ENCONTRADO", "Recurso no encontrado", detalle);
  }

  static conflicto(codigo: CodigoError, titulo: string, detalle: string): ApiError {
    return new ApiError(409, codigo, titulo, detalle);
  }

  static validacion(errores: ErrorCampo[], detalle = "Revisa los campos marcados."): ApiError {
    return new ApiError(422, "VALIDACION_FALLIDA", "Los datos enviados no son válidos", detalle, errores);
  }

  /** 422 por una regla de negocio de un solo campo, por ejemplo "el inicio no puede ser pasado". */
  static reglaNegocio(campo: string, codigoCampo: string, mensaje: string): ApiError {
    return ApiError.validacion([{ campo, codigo: codigoCampo, mensaje }], mensaje);
  }

  static limiteExcedido(detalle: string): ApiError {
    return new ApiError(429, "LIMITE_EXCEDIDO", "Demasiados intentos", detalle);
  }

  static noDisponible(detalle: string): ApiError {
    return new ApiError(503, "SERVICIO_NO_DISPONIBLE", "Servicio no disponible", detalle);
  }
}
