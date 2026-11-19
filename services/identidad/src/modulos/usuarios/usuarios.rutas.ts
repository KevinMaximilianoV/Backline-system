import { requerirRol, usuarioActual, validado, validar } from "@backline/comun";
import { Router, type RequestHandler } from "express";
import { cambioEstadoBody, listarUsuariosQuery, registroBody, usuarioParams } from "./usuarios.esquemas";
import * as servicio from "./usuarios.servicio";

/**
 * Rutas de cuentas. El registro es público; lo demás exige token.
 * Los controladores son tan cortos que viven aquí: traducen HTTP y llaman al servicio.
 */
export function rutasUsuarios(autenticar: RequestHandler): Router {
  const rutas = Router();

  /** E-01 POST /usuarios (público) */
  rutas.post("/", validar({ body: registroBody }), async (_req, res) => {
    const usuario = await servicio.registrar(validado(res, "body", registroBody));
    res.status(201).json(usuario);
  });

  /** E-03 GET /usuarios/me */
  rutas.get("/me", autenticar, async (_req, res) => {
    res.json(await servicio.yo(usuarioActual(res)));
  });

  /** E-04 GET /usuarios (solo administrador) */
  rutas.get("/", autenticar, requerirRol("admin"), validar({ query: listarUsuariosQuery }), async (_req, res) => {
    res.json(await servicio.listar(validado(res, "query", listarUsuariosQuery)));
  });

  /** E-05 PATCH /usuarios/{usuarioId} (solo administrador) */
  rutas.patch(
    "/:usuarioId",
    autenticar,
    requerirRol("admin"),
    validar({ params: usuarioParams, body: cambioEstadoBody }),
    async (_req, res) => {
      const { usuarioId } = validado(res, "params", usuarioParams);
      const { estado } = validado(res, "body", cambioEstadoBody);
      res.json(await servicio.cambiarEstado(usuarioActual(res), usuarioId, estado));
    },
  );

  return rutas;
}
