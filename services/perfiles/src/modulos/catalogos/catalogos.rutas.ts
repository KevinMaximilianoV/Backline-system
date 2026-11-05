import { Router } from "express";
import * as controlador from "./catalogos.controlador";

export const rutasCatalogos = Router();

rutasCatalogos.get("/generos", controlador.generos);
rutasCatalogos.get("/tipos-equipo", controlador.tiposEquipo);
