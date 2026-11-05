import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";

/** Una línea JSON por petición, con el identificador de correlación para seguirla entre servicios. */
export function registroPeticiones(req: Request, res: Response, next: NextFunction): void {
  if (env.NODE_ENV === "test") return next();
  const inicio = process.hrtime.bigint();
  res.on("finish", () => {
    const ms = Number(process.hrtime.bigint() - inicio) / 1e6;
    console.log(
      JSON.stringify({
        nivel: res.statusCode >= 500 ? "error" : "info",
        servicio: "perfiles",
        correlationId: res.locals.correlationId,
        metodo: req.method,
        ruta: req.originalUrl,
        status: res.statusCode,
        ms: Math.round(ms * 10) / 10,
      }),
    );
  });
  next();
}
