import type { NextFunction, Request, Response } from "express";

/**
 * Una línea JSON por petición, con el identificador de correlación para seguirla
 * entre servicios: la misma petición tiene el mismo correlationId en el registro
 * del Gateway, de Booking y de Perfiles.
 */
export function registroPeticiones(servicio: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (process.env.NODE_ENV === "test") return next();
    const inicio = process.hrtime.bigint();
    res.on("finish", () => {
      const ms = Number(process.hrtime.bigint() - inicio) / 1e6;
      console.log(
        JSON.stringify({
          nivel: res.statusCode >= 500 ? "error" : "info",
          servicio,
          correlationId: res.locals.correlationId,
          usuario: res.locals.usuario?.id,
          metodo: req.method,
          ruta: req.originalUrl,
          status: res.statusCode,
          ms: Math.round(ms * 10) / 10,
        }),
      );
    });
    next();
  };
}
