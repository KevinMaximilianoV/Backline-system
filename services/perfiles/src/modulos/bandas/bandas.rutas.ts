import { Router } from "express";
import { validar } from "../../middlewares/validar";
import { bandaParams, crearBandaBody, listarBandasQuery, modificarBandaBody, riderBody } from "./bandas.esquemas";
import * as controlador from "./bandas.controlador";

export const rutasBandas = Router();

rutasBandas.get("/", validar({ query: listarBandasQuery }), controlador.listar);
rutasBandas.post("/", validar({ body: crearBandaBody }), controlador.crear);
rutasBandas.get("/:bandaId", validar({ params: bandaParams }), controlador.obtener);
rutasBandas.patch("/:bandaId", validar({ params: bandaParams, body: modificarBandaBody }), controlador.modificar);
rutasBandas.delete("/:bandaId", validar({ params: bandaParams }), controlador.darDeBaja);
rutasBandas.get("/:bandaId/rider", validar({ params: bandaParams }), controlador.obtenerRider);
rutasBandas.put("/:bandaId/rider", validar({ params: bandaParams, body: riderBody }), controlador.reemplazarRider);
