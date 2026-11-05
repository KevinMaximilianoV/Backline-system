import type { Request, Response } from "express";
import { validado } from "../../middlewares/validar";
import { bandaParams, crearBandaBody, listarBandasQuery, modificarBandaBody, riderBody } from "./bandas.esquemas";
import * as servicio from "./bandas.servicio";

/**
 * Controladores de bandas: traducen HTTP a llamadas al servicio y deciden el código de respuesta.
 * Los errores no se atrapan aquí: Express 5 los envía al manejador de errores.
 */

/** GET /bandas (agregado en la Entrega 5) */
export async function listar(_req: Request, res: Response): Promise<void> {
  res.json(await servicio.listar(validado(res, "query", listarBandasQuery)));
}

/** E-08 POST /bandas */
export async function crear(_req: Request, res: Response): Promise<void> {
  const banda = await servicio.crear(validado(res, "body", crearBandaBody));
  res.status(201).location(`/api/v1/bandas/${banda.id}`).json(banda);
}

/** E-09 GET /bandas/{bandaId} */
export async function obtener(_req: Request, res: Response): Promise<void> {
  const { bandaId } = validado(res, "params", bandaParams);
  res.json(await servicio.obtener(bandaId));
}

/** E-10 PATCH /bandas/{bandaId} */
export async function modificar(_req: Request, res: Response): Promise<void> {
  const { bandaId } = validado(res, "params", bandaParams);
  res.json(await servicio.modificar(bandaId, validado(res, "body", modificarBandaBody)));
}

/** DELETE /bandas/{bandaId} (agregado en la Entrega 5): baja lógica */
export async function darDeBaja(_req: Request, res: Response): Promise<void> {
  const { bandaId } = validado(res, "params", bandaParams);
  await servicio.darDeBaja(bandaId);
  res.status(204).end();
}

/** E-11 GET /bandas/{bandaId}/rider */
export async function obtenerRider(_req: Request, res: Response): Promise<void> {
  const { bandaId } = validado(res, "params", bandaParams);
  res.json(await servicio.obtenerRider(bandaId));
}

/** E-12 PUT /bandas/{bandaId}/rider */
export async function reemplazarRider(_req: Request, res: Response): Promise<void> {
  const { bandaId } = validado(res, "params", bandaParams);
  res.json(await servicio.reemplazarRider(bandaId, validado(res, "body", riderBody)));
}
