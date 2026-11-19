import { spawn, type ChildProcess } from "node:child_process";
import { resolve } from "node:path";
import { LLAVES_PRUEBA } from "./llaves";

/**
 * Preparación global del proyecto "booking": levanta un servicio Perfiles REAL en el puerto 43202,
 * porque Booking lo consulta por HTTP (banda, rider, foro, inventario). No es un simulacro:
 * así la prueba cubre también la integración entre los dos servicios.
 */
const PUERTO = 43202;
let proceso: ChildProcess | undefined;

export async function setup(): Promise<void> {
  if (process.env.SOLO_UNITARIAS) return; // npm run test:unitarias no necesita base ni servicios
  const raiz = resolve(import.meta.dirname, "..");
  proceso = spawn(process.execPath, ["--import", "tsx", "services/perfiles/src/server.ts"], {
    cwd: raiz,
    env: {
      ...process.env,
      NODE_ENV: "test",
      PORT: String(PUERTO),
      DATABASE_URL:
        process.env.DATABASE_URL_PERFILES ?? "postgresql://svc_perfiles:dev_perfiles@localhost:5432/backline_perfiles",
      JWT_LLAVE_PUBLICA: LLAVES_PRUEBA.publica,
    },
    stdio: ["ignore", "inherit", "inherit"],
  });

  const limite = Date.now() + 20_000;
  while (Date.now() < limite) {
    try {
      const r = await fetch(`http://localhost:${PUERTO}/salud`);
      if (r.ok) return;
    } catch {
      // todavía no arranca
    }
    await new Promise((listo) => setTimeout(listo, 200));
  }
  throw new Error(`Perfiles no respondió en el puerto ${PUERTO}. ¿Está arriba la base de datos?`);
}

export async function teardown(): Promise<void> {
  proceso?.kill("SIGTERM");
}
