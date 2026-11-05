import { Pool, type PoolClient, type QueryResultRow } from "pg";
import { env } from "../config/env";

/**
 * Pool de conexiones a backline_perfiles con el usuario svc_perfiles.
 * Ese usuario no puede conectarse a las bases de otros servicios.
 */
export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: env.DB_POOL_MAX,
  connectionTimeoutMillis: 5_000,
  idleTimeoutMillis: 30_000,
  application_name: "backline-perfiles",
});

/** Algo que puede ejecutar consultas: el pool o una conexión dentro de una transacción. */
export type Ejecutor = Pick<Pool | PoolClient, "query">;

/** Consulta parametrizada. Los valores van en `valores`, nunca concatenados en el SQL. */
export async function consultar<T extends QueryResultRow>(
  sql: string,
  valores: unknown[] = [],
  ejecutor: Ejecutor = pool,
): Promise<T[]> {
  const resultado = await ejecutor.query<T>(sql, valores);
  return resultado.rows;
}

/**
 * Ejecuta `trabajo` dentro de una transacción. Si algo falla, se revierte completa:
 * o se guardan todos los cambios o ninguno.
 */
export async function enTransaccion<T>(trabajo: (cliente: PoolClient) => Promise<T>): Promise<T> {
  const cliente = await pool.connect();
  try {
    await cliente.query("BEGIN");
    const resultado = await trabajo(cliente);
    await cliente.query("COMMIT");
    return resultado;
  } catch (error) {
    await cliente.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    cliente.release();
  }
}
