import { readFileSync } from "node:fs";
import { Router } from "express";
import swaggerUi from "swagger-ui-express";
import { parse } from "yaml";

/**
 * Documentación interactiva de la API en /docs (Swagger UI) y el contrato en /docs/openapi.yaml.
 * Se sirve el mismo docs/openapi.yaml que validan las pruebas: no hay una segunda copia que se desactualice.
 */
export function rutasDocumentacion(archivoContrato: string): Router {
  const texto = readFileSync(archivoContrato, "utf8");
  const contrato = parse(texto) as Record<string, unknown>;
  // "Try it out" debe pegarle a este mismo Gateway, sea cual sea el host donde corre
  contrato.servers = [{ url: "/api/v1", description: "Este Gateway" }];

  const rutas = Router();
  // Swagger UI necesita cargar sus scripts, estilos e imágenes: solo aquí se relaja la política
  rutas.use((_req, res, next) => {
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'none'",
    );
    next();
  });
  rutas.get("/openapi.yaml", (_req, res) => {
    res.type("application/yaml").send(texto);
  });
  rutas.use("/", swaggerUi.serve, swaggerUi.setup(contrato, { customSiteTitle: "Backline API" }));
  return rutas;
}
