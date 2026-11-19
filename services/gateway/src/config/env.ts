import { leerEntorno, variables } from "@backline/comun";
import { z } from "zod";

/** Configuración del API Gateway, validada al arrancar (ver @backline/comun). */
export const env = leerEntorno(
  z.object({
    NODE_ENV: variables.nodeEnv,
    PORT: variables.puerto(8080),
    JWT_LLAVE_PUBLICA: variables.archivo,
    IDENTIDAD_URL: variables.urlServicio,
    PERFILES_URL: variables.urlServicio,
    BOOKING_URL: variables.urlServicio,
    // Orígenes web que pueden llamar a la API desde un navegador, separados por comas
    CORS_ORIGENES: z
      .string()
      .default("")
      .transform((s) => s.split(",").map((o) => o.trim()).filter(Boolean))
      .pipe(z.array(z.string().regex(/^https?:\/\/[^/]+$/, "cada origen es esquema://host[:puerto], sin ruta"))),
    // Ruta al contrato que se publica en /docs
    OPENAPI_ARCHIVO: z.string().default("../../docs/openapi.yaml"),
  }),
);

/**
 * Tabla de enrutamiento: qué servicio atiende cada prefijo. Es la única parte del sistema
 * que sabe dónde vive cada servicio; el cliente solo conoce http://localhost:8080/api/v1.
 * Notificaciones (/notificaciones) se agregará cuando exista el servicio.
 */
export const RUTAS = [
  { servicio: "identidad", url: env.IDENTIDAD_URL, prefijos: ["/api/v1/usuarios", "/api/v1/sesiones"] },
  { servicio: "perfiles", url: env.PERFILES_URL, prefijos: ["/api/v1/catalogos", "/api/v1/bandas", "/api/v1/foros"] },
  { servicio: "booking", url: env.BOOKING_URL, prefijos: ["/api/v1/franjas", "/api/v1/solicitudes"] },
] as const;
