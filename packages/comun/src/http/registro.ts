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
      escribir(
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

/**
 * Escritura agrupada (defecto de rendimiento D11). En Linux, escribir a stdout cuando es un pipe
 * (así lo conecta Docker) es SÍNCRONO: con una escritura por petición, el event loop se detenía
 * en cada una. La prueba de carga lo midió: ~100 ms más de p95 con 50 usuarios.
 * Ahora las líneas se juntan y se escriben de una vez al final de cada vuelta del event loop.
 */
let pendientes: string[] = [];

function escribir(linea: string): void {
  pendientes.push(linea);
  if (pendientes.length === 1) setImmediate(vaciar);
}

function vaciar(): void {
  if (pendientes.length === 0) return;
  const lote = `${pendientes.join("\n")}\n`;
  pendientes = [];
  process.stdout.write(lote);
}

// Al apagar, no perder lo que quedó pendiente
process.on("exit", vaciar);
