import type { Server } from "node:http";
import express, { type Express } from "express";
import type { Pool } from "pg";
import { ApiError } from "../errores/ApiError";
import { correlacion } from "./correlacion";
import { manejadorErrores, rutaNoEncontrada } from "./errores";
import { registroPeticiones } from "./registro";

/**
 * Arma una aplicación Express con los middlewares que todos los servicios comparten,
 * en el orden correcto: correlación y registro primero, después el cuerpo JSON.
 * `rutas` agrega lo propio del servicio; al final van el 404 y el manejador de errores.
 */
export function crearApp(opciones: {
  servicio: string;
  rutas: (app: Express) => void;
  /** Pool de la base: si se da, /salud también comprueba la base. */
  pool?: Pool;
  /** Cuántos proxies hay delante (el Gateway), para leer la IP real en X-Forwarded-For. */
  confiarEnProxy?: boolean;
  /** El Gateway reenvía cuerpos sin leerlos: no debe parsear JSON. */
  sinCuerpoJson?: boolean;
  /** Comprobación extra para /salud (el Gateway revisa a los servicios que tiene detrás). */
  saludExtra?: () => Promise<Record<string, unknown>>;
}): Express {
  const app = express();
  app.disable("x-powered-by"); // no anunciar la tecnología del servidor
  if (opciones.confiarEnProxy) app.set("trust proxy", "loopback");

  app.use(correlacion);
  app.use(registroPeticiones(opciones.servicio));
  if (!opciones.sinCuerpoJson) app.use(express.json({ limit: "100kb" }));

  // Salud: el orquestador (Docker, el Gateway) pregunta si el servicio puede atender.
  // Responde 200 solo si además alcanza su base; si no, 503 para que deje de mandarle tráfico.
  app.get("/salud", async (_req, res) => {
    const inicio = Date.now();
    if (opciones.pool) {
      try {
        await opciones.pool.query("SELECT 1");
      } catch {
        throw ApiError.noDisponible(`La base de datos de ${opciones.servicio} no responde.`);
      }
    }
    const extra = opciones.saludExtra ? await opciones.saludExtra() : {};
    res.json({
      estado: "ok",
      servicio: opciones.servicio,
      ...(opciones.pool ? { baseDeDatos: { estado: "ok", ms: Date.now() - inicio } } : {}),
      ...extra,
    });
  });

  opciones.rutas(app);

  app.use(rutaNoEncontrada);
  app.use(manejadorErrores(opciones.servicio));
  return app;
}

/**
 * Abre el puerto y apaga en orden: deja de aceptar conexiones, termina las peticiones
 * en curso y cierra el pool. Docker manda SIGTERM al detener el contenedor.
 */
export function iniciarServidor(opciones: { app: Express; puerto: number; servicio: string; entorno: string; pool?: Pool }): Server {
  const { servicio } = opciones;
  const servidor = opciones.app.listen(opciones.puerto, () => {
    console.log(JSON.stringify({ nivel: "info", servicio, evento: "inicio", puerto: opciones.puerto, entorno: opciones.entorno }));
  });

  const apagar = (senal: string) => {
    console.log(JSON.stringify({ nivel: "info", servicio, evento: "apagado", senal }));
    servidor.close(() => {
      const cerrarPool = opciones.pool ? opciones.pool.end() : Promise.resolve();
      cerrarPool.finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10_000).unref(); // si algo se cuelga, no esperar para siempre
  };
  process.on("SIGTERM", () => apagar("SIGTERM"));
  process.on("SIGINT", () => apagar("SIGINT"));
  return servidor;
}
