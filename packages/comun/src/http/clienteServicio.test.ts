import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ApiError } from "../errores/ApiError";
import { crearClienteServicio } from "./clienteServicio";

/** Llamadas entre servicios: propagan identidad, respetan un tiempo límite y no filtran errores ajenos. */

let servidor: Server;
let url: string;
let ultimaPeticion: { autorizacion?: string; correlacion?: string } = {};

beforeAll(async () => {
  servidor = createServer((req, res) => {
    ultimaPeticion = { autorizacion: req.headers.authorization, correlacion: req.headers["x-correlation-id"] as string };
    if (req.url === "/lento") return; // nunca responde
    if (req.url === "/no-existe") return res.writeHead(404).end();
    if (req.url === "/falla") return res.writeHead(500).end("stack trace interno");
    res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ nombre: "Foro" }));
  });
  await new Promise<void>((listo) => servidor.listen(0, listo));
  url = `http://localhost:${(servidor.address() as AddressInfo).port}`;
});
afterAll(() => {
  servidor.closeAllConnections();
  servidor.close();
});

const contexto = { token: "token-del-usuario", correlationId: "3f1c2b9a-6d4e-4f8a-9b2c-1e5d7a9c0b11" };

describe("crearClienteServicio", () => {
  it("reenvía el token del usuario y el X-Correlation-Id", async () => {
    const obtener = crearClienteServicio({ nombre: "Perfiles", urlBase: url });
    const r = await obtener<{ nombre: string }>("/ok", contexto);
    expect(r.datos).toEqual({ nombre: "Foro" });
    expect(ultimaPeticion).toEqual({ autorizacion: "Bearer token-del-usuario", correlacion: contexto.correlationId });
  });

  it("un 404 del otro servicio regresa null (no es un error del sistema)", async () => {
    const r = await crearClienteServicio({ nombre: "Perfiles", urlBase: url })("/no-existe", contexto);
    expect(r).toEqual({ status: 404, datos: null });
  });

  it("si el otro servicio no contesta a tiempo: 503, sin colgarse", async () => {
    const inicio = Date.now();
    const error = await crearClienteServicio({ nombre: "Perfiles", urlBase: url, tiempoLimiteMs: 300 })("/lento", contexto).catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(503);
    expect(Date.now() - inicio).toBeLessThan(2_000);
  });

  it("un 500 del otro servicio se vuelve 503 sin repetir su cuerpo", async () => {
    const error = await crearClienteServicio({ nombre: "Perfiles", urlBase: url })("/falla", contexto).catch((e) => e);
    expect(error.status).toBe(503);
    expect(error.message).not.toContain("stack trace");
  });

  it("servicio apagado: 503", async () => {
    const error = await crearClienteServicio({ nombre: "Perfiles", urlBase: "http://localhost:1" })("/x", contexto).catch((e) => e);
    expect(error.status).toBe(503);
  });
});
