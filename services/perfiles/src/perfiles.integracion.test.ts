import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { operacionesProtegidas, token, usuario } from "../../../pruebas/ayudas";
import { crearAppPerfiles } from "./app";
import { pool } from "./db/pool";

/** Perfiles contra la base real (backline_perfiles). Cada prueba crea cuentas con ids nuevos. */

const app = crearAppPerfiles();
afterAll(() => pool.end());

const BANDA = { nombre: "Los de Prueba", integrantes: 4, generoIds: [1, 3] };
const FORO = { nombre: "Foro de Prueba", direccion: "Centro, Querétaro", capacidad: 120, generoIds: [1] };

let banda: Awaited<ReturnType<typeof usuario>>;
let otraBanda: Awaited<ReturnType<typeof usuario>>;
let foro: Awaited<ReturnType<typeof usuario>>;

beforeAll(async () => {
  banda = await usuario("banda");
  otraBanda = await usuario("banda");
  foro = await usuario("foro");
  expect((await request(app).post("/api/v1/bandas").set(banda.auth).send(BANDA)).status).toBe(201);
  expect((await request(app).post("/api/v1/bandas").set(otraBanda.auth).send(BANDA)).status).toBe(201);
  expect((await request(app).post("/api/v1/foros").set(foro.auth).send(FORO)).status).toBe(201);
});

describe("autenticación", () => {
  it("RNF-02: toda operación del contrato que atiende Perfiles responde 401 sin token", async () => {
    const operaciones = operacionesProtegidas(["/catalogos", "/bandas", "/foros"]);
    expect(operaciones.length).toBe(16);
    for (const { metodo, ruta } of operaciones) {
      const r = await (request(app) as unknown as Record<string, (r: string) => request.Test>)[metodo]!(ruta).send({});
      expect(r.status, `${metodo.toUpperCase()} ${ruta}`).toBe(401);
    }
  });

  it("un token vencido no sirve, aunque sea de la cuenta dueña", async () => {
    const vencido = await token({ sub: banda.id, rol: "banda", expiraEnSegundos: -1 });
    const r = await request(app).patch(`/api/v1/bandas/${banda.id}`).set("Authorization", `Bearer ${vencido}`).send({ integrantes: 2 });
    expect(r.body.codigo).toBe("TOKEN_EXPIRADO");
  });
});

describe("autorización por rol y por dueño (RNF-03)", () => {
  it("el id del perfil sale del token: el cliente no lo elige", async () => {
    const r = await request(app).get(`/api/v1/bandas/${banda.id}`).set(banda.auth);
    expect(r.body.id).toBe(banda.id);
    const conId = await request(app).post("/api/v1/bandas").set((await usuario("banda")).auth).send({ ...BANDA, id: otraBanda.id });
    expect(conId.status).toBe(422);
  });

  it.each([
    ["modificar el perfil", "patch", (id: string) => `/api/v1/bandas/${id}`, { integrantes: 9 }],
    ["reemplazar el rider", "put", (id: string) => `/api/v1/bandas/${id}/rider`, { requisitos: [] }],
    ["dar de baja", "delete", (id: string) => `/api/v1/bandas/${id}`, undefined],
  ])("una banda no puede %s de otra banda: 403", async (_caso, metodo, ruta, cuerpo) => {
    const r = await (request(app) as unknown as Record<string, (r: string) => request.Test>)[metodo]!(ruta(otraBanda.id))
      .set(banda.auth)
      .send(cuerpo);
    expect(r.status).toBe(403);
    expect(r.body.codigo).toBe("PERMISO_INSUFICIENTE");
    // y el recurso no cambió
    expect((await request(app).get(`/api/v1/bandas/${otraBanda.id}`).set(banda.auth)).body.integrantes).toBe(4);
  });

  it("una banda no puede tocar el inventario de un foro", async () => {
    const r = await request(app).put(`/api/v1/foros/${foro.id}/inventario`).set(banda.auth).send({ elementos: [] });
    expect(r.status).toBe(403);
  });

  it("un foro no crea perfiles de banda y un admin no crea perfiles", async () => {
    expect((await request(app).post("/api/v1/bandas").set((await usuario("foro")).auth).send(BANDA)).status).toBe(403);
    expect((await request(app).post("/api/v1/foros").set((await usuario("admin")).auth).send(FORO)).status).toBe(403);
  });

  it("una cuenta solo tiene un perfil", async () => {
    const r = await request(app).post("/api/v1/bandas").set(banda.auth).send(BANDA);
    expect(r.status).toBe(409);
    expect(r.body.codigo).toBe("PERFIL_YA_EXISTE");
  });

  it("el dueño sí puede modificar lo suyo", async () => {
    const r = await request(app).patch(`/api/v1/bandas/${banda.id}`).set(banda.auth).send({ integrantes: 5 });
    expect(r.status).toBe(200);
    expect(r.body.integrantes).toBe(5);
  });
});

describe("validación de entradas", () => {
  it.each([
    ["nombre de 1 letra", { nombre: "X" }, "nombre"],
    ["integrantes fuera de rango", { integrantes: 0 }, "integrantes"],
    ["géneros repetidos", { generoIds: [1, 1] }, "generoIds"],
    ["género que no existe", { generoIds: [999] }, "generoIds"],
    ["enlace que no es http", { enlaceDemo: "javascript:alert(1)" }, "enlaceDemo"],
    ["campo que el contrato no tiene", { visible: false }, "visible"],
    ["carácter nulo (defecto D1)", { nombre: "Los\u0000Prueba" }, "nombre"],
  ])("rechaza %s con 422 y señala el campo", async (_caso, cambios, campo) => {
    const r = await request(app).patch(`/api/v1/bandas/${banda.id}`).set(banda.auth).send(cambios);
    expect(r.status).toBe(422);
    expect(r.body.errores.map((e: { campo: string }) => e.campo)).toContain(campo);
  });

  it("id de ruta que no es UUID: 400; recurso inexistente: 404", async () => {
    expect((await request(app).get("/api/v1/bandas/123").set(banda.auth)).status).toBe(400);
    expect((await request(app).get("/api/v1/bandas/00000000-0000-4000-8000-000000000000").set(banda.auth)).status).toBe(404);
  });

  it("las comillas en un nombre se guardan como texto (sin inyección SQL)", async () => {
    const nombre = "Robert'); DROP TABLE banda;--";
    const r = await request(app).patch(`/api/v1/bandas/${banda.id}`).set(banda.auth).send({ nombre });
    expect(r.status).toBe(200);
    expect(r.body.nombre).toBe(nombre);
    expect((await request(app).get("/api/v1/bandas").set(banda.auth)).status).toBe(200);
  });

  it("baja lógica: después del DELETE el perfil responde 404 y su id no se libera", async () => {
    const b = await usuario("banda");
    await request(app).post("/api/v1/bandas").set(b.auth).send(BANDA);
    expect((await request(app).delete(`/api/v1/bandas/${b.id}`).set(b.auth)).status).toBe(204);
    expect((await request(app).get(`/api/v1/bandas/${b.id}`).set(b.auth)).status).toBe(404);
    expect((await request(app).post("/api/v1/bandas").set(b.auth).send(BANDA)).status).toBe(409);
  });
});

describe("foros, inventario y catálogos", () => {
  it("catálogos: 12 géneros y 12 tipos de equipo", async () => {
    expect((await request(app).get("/api/v1/catalogos/generos").set(banda.auth)).body.datos).toHaveLength(12);
    expect((await request(app).get("/api/v1/catalogos/tipos-equipo").set(banda.auth)).body.datos).toHaveLength(12);
  });

  it("CRUD del foro: consultar, listar por ids y género, modificar, dar de baja", async () => {
    const f = await usuario("foro");
    expect((await request(app).post("/api/v1/foros").set(f.auth).send({ ...FORO, generoIds: [4, 5] })).status).toBe(201);
    expect((await request(app).get(`/api/v1/foros/${f.id}`).set(banda.auth)).body.generos.map((g: { nombre: string }) => g.nombre)).toEqual(["Indie", "Pop"]);

    const lista = await request(app).get(`/api/v1/foros?ids=${f.id},${foro.id}&genero=4`).set(banda.auth);
    expect(lista.body.datos.map((x: { id: string }) => x.id)).toEqual([f.id]);
    expect((await request(app).get("/api/v1/foros?ids=no-uuid").set(banda.auth)).status).toBe(400);

    const cambio = await request(app).patch(`/api/v1/foros/${f.id}`).set(f.auth).send({ capacidad: 300, generoIds: [1] });
    expect(cambio.body).toMatchObject({ capacidad: 300, generos: [{ id: 1, nombre: "Rock" }] });
    expect((await request(app).patch(`/api/v1/foros/${f.id}`).set(f.auth).send({})).status).toBe(422);

    expect((await request(app).delete(`/api/v1/foros/${f.id}`).set(f.auth)).status).toBe(204);
    expect((await request(app).get(`/api/v1/foros/${f.id}`).set(banda.auth)).status).toBe(404);
  });

  it("inventario y rider: se reemplazan completos y validan el catálogo", async () => {
    const inv = await request(app)
      .put(`/api/v1/foros/${foro.id}/inventario`)
      .set(foro.auth)
      .send({ elementos: [{ tipoEquipoId: 1, cantidad: 2, notas: "PA de 2 kW" }, { tipoEquipoId: 8, cantidad: 6 }] });
    expect(inv.status).toBe(200);
    expect((await request(app).get(`/api/v1/foros/${foro.id}/inventario`).set(banda.auth)).body.elementos).toHaveLength(2);
    const malo = await request(app).put(`/api/v1/foros/${foro.id}/inventario`).set(foro.auth).send({ elementos: [{ tipoEquipoId: 77, cantidad: 1 }] });
    expect(malo.status).toBe(422);
    // el 422 no tocó lo guardado
    expect((await request(app).get(`/api/v1/foros/${foro.id}/inventario`).set(banda.auth)).body.elementos).toHaveLength(2);

    const rider = await request(app).put(`/api/v1/bandas/${banda.id}/rider`).set(banda.auth).send({ requisitos: [{ tipoEquipoId: 3, cantidad: 2 }] });
    expect(rider.body.requisitos[0]).toMatchObject({ tipoEquipo: "Monitor de piso", cantidad: 2 });
    expect((await request(app).get(`/api/v1/bandas/${banda.id}/rider`).set(foro.auth)).body.requisitos).toHaveLength(1);
  });

  it("la lista de bandas filtra por género y pagina", async () => {
    const r = await request(app).get("/api/v1/bandas?genero=3&porPagina=2").set(foro.auth);
    expect(r.body.paginacion.porPagina).toBe(2);
    for (const b of r.body.datos) expect(b.generos.map((g: { id: number }) => g.id)).toContain(3);
  });
});
