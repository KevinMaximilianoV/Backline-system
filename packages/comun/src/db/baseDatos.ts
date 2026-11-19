import { Pool, type PoolClient, type QueryResultRow } from "pg";

/** Algo que puede ejecutar consultas: el pool o una conexión dentro de una transacción. */
export type Ejecutor = Pick<Pool | PoolClient, "query">;

export interface BaseDatos {
  pool: Pool;
  /** Consulta parametrizada. Los valores van en `valores`, nunca concatenados en el SQL. */
  consultar<T extends QueryResultRow>(sql: string, valores?: unknown[], ejecutor?: Ejecutor): Promise<T[]>;
  /**
   * Ejecuta `trabajo` dentro de una transacción. Si algo falla se revierte completa:
   * o se guardan todos los cambios o ninguno.
   */
  enTransaccion<T>(trabajo: (cliente: PoolClient) => Promise<T>): Promise<T>;
}

/**
 * Pool de conexiones a la base del servicio con su propio usuario (svc_*).
 * Ese usuario no puede conectarse a las bases de otros servicios.
 */
export function crearBaseDatos(opciones: { url: string; max: number; servicio: string }): BaseDatos {
  const pool = new Pool({
    connectionString: opciones.url,
    max: opciones.max,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
    application_name: `backline-${opciones.servicio}`,
  });

  // Una conexión inactiva puede fallar (la base se reinició); sin este listener el proceso se cae
  pool.on("error", (error) => {
    console.error(JSON.stringify({ nivel: "error", servicio: opciones.servicio, evento: "pool", mensaje: error.message }));
  });

  return {
    pool,
    async consultar<T extends QueryResultRow>(sql: string, valores: unknown[] = [], ejecutor: Ejecutor = pool) {
      const resultado = await ejecutor.query<T>(sql, valores);
      return resultado.rows;
    },
    async enTransaccion<T>(trabajo: (cliente: PoolClient) => Promise<T>) {
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
    },
  };
}
