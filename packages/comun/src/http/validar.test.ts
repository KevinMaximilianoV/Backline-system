import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { uuid } from "../esquemas";
import { manejadorErrores } from "./errores";
import { buscarCaracterDeControl, validado, validar } from "./validar";

const params = z.object({ id: uuid });
const query = z.object({ pagina: z.coerce.number().int().min(1).default(1) });
const body = z.object({ nombre: z.string().min(2), descripcion: z.string().optional() }).strict();

function app() {
  const a = express();
  a.use(express.json());
  a.post("/cosas/:id", validar({ params, query, body }), (_req, res) => {
    res.json({ params: validado(res, "params", params), query: validado(res, "query", query), body: validado(res, "body", body) });
  });
  a.use(manejadorErrores("prueba"));
  return a;
}
const ID = "11111111-1111-1111-1111-111111111111";

describe("validar", () => {
  it("deja pasar datos válidos y convierte tipos de la consulta", async () => {
    const r = await request(app()).post(`/cosas/${ID}?pagina=3`).send({ nombre: "Ana" });
    expect(r.status).toBe(200);
    expect(r.body.query.pagina).toBe(3);
  });

  it("parámetro de ruta inválido: 400 PARAMETRO_INVALIDO", async () => {
    const r = await request(app()).post("/cosas/no-es-uuid").send({ nombre: "Ana" });
    expect(r.status).toBe(400);
    expect(r.body.codigo).toBe("PARAMETRO_INVALIDO");
  });

  it("consulta inválida o repetida: 400", async () => {
    expect((await request(app()).post(`/cosas/${ID}?pagina=0`).send({ nombre: "Ana" })).status).toBe(400);
    expect((await request(app()).post(`/cosas/${ID}?pagina=1&pagina=2`).send({ nombre: "Ana" })).status).toBe(400);
  });

  it("cuerpo que no es objeto JSON: 400 SOLICITUD_MAL_FORMADA", async () => {
    const r = await request(app()).post(`/cosas/${ID}`).set("Content-Type", "application/json").send("[1,2]");
    expect(r.status).toBe(400);
    expect(r.body.codigo).toBe("SOLICITUD_MAL_FORMADA");
  });

  it("campo inválido, faltante o no permitido: 422 con un error por campo", async () => {
    const r = await request(app()).post(`/cosas/${ID}`).send({ nombre: "A", rol: "admin" });
    expect(r.status).toBe(422);
    const codigos = r.body.errores.map((e: { codigo: string }) => e.codigo);
    expect(codigos).toEqual(expect.arrayContaining(["DEMASIADO_CORTO", "CAMPO_NO_PERMITIDO"]));
    const faltante = await request(app()).post(`/cosas/${ID}`).send({});
    expect(faltante.body.errores[0]).toMatchObject({ campo: "nombre", codigo: "REQUERIDO" });
  });

  it("defecto D1: un carácter nulo en el cuerpo responde 422, no 500", async () => {
    const r = await request(app()).post(`/cosas/${ID}`).send({ nombre: "Ana\u0000Ruiz" });
    expect(r.status).toBe(422);
    expect(r.body.errores[0]).toMatchObject({ campo: "nombre", codigo: "CARACTER_NO_PERMITIDO" });
  });

  it("permite saltos de línea y tabuladores en un texto largo", async () => {
    const r = await request(app()).post(`/cosas/${ID}`).send({ nombre: "Ana", descripcion: "Línea 1\nLínea 2\tcon tab" });
    expect(r.status).toBe(200);
  });

  it("buscarCaracterDeControl recorre objetos y listas anidados", () => {
    expect(buscarCaracterDeControl({ a: [{ b: "ok" }, { c: "mal\u0007" }] })).toBe("a.1.c");
    expect(buscarCaracterDeControl({ a: ["ok", 1, null, true] })).toBeNull();
  });
});
