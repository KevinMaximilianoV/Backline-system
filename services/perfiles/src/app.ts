import express, { type Express } from "express";
import { correlacion } from "./middlewares/correlacion";
import { manejadorErrores, rutaNoEncontrada } from "./middlewares/errores";
import { registroPeticiones } from "./middlewares/registro";
import { rutasBandas } from "./modulos/bandas/bandas.rutas";
import { rutasCatalogos } from "./modulos/catalogos/catalogos.rutas";
import { rutasForos } from "./modulos/foros/foros.rutas";
import { rutasSalud } from "./modulos/salud/salud.rutas";

/**
 * Arma la aplicación sin abrir el puerto. Separarla de server.ts permite
 * levantarla en pruebas sin escuchar en la red.
 * El orden de los middlewares importa: correlación y registro primero, errores al final.
 */
export function crearApp(): Express {
  const app = express();
  app.disable("x-powered-by"); // no anunciar la tecnología del servidor

  app.use(correlacion);
  app.use(registroPeticiones);
  app.use(express.json({ limit: "100kb" }));

  app.use("/salud", rutasSalud);
  app.use("/api/v1/catalogos", rutasCatalogos);
  app.use("/api/v1/bandas", rutasBandas);
  app.use("/api/v1/foros", rutasForos);

  app.use(rutaNoEncontrada);
  app.use(manejadorErrores);
  return app;
}
