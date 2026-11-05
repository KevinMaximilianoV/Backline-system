import type { Request, Response } from "express";
import * as servicio from "./catalogos.servicio";

/** E-06 GET /catalogos/generos */
export async function generos(_req: Request, res: Response): Promise<void> {
  res.json(await servicio.generos());
}

/** E-07 GET /catalogos/tipos-equipo */
export async function tiposEquipo(_req: Request, res: Response): Promise<void> {
  res.json(await servicio.tiposEquipo());
}
