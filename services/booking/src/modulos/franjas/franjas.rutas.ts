import { requerirRol, usuarioActual, validado, validar } from "@backline/comun";
import { Router } from "express";
import { compatibilidadQuery, franjaNuevaBody, franjaParams, listarFranjasQuery } from "./franjas.esquemas";
import * as servicio from "./franjas.servicio";

/** Rutas de franjas. Todas exigen token (lo aplica app.ts); aquí van los permisos por rol. */
export const rutasFranjas = Router();

/** E-19 POST /franjas (solo foro) */
rutasFranjas.post("/", requerirRol("foro"), validar({ body: franjaNuevaBody }), async (_req, res) => {
  const franja = await servicio.publicar(usuarioActual(res), validado(res, "body", franjaNuevaBody), res.locals.correlationId);
  res.status(201).location(`/api/v1/franjas/${franja.id}`).json(franja);
});

/** E-20 GET /franjas */
rutasFranjas.get("/", validar({ query: listarFranjasQuery }), async (_req, res) => {
  res.json(await servicio.listar(validado(res, "query", listarFranjasQuery)));
});

/** E-21 GET /franjas/{franjaId} */
rutasFranjas.get("/:franjaId", validar({ params: franjaParams }), async (_req, res) => {
  res.json(await servicio.obtener(validado(res, "params", franjaParams).franjaId));
});

/** E-22 DELETE /franjas/{franjaId} (solo el foro dueño) */
rutasFranjas.delete("/:franjaId", requerirRol("foro"), validar({ params: franjaParams }), async (_req, res) => {
  await servicio.retirar(usuarioActual(res), validado(res, "params", franjaParams).franjaId);
  res.status(204).end();
});

/** E-23 GET /franjas/{franjaId}/compatibilidad?bandaId= (solo banda) */
rutasFranjas.get(
  "/:franjaId/compatibilidad",
  requerirRol("banda"),
  validar({ params: franjaParams, query: compatibilidadQuery }),
  async (_req, res) => {
    const { franjaId } = validado(res, "params", franjaParams);
    const { bandaId } = validado(res, "query", compatibilidadQuery);
    res.json(await servicio.compatibilidad(usuarioActual(res), franjaId, bandaId, res.locals.correlationId));
  },
);
