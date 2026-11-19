import { resolve } from "node:path";
import { defineConfig } from "vitest/config";
import { LLAVES_PRUEBA } from "./pruebas/llaves.ts";

/**
 * Pruebas de Backline. Un "proyecto" por paquete, porque cada servicio lee SUS variables de
 * entorno (PORT, DATABASE_URL) al arrancar y no pueden convivir en el mismo proceso.
 *
 *   npm run test:unitarias   solo lógica pura: no necesita base ni servicios
 *   npm test                 unitarias + integración contra PostgreSQL (docker compose up)
 *   npm run test:cobertura   lo anterior con reporte de cobertura (umbrales abajo)
 */
const raiz = import.meta.dirname;
const base = (puerto: number) => ({ NODE_ENV: "test", PORT: String(puerto), JWT_LLAVE_PUBLICA: LLAVES_PRUEBA.publica });
const db = (servicio: string) =>
  process.env[`DATABASE_URL_${servicio.toUpperCase()}`] ??
  `postgresql://svc_${servicio}:dev_${servicio}@localhost:5432/backline_${servicio}`;

export default defineConfig({
  resolve: {
    // Las pruebas usan el código fuente del paquete común, no su compilado: así cuenta en la cobertura
    alias: { "@backline/comun": resolve(raiz, "packages/comun/src/index.ts") },
  },
  test: {
    // Las pruebas de integración comparten la base: un archivo a la vez dentro de cada proyecto
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 30_000,
    projects: [
      { extends: true, test: { name: "comun", include: ["packages/comun/src/**/*.test.ts"] } },
      {
        extends: true,
        test: {
          name: "identidad",
          include: ["services/identidad/src/**/*.test.ts"],
          env: { ...base(43101), DATABASE_URL: db("identidad"), JWT_LLAVE_PRIVADA: LLAVES_PRUEBA.privada, BCRYPT_COSTO: "4" },
        },
      },
      {
        extends: true,
        test: { name: "perfiles", include: ["services/perfiles/src/**/*.test.ts"], env: { ...base(43102), DATABASE_URL: db("perfiles") } },
      },
      {
        extends: true,
        test: {
          name: "booking",
          include: ["services/booking/src/**/*.test.ts"],
          env: { ...base(43103), DATABASE_URL: db("booking"), PERFILES_URL: "http://localhost:43202" },
          // Booking consulta a Perfiles por HTTP: las pruebas levantan un Perfiles real en 43202
          globalSetup: ["pruebas/levantarPerfiles.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "gateway",
          include: ["services/gateway/src/**/*.test.ts"],
          env: {
            ...base(43104),
            IDENTIDAD_URL: "http://localhost:1",
            PERFILES_URL: "http://localhost:1",
            BOOKING_URL: "http://localhost:1",
            CORS_ORIGENES: "http://localhost:5173",
            OPENAPI_ARCHIVO: resolve(raiz, "docs/openapi.yaml"),
          },
        },
      },
    ],
    coverage: {
      provider: "v8",
      include: ["packages/comun/src/**/*.ts", "services/*/src/**/*.ts"],
      // index.ts solo reexporta; server.ts solo abre el puerto (lo prueba Postman de punta a punta)
      exclude: ["**/*.test.ts", "**/server.ts", "packages/comun/src/index.ts"],
      reporter: ["text-summary", "text", "html", "json-summary"],
      reportsDirectory: "cobertura",
      thresholds: {
        lines: 70,
        // RNF-10: la lógica de Booking tiene al menos 60 % de cobertura
        "services/booking/src/**": { lines: 60, functions: 60, branches: 60 },
      },
    },
  },
});
