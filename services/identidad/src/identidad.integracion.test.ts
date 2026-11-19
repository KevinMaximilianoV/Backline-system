import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import bcrypt from "bcryptjs";
import { importSPKI, jwtVerify } from "jose";
import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { operacionesProtegidas, token } from "../../../pruebas/ayudas";
import { LLAVES_PRUEBA } from "../../../pruebas/llaves";
import { crearAppIdentidad } from "./app";
import { consultar, pool } from "./db/pool";

/** Identidad contra la base real (backline_identidad). Cada prueba usa correos nuevos. */

const app = crearAppIdentidad();
afterAll(() => pool.end());

const correo = () => `prueba.${randomUUID().slice(0, 8)}@prueba.mx`;
const CLAVE = "Escenario2026";
const registrar = (c: string, rol = "banda") => request(app).post("/api/v1/usuarios").send({ correo: c, contrasena: CLAVE, rol });
const iniciar = (c: string, contrasena = CLAVE) => request(app).post("/api/v1/sesiones").send({ correo: c, contrasena });
const admin = () => iniciar("admin@backline.mx", "Backline.2026").then((r) => r.body.tokenAcceso as string);

describe("registro (E-01)", () => {
  it("RNF-01: guarda un hash bcrypt, nunca la contraseña", async () => {
    const c = correo();
    const r = await registrar(c);
    expect(r.status).toBe(201);
    expect(JSON.stringify(r.body)).not.toMatch(/contrasena|hash/i);

    const [fila] = await consultar<{ hash_contrasena: string }>("SELECT hash_contrasena FROM usuario WHERE correo = $1", [c]);
    expect(fila?.hash_contrasena).toMatch(/^\$2[aby]\$\d{2}\$.{53}$/);
    expect(fila?.hash_contrasena).not.toContain(CLAVE);
    expect(await bcrypt.compare(CLAVE, fila!.hash_contrasena)).toBe(true);
  });

  it("RNF-01 en toda la base: ninguna cuenta tiene la contraseña en texto plano", async () => {
    const [fila] = await consultar<{ total: number; sin_hash: number }>(
      "SELECT count(*)::int AS total, count(*) FILTER (WHERE hash_contrasena !~ '^\\$2[aby]\\$[0-9]{2}\\$')::int AS sin_hash FROM usuario",
    );
    expect(fila!.total).toBeGreaterThan(0);
    expect(fila!.sin_hash).toBe(0);
  });

  it("un correo ya registrado, con otras mayúsculas: 409 CORREO_YA_REGISTRADO", async () => {
    const c = correo();
    await registrar(c);
    const r = await registrar(c.toUpperCase(), "foro");
    expect(r.status).toBe(409);
    expect(r.body.codigo).toBe("CORREO_YA_REGISTRADO");
  });

  it("dos registros simultáneos con el mismo correo: exactamente uno gana", async () => {
    const c = correo();
    const respuestas = await Promise.all(Array.from({ length: 5 }, () => registrar(c)));
    const status = respuestas.map((r) => r.status).sort();
    expect(status).toEqual([201, 409, 409, 409, 409]);
  });
});

describe("inicio de sesión (E-02)", () => {
  it("emite un token RS256 verificable con la llave pública, con los claims del contrato", async () => {
    const c = correo();
    const id = (await registrar(c)).body.id;
    const r = await iniciar(c);
    expect(r.status).toBe(201);
    expect(r.headers["cache-control"]).toBe("no-store");
    const { payload, protectedHeader } = await jwtVerify(r.body.tokenAcceso, await importSPKI(readFileSync(LLAVES_PRUEBA.publica, "utf8"), "RS256"), {
      issuer: "backline-identidad",
      audience: "backline-api",
    });
    expect(protectedHeader.alg).toBe("RS256");
    expect(payload).toMatchObject({ sub: id, rol: "banda" });
    expect(payload.exp! - payload.iat!).toBe(3600);
  });

  it("contraseña incorrecta y correo inexistente responden igual (no revelan qué correos existen)", async () => {
    const c = correo();
    await registrar(c);
    const mala = await iniciar(c, "NoEsLaClave1");
    const inexistente = await iniciar(correo());
    expect(mala.status).toBe(401);
    expect(inexistente.status).toBe(401);
    expect(mala.body.detail).toBe(inexistente.body.detail);
    expect(mala.body.codigo).toBe("CREDENCIALES_INVALIDAS");
  });

  it("una cuenta suspendida no inicia sesión (403), pero solo si la contraseña es correcta", async () => {
    expect((await iniciar("ecopolar@correo.com", "Backline.2026")).body.codigo).toBe("CUENTA_SUSPENDIDA");
    expect((await iniciar("ecopolar@correo.com", "Incorrecta1")).status).toBe(401);
  });

  it("RN-05: el sexto intento fallido en un minuto responde 429 con Retry-After", async () => {
    const c = correo();
    const status: number[] = [];
    for (let i = 0; i < 6; i++) status.push((await iniciar(c, `Mala${i}xyz`)).status);
    expect(status).toEqual([401, 401, 401, 401, 401, 429]);
    const bloqueado = await iniciar(c, "Otra1234");
    expect(bloqueado.body.codigo).toBe("LIMITE_EXCEDIDO");
    expect(Number(bloqueado.headers["retry-after"])).toBeGreaterThan(0);
  });

  it("los intentos de un correo no bloquean a otro correo", async () => {
    const c = correo();
    for (let i = 0; i < 6; i++) await iniciar(c, `Mala${i}xyz`);
    const otro = correo();
    await registrar(otro);
    expect((await iniciar(otro)).status).toBe(201);
  });
});

describe("autorización en Identidad", () => {
  it("RNF-02: toda operación protegida del contrato responde 401 sin token", async () => {
    const operaciones = operacionesProtegidas(["/usuarios", "/sesiones"]);
    expect(operaciones.length).toBeGreaterThanOrEqual(3);
    for (const { metodo, ruta } of operaciones) {
      const r = await (request(app) as unknown as Record<string, (ruta: string) => request.Test>)[metodo]!(ruta).send({});
      expect(r.status, `${metodo.toUpperCase()} ${ruta}`).toBe(401);
    }
  });

  it("solo el administrador lista y suspende cuentas", async () => {
    const banda = await token({ rol: "banda" });
    expect((await request(app).get("/api/v1/usuarios").set("Authorization", `Bearer ${banda}`)).status).toBe(403);
    expect((await request(app).get("/api/v1/usuarios?rol=foro").set("Authorization", `Bearer ${await admin()}`)).status).toBe(200);
  });

  it("la búsqueda por correo trata comillas y comodines como texto (sin inyección SQL)", async () => {
    const t = await admin();
    for (const ataque of ["' OR 1=1--", "%", "_", "\\"]) {
      const r = await request(app).get("/api/v1/usuarios").query({ correo: ataque }).set("Authorization", `Bearer ${t}`);
      expect(r.status).toBe(200);
      expect(r.body.paginacion.total, ataque).toBe(0);
    }
  });

  it("suspender: el admin no puede suspenderse; repetir el estado no duplica el evento", async () => {
    const t = await admin();
    const yo = await request(app).patch("/api/v1/usuarios/33333333-3333-3333-3333-333333333333").set("Authorization", `Bearer ${t}`).send({ estado: "suspendida" });
    expect(yo.body.codigo).toBe("AUTOSUSPENSION_NO_PERMITIDA");

    const id = (await registrar(correo())).body.id;
    const eventos = async () =>
      (await consultar<{ n: number }>("SELECT count(*)::int AS n FROM evento_pendiente WHERE payload->>'usuarioId' = $1", [id]))[0]!.n;
    const antes = await eventos();
    for (let i = 0; i < 2; i++) {
      const r = await request(app).patch(`/api/v1/usuarios/${id}`).set("Authorization", `Bearer ${t}`).send({ estado: "suspendida" });
      expect(r.body.estado).toBe("suspendida");
    }
    expect(await eventos()).toBe(antes + 1);
  });

  it("GET /usuarios/me devuelve la cuenta del token, con datos de la base", async () => {
    const c = correo();
    const id = (await registrar(c)).body.id;
    const r = await request(app).get("/api/v1/usuarios/me").set("Authorization", `Bearer ${await token({ sub: id, rol: "banda" })}`);
    expect(r.body).toMatchObject({ id, correo: c, estado: "activa" });
  });
});
