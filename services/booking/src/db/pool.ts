import { crearBaseDatos, type Ejecutor } from "@backline/comun";
import { env } from "../config/env";

/** Conexión a backline_booking con el usuario svc_booking, que no puede entrar a otras bases. */
export const { pool, consultar, enTransaccion } = crearBaseDatos({
  url: env.DATABASE_URL,
  max: env.DB_POOL_MAX,
  servicio: "booking",
});

/**
 * Bandeja de salida (outbox): el evento se escribe en la MISMA transacción que el cambio.
 * Si la transacción se revierte, el evento desaparece con ella; si se confirma, el evento
 * queda garantizado. Así Notificaciones nunca avisa de algo que no pasó, ni deja de avisar
 * algo que sí pasó. El proceso que lo publica en RabbitMQ llega en la siguiente entrega.
 */
export async function registrarEvento(tipo: string, payload: object, ejecutor: Ejecutor): Promise<void> {
  // clock_timestamp() y no now(): now() es la hora de INICIO de la transacción, igual para todos los
  // eventos que se escriben en ella. Con clock_timestamp() quedan en el orden en que ocurrieron
  // (primero SolicitudAceptada y después las SolicitudRechazada que provocó).
  await consultar("INSERT INTO evento_pendiente (tipo, payload, creado_en) VALUES ($1, $2, clock_timestamp())", [tipo, JSON.stringify(payload)], ejecutor);
}
