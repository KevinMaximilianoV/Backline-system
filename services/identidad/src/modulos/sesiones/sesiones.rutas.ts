import { ApiError, validado, validar } from "@backline/comun";
import { Router } from "express";
import { ipKeyGenerator, rateLimit, type RateLimitInfo } from "express-rate-limit";
import { z } from "zod";
import { env } from "../../config/env";
import { correo } from "../usuarios/usuarios.esquemas";
import { iniciarSesion } from "./sesiones.servicio";

const credencialesBody = z.object({ correo, contrasena: z.string().min(1).max(200) }).strict();

/**
 * Freno a la fuerza bruta: máximo N intentos FALLIDOS por minuto para la misma IP y el mismo correo.
 * - Solo cuentan los fallidos (skipSuccessfulRequests): quien escribe bien su contraseña no se bloquea.
 * - La llave combina IP y correo: un atacante no puede probar contraseñas sin fin contra una cuenta,
 *   y varias personas detrás de la misma red (la escuela) no se bloquean entre sí.
 * - Vive aquí y no en el Gateway porque necesita leer el correo y saber si el intento falló.
 * El contador está en memoria: con varias réplicas del servicio habría que moverlo a Redis.
 */
const limiteIntentos = rateLimit({
  windowMs: 60_000,
  limit: env.INTENTOS_SESION_POR_MINUTO,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: (req) => {
    const correoIntentado = typeof req.body?.correo === "string" ? req.body.correo.trim().toLowerCase() : "";
    return `${ipKeyGenerator(req.ip ?? "")}|${correoIntentado}`;
  },
  handler: (req, res, next) => {
    const reinicio = (req as typeof req & { rateLimit?: RateLimitInfo }).rateLimit?.resetTime;
    const segundos = reinicio ? Math.max(1, Math.ceil((reinicio.getTime() - Date.now()) / 1000)) : 60;
    res.setHeader("Retry-After", String(segundos));
    next(ApiError.limiteExcedido(`Demasiados intentos fallidos. Espera ${segundos} segundos e intenta de nuevo.`));
  },
});

export const rutasSesiones = Router();

/** E-02 POST /sesiones (público) */
rutasSesiones.post("/", limiteIntentos, validar({ body: credencialesBody }), async (_req, res) => {
  const { correo: correoValidado, contrasena } = validado(res, "body", credencialesBody);
  const sesion = await iniciarSesion(correoValidado, contrasena);
  // Un token es una credencial: que ningún proxy ni navegador lo guarde en caché
  res.status(201).setHeader("Cache-Control", "no-store").json(sesion);
});
