/**
 * Clasifica los errores de PostgreSQL por su código SQLSTATE.
 * https://www.postgresql.org/docs/16/errcodes-appendix.html
 */
interface ErrorPg {
  code?: string;
  constraint?: string;
}

const CONEXION = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "ENOTFOUND",
  "57P01", // admin_shutdown: la base se está apagando
  "57P03", // cannot_connect_now: la base está arrancando
  "08000", // connection_exception
  "08003", // connection_does_not_exist
  "08006", // connection_failure
]);

function codigo(error: unknown): string | undefined {
  return typeof error === "object" && error !== null ? (error as ErrorPg).code : undefined;
}

/** La base no está disponible: el problema no es del cliente y se puede reintentar. */
export function esErrorDeConexion(error: unknown): boolean {
  const c = codigo(error);
  if (c && CONEXION.has(c)) return true;
  // pg lanza este mensaje cuando se agota el tiempo para obtener una conexión del pool
  return error instanceof Error && /timeout exceeded when trying to connect/i.test(error.message);
}

/** Violación de una restricción UNIQUE o PRIMARY KEY. */
export function esValorDuplicado(error: unknown): boolean {
  return codigo(error) === "23505";
}

/** Violación de llave foránea. */
export function esLlaveForaneaInvalida(error: unknown): boolean {
  return codigo(error) === "23503";
}
