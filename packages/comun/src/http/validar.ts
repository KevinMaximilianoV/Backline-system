import type { NextFunction, Request, Response } from "express";
import type { z } from "zod";
import { ApiError } from "../errores/ApiError";
import { traducirErroresZod } from "../errores/traducirZod";

/** reportInput: el traductor necesita el valor recibido para distinguir "falta" de "tipo incorrecto". */
const OPCIONES = { reportInput: true } as const;

/**
 * Caracteres de control: invisibles, no son texto que una persona escriba, y PostgreSQL rechaza
 * el nulo (\u0000) con un error interno. Se permiten tabulador y saltos de línea (\t \n \r),
 * que sí aparecen en una descripción. (Defecto D1 de la Entrega 7.)
 */
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

/** Ruta del primer texto con caracteres de control dentro de un valor JSON, o null si no hay. */
export function buscarCaracterDeControl(valor: unknown, ruta: string[] = []): string | null {
  if (typeof valor === "string") return CONTROL.test(valor) ? ruta.join(".") || "(valor)" : null;
  if (Array.isArray(valor)) {
    for (let i = 0; i < valor.length; i++) {
      const encontrado = buscarCaracterDeControl(valor[i], [...ruta, String(i)]);
      if (encontrado) return encontrado;
    }
    return null;
  }
  if (typeof valor === "object" && valor !== null) {
    for (const [clave, v] of Object.entries(valor)) {
      const encontrado = buscarCaracterDeControl(v, [...ruta, clave]);
      if (encontrado) return encontrado;
    }
  }
  return null;
}

const errorControl = (campo: string) => [
  { campo, codigo: "CARACTER_NO_PERMITIDO", mensaje: "Contiene caracteres de control que no son texto." },
];

interface Esquemas {
  params?: z.ZodType;
  query?: z.ZodType;
  body?: z.ZodType;
}

/**
 * Valida params, query y body con Zod antes de llegar al controlador.
 * - params o query inválidos: 400 PARAMETRO_INVALIDO
 * - body ausente o que no es objeto JSON: 400 SOLICITUD_MAL_FORMADA
 * - body con campos inválidos: 422 VALIDACION_FALLIDA
 * Los valores ya validados (y convertidos, por ejemplo "2" a 2) quedan en res.locals.
 */
export function validar(esquemas: Esquemas) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const enUrl = buscarCaracterDeControl(req.params) ?? buscarCaracterDeControl(req.query);
    if (enUrl) return next(ApiError.parametroInvalido(errorControl(enUrl)));
    if (esquemas.params) {
      const r = esquemas.params.safeParse(req.params, OPCIONES);
      if (!r.success) return next(ApiError.parametroInvalido(traducirErroresZod(r.error)));
      res.locals.params = r.data;
    }
    if (esquemas.query) {
      const r = esquemas.query.safeParse(req.query, OPCIONES);
      if (!r.success) return next(ApiError.parametroInvalido(traducirErroresZod(r.error)));
      res.locals.query = r.data;
    }
    if (esquemas.body) {
      if (typeof req.body !== "object" || req.body === null || Array.isArray(req.body)) {
        return next(ApiError.malFormada("El cuerpo debe ser un objeto JSON enviado con Content-Type: application/json."));
      }
      const enCuerpo = buscarCaracterDeControl(req.body);
      if (enCuerpo) return next(ApiError.validacion(errorControl(enCuerpo)));
      const r = esquemas.body.safeParse(req.body, OPCIONES);
      if (!r.success) return next(ApiError.validacion(traducirErroresZod(r.error)));
      res.locals.body = r.data;
    }
    next();
  };
}

/** Acceso tipado a lo que dejó `validar` en res.locals. */
export function validado<T extends z.ZodType>(res: Response, parte: "params" | "query" | "body", _esquema: T): z.infer<T> {
  return res.locals[parte] as z.infer<T>;
}
