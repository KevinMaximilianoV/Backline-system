import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Identificador de correlación (RNF-11): reutiliza el que manda el Gateway en
 * X-Correlation-Id o genera uno nuevo, y lo devuelve en la respuesta.
 */
export function correlacion(req: Request, res: Response, next: NextFunction): void {
  const recibido = req.get("X-Correlation-Id");
  const id = recibido && UUID.test(recibido) ? recibido : randomUUID();
  res.locals.correlationId = id;
  res.setHeader("X-Correlation-Id", id);
  next();
}
