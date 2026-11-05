import type { Request, Response } from "express";
import { validado } from "../../middlewares/validar";
import { crearForoBody, foroParams, inventarioBody, listarForosQuery, modificarForoBody } from "./foros.esquemas";
import * as servicio from "./foros.servicio";

/**
 * Controladores de foros: traducen HTTP a llamadas al servicio y deciden el código de respuesta.
 * Los errores no se atrapan aquí: Express 5 los envía al manejador de errores.
 */

/** E-14 GET /foros */
export async function listar(_req: Request, res: Response): Promise<void> {
  res.json(await servicio.listar(validado(res, "query", listarForosQuery)));
}

/** E-13 POST /foros */
export async function crear(_req: Request, res: Response): Promise<void> {
  const foro = await servicio.crear(validado(res, "body", crearForoBody));
  res.status(201).location(`/api/v1/foros/${foro.id}`).json(foro);
}

/** E-15 GET /foros/{foroId} */
export async function obtener(_req: Request, res: Response): Promise<void> {
  const { foroId } = validado(res, "params", foroParams);
  res.json(await servicio.obtener(foroId));
}

/** E-16 PATCH /foros/{foroId} */
export async function modificar(_req: Request, res: Response): Promise<void> {
  const { foroId } = validado(res, "params", foroParams);
  res.json(await servicio.modificar(foroId, validado(res, "body", modificarForoBody)));
}

/** DELETE /foros/{foroId} (agregado en la Entrega 5): baja lógica */
export async function darDeBaja(_req: Request, res: Response): Promise<void> {
  const { foroId } = validado(res, "params", foroParams);
  await servicio.darDeBaja(foroId);
  res.status(204).end();
}

/** E-17 GET /foros/{foroId}/inventario */
export async function obtenerInventario(_req: Request, res: Response): Promise<void> {
  const { foroId } = validado(res, "params", foroParams);
  res.json(await servicio.obtenerInventario(foroId));
}

/** E-18 PUT /foros/{foroId}/inventario */
export async function reemplazarInventario(_req: Request, res: Response): Promise<void> {
  const { foroId } = validado(res, "params", foroParams);
  res.json(await servicio.reemplazarInventario(foroId, validado(res, "body", inventarioBody)));
}
