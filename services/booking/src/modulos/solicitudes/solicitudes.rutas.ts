import { requerirRol, usuarioActual, validado, validar } from "@backline/comun";
import { Router } from "express";
import { cambioEstadoBody, cambioParams, listarSolicitudesQuery, solicitudNuevaBody, solicitudParams } from "./solicitudes.esquemas";
import * as servicio from "./solicitudes.servicio";

/** Rutas de solicitudes. Todas exigen token (lo aplica app.ts); aquí van los permisos por rol. */
export const rutasSolicitudes = Router();

/** E-24 POST /solicitudes (solo banda) */
rutasSolicitudes.post("/", requerirRol("banda"), validar({ body: solicitudNuevaBody }), async (_req, res) => {
  const solicitud = await servicio.crear(usuarioActual(res), validado(res, "body", solicitudNuevaBody), res.locals.correlationId);
  res.status(201).location(`/api/v1/solicitudes/${solicitud.id}`).json(solicitud);
});

/** E-25 GET /solicitudes */
rutasSolicitudes.get("/", validar({ query: listarSolicitudesQuery }), async (_req, res) => {
  res.json(await servicio.listar(usuarioActual(res), validado(res, "query", listarSolicitudesQuery)));
});

/** E-26 GET /solicitudes/{solicitudId} */
rutasSolicitudes.get("/:solicitudId", validar({ params: solicitudParams }), async (_req, res) => {
  res.json(await servicio.obtener(usuarioActual(res), validado(res, "params", solicitudParams).solicitudId));
});

/** E-27 GET /solicitudes/{solicitudId}/cambios-estado */
rutasSolicitudes.get("/:solicitudId/cambios-estado", validar({ params: solicitudParams }), async (_req, res) => {
  res.json(await servicio.historial(usuarioActual(res), validado(res, "params", solicitudParams).solicitudId));
});

/** E-28 POST /solicitudes/{solicitudId}/cambios-estado (banda o foro de la solicitud) */
rutasSolicitudes.post(
  "/:solicitudId/cambios-estado",
  requerirRol("banda", "foro"),
  validar({ params: solicitudParams, body: cambioEstadoBody }),
  async (_req, res) => {
    const { solicitudId } = validado(res, "params", solicitudParams);
    const cambio = await servicio.cambiarEstado(usuarioActual(res), solicitudId, validado(res, "body", cambioEstadoBody));
    res.status(201).location(`/api/v1/solicitudes/${solicitudId}/cambios-estado/${cambio.id}`).json(cambio);
  },
);

/** E-29 GET /solicitudes/{solicitudId}/cambios-estado/{cambioId} */
rutasSolicitudes.get("/:solicitudId/cambios-estado/:cambioId", validar({ params: cambioParams }), async (_req, res) => {
  const { solicitudId, cambioId } = validado(res, "params", cambioParams);
  res.json(await servicio.cambio(usuarioActual(res), solicitudId, cambioId));
});
