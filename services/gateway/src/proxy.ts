import { ApiError, manejadorErrores } from "@backline/comun";
import type { Request, RequestHandler, Response } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";

/**
 * Reenvía las peticiones de ciertos prefijos a un servicio, sin tocar el cuerpo ni la respuesta.
 * - Agrega X-Forwarded-For (xfwd): el servicio ve la IP real del cliente, no la del Gateway.
 * - Reenvía el X-Correlation-Id: la misma petición se sigue en el registro de ambos.
 * - Si el servicio está caído o tarda demasiado, responde 503 con el formato de error de siempre.
 */
export function proxyHacia(servicio: string, url: string, prefijos: readonly string[]): RequestHandler {
  const responderError = manejadorErrores("gateway");

  return createProxyMiddleware<Request, Response>({
    target: url,
    pathFilter: (ruta) => prefijos.some((p) => ruta === p || ruta.startsWith(`${p}/`) || ruta.startsWith(`${p}?`)),
    xfwd: true,
    proxyTimeout: 10_000,
    on: {
      proxyReq: (proxyReq, _req, res) => {
        proxyReq.setHeader("X-Correlation-Id", String(res.locals.correlationId));
      },
      error: (_error, req, res) => {
        const respuesta = res as Response;
        if (respuesta.headersSent) return;
        responderError(
          ApiError.noDisponible(`El servicio ${servicio} no está disponible. Intenta de nuevo en unos segundos.`),
          req as Request,
          respuesta,
          () => undefined,
        );
      },
    },
  });
}
