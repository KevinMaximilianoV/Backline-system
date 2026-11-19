import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../errores/ApiError";
import { crearApp } from "./app";
import { manejadorErrores, rutaNoEncontrada } from "./errores";

/** Los errores son entendibles para el cliente y no revelan información interna. */

function app(lanzar: () => unknown) {
  const a = express();
  a.use(express.json({ limit: "1kb" }));
  a.get("/falla", () => {
    throw lanzar();
  });
  a.get("/recurso/:id", (_req, res) => {
    res.json({ ok: true });
  });
  a.post("/eco", (req, res) => {
    res.json(req.body);
  });
  a.use(rutaNoEncontrada);
  a.use(manejadorErrores("prueba"));
  return a;
}

describe("manejador de errores (Problem Details, RFC 9457)", () => {
  it("un error inesperado responde 500 genérico, sin mensaje, pila ni SQL", async () => {
    const consola = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const secreto = new Error('relation "usuario" column hash_contrasena: password=dev_identidad');
    const r = await request(app(() => secreto)).get("/falla");
    expect(r.status).toBe(500);
    expect(r.headers["content-type"]).toContain("application/problem+json");
    expect(r.body.codigo).toBe("ERROR_INTERNO");
    const texto = JSON.stringify(r.body);
    for (const fuga of ["hash_contrasena", "dev_identidad", 'relation "usuario"', "    at ", "stack"]) expect(texto).not.toContain(fuga);
    // ...pero el detalle sí queda en el registro, con el mismo correlationId
    expect(consola).toHaveBeenCalledOnce();
    expect(String(consola.mock.calls[0]?.[0])).toContain("hash_contrasena");
    consola.mockRestore();
  });

  it("un ApiError conserva su status, código y errores de campo", async () => {
    const r = await request(app(() => ApiError.validacion([{ campo: "x", codigo: "REQUERIDO", mensaje: "falta" }]))).get("/falla");
    expect(r.status).toBe(422);
    expect(r.body).toMatchObject({ codigo: "VALIDACION_FALLIDA", errores: [{ campo: "x" }] });
  });

  it("la base caída responde 503 con Retry-After, no 500", async () => {
    const r = await request(app(() => Object.assign(new Error("connect ECONNREFUSED"), { code: "ECONNREFUSED" }))).get("/falla");
    expect(r.status).toBe(503);
    expect(r.headers["retry-after"]).toBe("30");
  });

  it("JSON mal formado responde 400, no 500", async () => {
    const r = await request(app(() => null)).post("/eco").set("Content-Type", "application/json").send('{"a": ');
    expect(r.status).toBe(400);
    expect(r.body.codigo).toBe("SOLICITUD_MAL_FORMADA");
  });

  it("un cuerpo demasiado grande responde 400", async () => {
    const r = await request(app(() => null)).post("/eco").send({ texto: "x".repeat(5_000) });
    expect(r.status).toBe(400);
    expect(r.body.detail).toMatch(/tamaño/);
  });

  it("defecto D2: un escape inválido en la URL responde 400, no 500", async () => {
    const r = await request(app(() => null)).get("/recurso/%E0%A4%A");
    expect(r.status).toBe(400);
    expect(r.body.codigo).toBe("SOLICITUD_MAL_FORMADA");
  });

  it("defecto D5: el 404 recorta la ruta que repite", async () => {
    const r = await request(app(() => null)).get(`/${"a".repeat(3000)}`);
    expect(r.status).toBe(404);
    expect(r.body.detail.length).toBeLessThan(260);
    expect(r.body.instance.length).toBeLessThan(210);
  });
});

describe("crearApp", () => {
  it("defecto D4: agrega cabeceras de seguridad y no anuncia Express", async () => {
    const a = crearApp({ servicio: "prueba", rutas: () => undefined });
    const r = await request(a).get("/salud");
    expect(r.status).toBe(200);
    expect(r.headers["x-powered-by"]).toBeUndefined();
    expect(r.headers["x-content-type-options"]).toBe("nosniff");
    expect(r.headers["content-security-policy"]).toContain("default-src 'none'");
    expect(r.headers["x-correlation-id"]).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("reutiliza un X-Correlation-Id válido y descarta uno que no es UUID", async () => {
    const a = crearApp({ servicio: "prueba", rutas: () => undefined });
    const id = "3f1c2b9a-6d4e-4f8a-9b2c-1e5d7a9c0b11";
    expect((await request(a).get("/salud").set("X-Correlation-Id", id)).headers["x-correlation-id"]).toBe(id);
    const inyectado = (await request(a).get("/salud").set("X-Correlation-Id", '"}{"nivel":"falso')).headers["x-correlation-id"];
    expect(inyectado).toMatch(/^[0-9a-f-]{36}$/);
  });
});
