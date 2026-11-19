import { createHmac, generateKeyPairSync } from "node:crypto";
import { readFileSync } from "node:fs";
import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { token } from "../../../../pruebas/ayudas";
import { LLAVES_PRUEBA } from "../../../../pruebas/llaves";
import { manejadorErrores } from "../http/errores";
import { crearAutenticacion, exigirDueno, requerirRol, usuarioActual } from "./jwt";

/** RNF-02: token ausente, alterado o vencido recibe 401. Más los ataques conocidos contra JWT. */

const autenticar = crearAutenticacion(readFileSync(LLAVES_PRUEBA.publica, "utf8"));

function app() {
  const a = express();
  a.get("/protegido", autenticar, (_req, res) => {
    res.json(usuarioActual(res));
  });
  a.get("/solo-foro", autenticar, requerirRol("foro"), (_req, res) => {
    res.json({ ok: true });
  });
  a.use(manejadorErrores("prueba"));
  return a;
}

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");

describe("autenticación con JWT RS256", () => {
  it("acepta un token válido y expone id y rol", async () => {
    const t = await token({ sub: "11111111-1111-1111-1111-111111111111", rol: "banda" });
    const r = await request(app()).get("/protegido").set("Authorization", `Bearer ${t}`);
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ id: "11111111-1111-1111-1111-111111111111", rol: "banda" });
  });

  it.each([
    ["sin encabezado", undefined],
    ["esquema que no es Bearer", "Basic dXN1YXJpbzpjbGF2ZQ=="],
    ["Bearer sin token", "Bearer "],
    ["basura", "Bearer esto.no.es-un-jwt"],
  ])("rechaza %s con 401 TOKEN_INVALIDO", async (_caso, encabezado) => {
    const r = request(app()).get("/protegido");
    if (encabezado) r.set("Authorization", encabezado);
    const res = await r;
    expect(res.status).toBe(401);
    expect(res.body.codigo).toBe("TOKEN_INVALIDO");
    expect(res.headers["www-authenticate"]).toContain("Bearer");
  });

  it("rechaza un token vencido con TOKEN_EXPIRADO", async () => {
    const t = await token({ rol: "banda", expiraEnSegundos: -60 });
    const r = await request(app()).get("/protegido").set("Authorization", `Bearer ${t}`);
    expect(r.status).toBe(401);
    expect(r.body.codigo).toBe("TOKEN_EXPIRADO");
  });

  it("rechaza un token alterado: cambiar el rol rompe la firma", async () => {
    const [cabecera, , firma] = (await token({ rol: "banda" })).split(".");
    const cuerpo = b64({ sub: "x", rol: "admin", iss: "backline-identidad", aud: "backline-api", exp: 9_999_999_999 });
    const r = await request(app()).get("/protegido").set("Authorization", `Bearer ${cabecera}.${cuerpo}.${firma}`);
    expect(r.status).toBe(401);
  });

  it("rechaza un token firmado con otra llave privada", async () => {
    const otra = generateKeyPairSync("rsa", { modulusLength: 2048, privateKeyEncoding: { type: "pkcs8", format: "pem" }, publicKeyEncoding: { type: "spki", format: "pem" } });
    const t = await token({ rol: "admin", llavePem: otra.privateKey });
    const r = await request(app()).get("/protegido").set("Authorization", `Bearer ${t}`);
    expect(r.status).toBe(401);
  });

  it("rechaza alg: none (token sin firma)", async () => {
    const t = `${b64({ alg: "none", typ: "JWT" })}.${b64({ sub: "x", rol: "admin", iss: "backline-identidad", aud: "backline-api", exp: 9_999_999_999 })}.`;
    const r = await request(app()).get("/protegido").set("Authorization", `Bearer ${t}`);
    expect(r.status).toBe(401);
  });

  it("rechaza la confusión de algoritmo: HS256 firmado con la llave PÚBLICA como secreto", async () => {
    const cabecera = b64({ alg: "HS256", typ: "JWT" });
    const cuerpo = b64({ sub: "x", rol: "admin", iss: "backline-identidad", aud: "backline-api", exp: 9_999_999_999 });
    const firma = createHmac("sha256", readFileSync(LLAVES_PRUEBA.publica)).update(`${cabecera}.${cuerpo}`).digest("base64url");
    const r = await request(app()).get("/protegido").set("Authorization", `Bearer ${cabecera}.${cuerpo}.${firma}`);
    expect(r.status).toBe(401);
  });

  it.each([
    ["otro emisor", { emisor: "otro-sistema" }],
    ["otra audiencia", { audiencia: "otra-api" }],
  ])("rechaza un token de %s", async (_caso, extra) => {
    const t = await token({ rol: "banda", ...extra });
    const r = await request(app()).get("/protegido").set("Authorization", `Bearer ${t}`);
    expect(r.status).toBe(401);
  });

  it("rechaza un rol que no existe aunque la firma sea válida", async () => {
    const t = await token({ rol: "superusuario" as never });
    const r = await request(app()).get("/protegido").set("Authorization", `Bearer ${t}`);
    expect(r.status).toBe(401);
  });
});

describe("autorización", () => {
  it("requerirRol: 403 PERMISO_INSUFICIENTE con otro rol, 200 con el correcto", async () => {
    const banda = await token({ rol: "banda" });
    const foro = await token({ rol: "foro" });
    const r1 = await request(app()).get("/solo-foro").set("Authorization", `Bearer ${banda}`);
    expect(r1.status).toBe(403);
    expect(r1.body.codigo).toBe("PERMISO_INSUFICIENTE");
    const r2 = await request(app()).get("/solo-foro").set("Authorization", `Bearer ${foro}`);
    expect(r2.status).toBe(200);
  });

  it("exigirDueno: solo pasa si el id coincide", () => {
    const usuario = { id: "a", rol: "banda" as const, token: "t" };
    expect(() => exigirDueno(usuario, "a", "x")).not.toThrow();
    expect(() => exigirDueno(usuario, "b", "x")).toThrowError(/Solo el dueño/);
  });
});
