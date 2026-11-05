import type { NextFunction, Request, Response } from "express";
import { ApiError, type CodigoError } from "../errores/ApiError";
import { esErrorDeConexion } from "../errores/erroresBaseDatos";

/** Rutas que no existen: 404 con el mismo formato que cualquier otro error. */
export function rutaNoEncontrada(req: Request, _res: Response, next: NextFunction): void {
  next(ApiError.noEncontrado(`No existe la ruta ${req.method} ${req.originalUrl}.`));
}

/**
 * Último middleware: convierte cualquier error en Problem Details (RFC 9457).
 * Express 5 envía aquí también los errores de los controladores async, sin try/catch.
 */
export function manejadorErrores(error: unknown, req: Request, res: Response, _next: NextFunction): void {
  const correlationId = String(res.locals.correlationId ?? "");
  const problema = aProblema(error);

  if (problema.status >= 500) {
    // El detalle técnico va al registro, nunca al cliente
    console.error(
      JSON.stringify({
        nivel: "error",
        servicio: "perfiles",
        correlationId,
        ruta: `${req.method} ${req.originalUrl}`,
        error: error instanceof Error ? { nombre: error.name, mensaje: error.message, pila: error.stack } : String(error),
      }),
    );
  }
  if (problema.status === 503) res.setHeader("Retry-After", "30");

  res
    .status(problema.status)
    .type("application/problem+json")
    .json({
      type: `https://api.backline.mx/errores/${problema.codigo.toLowerCase().replaceAll("_", "-")}`,
      title: problema.titulo,
      status: problema.status,
      detail: problema.detalle,
      instance: req.originalUrl,
      codigo: problema.codigo,
      correlationId,
      ...(problema.errores ? { errores: problema.errores } : {}),
    });
}

interface Problema {
  status: number;
  codigo: CodigoError;
  titulo: string;
  detalle: string;
  errores?: ApiError["errores"];
}

function aProblema(error: unknown): Problema {
  if (error instanceof ApiError) {
    return { status: error.status, codigo: error.codigo, titulo: error.titulo, detalle: error.message, errores: error.errores };
  }
  // JSON mal formado: lo detecta express.json() antes de llegar a las rutas
  if (esErrorDeExpress(error, "entity.parse.failed")) {
    return { status: 400, codigo: "SOLICITUD_MAL_FORMADA", titulo: "La petición está mal formada", detalle: "El cuerpo no es un JSON válido." };
  }
  if (esErrorDeExpress(error, "entity.too.large")) {
    return { status: 400, codigo: "SOLICITUD_MAL_FORMADA", titulo: "La petición está mal formada", detalle: "El cuerpo excede el tamaño permitido." };
  }
  if (esErrorDeConexion(error)) {
    return {
      status: 503,
      codigo: "SERVICIO_NO_DISPONIBLE",
      titulo: "Servicio no disponible",
      detalle: "La base de datos no está disponible. Intenta de nuevo en unos segundos.",
    };
  }
  return { status: 500, codigo: "ERROR_INTERNO", titulo: "Error interno", detalle: "Ocurrió un error inesperado. Reporta el correlationId al equipo." };
}

function esErrorDeExpress(error: unknown, tipo: string): boolean {
  return typeof error === "object" && error !== null && (error as { type?: string }).type === tipo;
}
