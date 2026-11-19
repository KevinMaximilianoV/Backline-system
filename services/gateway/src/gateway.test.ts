import request from "supertest";
import { describe, expect, it } from "vitest";
import { token } from "../../../pruebas/ayudas";
import { crearAppGateway } from "./app";

/**
 * Gateway sin servicios detrás (todas las URL apuntan a un puerto cerrado):
 * se prueba lo que es SUYO: CORS, documentación, 503 cuando un servicio cae y la disponibilidad.
 */
const app = crearAppGateway();

describe("CORS (defecto D3)", () => {
  it("responde el preflight de un origen autorizado sin llegar a los servicios", async () => {
    const r = await request(app)
      .options("/api/v1/bandas")
      .set("Origin", "http://localhost:5173")
      .set("Access-Control-Request-Method", "PATCH")
      .set("Access-Control-Request-Headers", "authorization,content-type");
    expect(r.status).toBe(204);
    expect(r.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
    expect(r.headers["access-control-allow-headers"]).toMatch(/Authorization/i);
    expect(r.headers["access-control-expose-headers"]).toContain("X-Correlation-Id");
  });

  it("no autoriza un origen que no está en la lista (ni usa comodín)", async () => {
    const r = await request(app).options("/api/v1/bandas").set("Origin", "https://sitio-malicioso.com").set("Access-Control-Request-Method", "GET");
    expect(r.headers["access-control-allow-origin"]).toBeUndefined();
  });
});

describe("documentación de la API", () => {
  it("publica el contrato y Swagger UI", async () => {
    const yaml = await request(app).get("/docs/openapi.yaml");
    expect(yaml.status).toBe(200);
    expect(yaml.text).toContain("openapi: 3.1.0");
    const ui = await request(app).get("/docs/");
    expect(ui.status).toBe(200);
    expect(ui.text).toContain("swagger-ui");
  });
});

describe("enrutamiento", () => {
  it("si el servicio de destino está caído: 503 con el formato de error de siempre", async () => {
    const r = await request(app).get("/api/v1/bandas").set("Authorization", "Bearer x");
    expect(r.status).toBe(503);
    expect(r.body.codigo).toBe("SERVICIO_NO_DISPONIBLE");
    expect(JSON.stringify(r.body)).not.toMatch(/ECONNREFUSED|localhost:1/);
  });

  it("/salud responde 503 y dice qué servicios no contestan", async () => {
    const r = await request(app).get("/salud");
    expect(r.status).toBe(503);
    expect(r.body.detail).toContain("identidad");
  });

  it("una ruta que ningún servicio atiende: 404", async () => {
    expect((await request(app).get("/api/v1/notificaciones")).status).toBe(404);
  });
});

describe("disponibilidad (E-30)", () => {
  it("exige token y rol banda", async () => {
    expect((await request(app).get("/api/v1/disponibilidad?fecha=2030-01-01")).status).toBe(401);
    const foro = await token({ rol: "foro" });
    expect((await request(app).get("/api/v1/disponibilidad?fecha=2030-01-01").set("Authorization", `Bearer ${foro}`)).status).toBe(403);
  });

  it("valida la fecha: obligatoria, con formato y no pasada", async () => {
    const banda = `Bearer ${await token({ rol: "banda" })}`;
    for (const consulta of ["", "?fecha=mañana", "?fecha=2025-01-01"]) {
      const r = await request(app).get(`/api/v1/disponibilidad${consulta}`).set("Authorization", banda);
      expect(r.status, consulta).toBe(400);
    }
  });

  it("si Booking no responde: 503", async () => {
    const r = await request(app).get("/api/v1/disponibilidad?fecha=2030-01-01").set("Authorization", `Bearer ${await token({ rol: "banda" })}`);
    expect(r.status).toBe(503);
  });
});
