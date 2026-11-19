import { Router } from "express";
import { requerirRol, validar } from "@backline/comun";
import { crearForoBody, foroParams, inventarioBody, listarForosQuery, modificarForoBody } from "./foros.esquemas";
import * as controlador from "./foros.controlador";

export const rutasForos = Router();

rutasForos.get("/", validar({ query: listarForosQuery }), controlador.listar);
rutasForos.post("/", requerirRol("foro"), validar({ body: crearForoBody }), controlador.crear);
rutasForos.get("/:foroId", validar({ params: foroParams }), controlador.obtener);
rutasForos.patch("/:foroId", validar({ params: foroParams, body: modificarForoBody }), controlador.modificar);
rutasForos.delete("/:foroId", validar({ params: foroParams }), controlador.darDeBaja);
rutasForos.get("/:foroId/inventario", validar({ params: foroParams }), controlador.obtenerInventario);
rutasForos.put("/:foroId/inventario", validar({ params: foroParams, body: inventarioBody }), controlador.reemplazarInventario);
