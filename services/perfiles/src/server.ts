import { crearApp } from "./app";
import { env } from "./config/env";
import { pool } from "./db/pool";

// Una conexión inactiva del pool puede fallar (la base se reinició); sin este listener el proceso se cae
pool.on("error", (error) => {
  console.error(JSON.stringify({ nivel: "error", servicio: "perfiles", evento: "pool", mensaje: error.message }));
});

const servidor = crearApp().listen(env.PORT, () => {
  console.log(JSON.stringify({ nivel: "info", servicio: "perfiles", evento: "inicio", puerto: env.PORT, entorno: env.NODE_ENV }));
});

/**
 * Apagado ordenado: deja de aceptar conexiones, termina las peticiones en curso
 * y cierra el pool. Docker manda SIGTERM al detener el contenedor.
 */
function apagar(senal: string): void {
  console.log(JSON.stringify({ nivel: "info", servicio: "perfiles", evento: "apagado", senal }));
  servidor.close(() => {
    pool.end().finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10_000).unref(); // si algo se cuelga, no esperar para siempre
}

process.on("SIGTERM", () => apagar("SIGTERM"));
process.on("SIGINT", () => apagar("SIGINT"));
