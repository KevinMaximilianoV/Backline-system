import type { Server } from "node:http";
import express, { type Request } from "express";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { enDias, usuario } from "../../../pruebas/ayudas";
import { crearAppGateway } from "./app";

/**
 * El Gateway con servicios falsos detrás (puertos 43211-43213, ver vitest.config.ts).
 * gateway.test.ts prueba lo que pasa cuando los servicios NO responden; aquí se prueba el camino
 * feliz: que el proxy reenvíe sin tocar nada y que la disponibilidad componga bien a Booking y Perfiles.
 * Los servicios falsos registran cada petición que reciben para revisar qué les llegó.
 */

interface Recibida {
  metodo: string;
  ruta: string;
  cuerpo: string;
  encabezados: Request["headers"];
}

let recibidas: Recibida[] = [];
let franjas: { id: string; foroId: string; inicio: string; fin: string }[] = [];
let foros: { id: string; nombre: string; capacidad: number; generos: { id: number; nombre: string }[] }[] = [];
let estadoSalud = 200;
const servidores: Server[] = [];

function servicioFalso(puerto: number, rutas: (app: express.Express) => void): Promise<void> {
  const app = express();
  app.use(express.text({ type: "*/*" }));
  app.use((req, _res, next) => {
    recibidas.push({ metodo: req.method, ruta: req.originalUrl, cuerpo: typeof req.body === "string" ? req.body : "", encabezados: req.headers });
    next();
  });
  app.get("/salud", (_req, res) => {
    res.status(estadoSalud).json({ estado: estadoSalud === 200 ? "ok" : "error" });
  });
  rutas(app);
  return new Promise((listo) => servidores.push(app.listen(puerto, () => listo())));
}

const CORRELACION = "6f1c2a9e-3b7d-4c51-9a20-1e2f3a4b5c6d"; // solo se acepta un UUID (correlacion.ts)
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

beforeAll(async () => {
  await servicioFalso(43211, (app) => {
    app.post("/api/v1/usuarios", (req, res) => {
      res.status(201).set("Location", "/api/v1/usuarios/me").type("application/json").send(req.body);
    });
  });
  await servicioFalso(43212, (app) => {
    app.get("/api/v1/bandas", (_req, res) => {
      res.json({ datos: [], paginacion: { pagina: 1, porPagina: 20, total: 0 } });
    });
    app.get("/api/v1/foros", (req, res) => {
      const pedidos = String(req.query.ids ?? "").split(",");
      const genero = req.query.genero ? Number(req.query.genero) : undefined;
      const datos = foros.filter((f) => pedidos.includes(f.id) && (!genero || f.generos.some((g) => g.id === genero)));
      res.json({ datos, paginacion: { pagina: 1, porPagina: 100, total: datos.length } });
    });
  });
  await servicioFalso(43213, (app) => {
    // Pagina de 2 en 2 aunque se pidan 100: obliga al Gateway a leer todas las páginas
    app.get("/api/v1/franjas", (req, res) => {
      const pagina = Number(req.query.pagina ?? 1);
      res.json({ datos: franjas.slice((pagina - 1) * 2, pagina * 2), paginacion: { pagina, porPagina: 2, total: franjas.length } });
    });
  });
});

afterAll(() => {
  for (const s of servidores) s.close();
});

beforeEach(() => {
  recibidas = [];
  estadoSalud = 200;
});

const app = crearAppGateway();

describe("proxy", () => {
  it("reenvía método, ruta, query y cuerpo sin tocarlos, y devuelve la respuesta tal cual", async () => {
    const cuerpo = JSON.stringify({ correo: "a@b.mx", contrasena: "Segura.2026", rol: "banda" });
    const r = await request(app).post("/api/v1/usuarios?origen=app").set("Content-Type", "application/json").send(cuerpo);
    expect(r.status).toBe(201);
    expect(r.headers.location).toBe("/api/v1/usuarios/me");
    expect(r.text).toBe(cuerpo);

    const [llegada] = recibidas;
    expect(llegada).toMatchObject({ metodo: "POST", ruta: "/api/v1/usuarios?origen=app", cuerpo });
  });

  it("reenvía el token, el mismo X-Correlation-Id y la IP del cliente", async () => {
    const banda = await usuario("banda");
    const r = await request(app).get("/api/v1/bandas").set(banda.auth).set("X-Correlation-Id", CORRELACION);
    expect(r.status).toBe(200);
    expect(r.headers["x-correlation-id"]).toBe(CORRELACION);

    expect(recibidas).toHaveLength(1);
    const llegada = recibidas[0]!;
    expect(llegada.encabezados.authorization).toBe(banda.auth.Authorization);
    expect(llegada.encabezados["x-correlation-id"]).toBe(CORRELACION);
    expect(llegada.encabezados["x-forwarded-for"]).toBeTruthy();
  });

  it("no reenvía rutas parecidas a un prefijo (/bandasx no es /bandas)", async () => {
    expect((await request(app).get("/api/v1/bandasx")).status).toBe(404);
    expect(recibidas).toHaveLength(0);
  });
});

describe("/salud con los servicios arriba", () => {
  it("200 y el estado de cada servicio", async () => {
    const r = await request(app).get("/salud");
    expect(r.status).toBe(200);
    expect(r.body.servicios).toEqual({ identidad: "ok", perfiles: "ok", booking: "ok" });
  });

  it("503 si un servicio responde con error, con su status en el mensaje", async () => {
    estadoSalud = 500;
    const r = await request(app).get("/salud");
    expect(r.status).toBe(503);
    expect(r.body.detail).toContain("responde 500");
  });
});

describe("disponibilidad (E-30): composición de Booking y Perfiles", () => {
  const fecha = enDias(30).slice(0, 10);
  const enLaFecha = (hora: string) => `${fecha}T${hora}:00-06:00`;

  beforeEach(() => {
    foros = [
      { id: id(1), nombre: "Zócalo", capacidad: 300, generos: [{ id: 1, nombre: "Rock" }] },
      { id: id(2), nombre: "Ánimas", capacidad: 80, generos: [{ id: 3, nombre: "Jazz" }] },
      { id: id(3), nombre: "Ñandú", capacidad: 120, generos: [{ id: 1, nombre: "Rock" }] },
      // id(4) no aparece: Perfiles no lo devuelve (se dio de baja)
    ];
    franjas = [
      { id: id(101), foroId: id(1), inicio: enLaFecha("20:00"), fin: enLaFecha("22:00") },
      { id: id(102), foroId: id(2), inicio: enLaFecha("19:00"), fin: enLaFecha("21:00") },
      { id: id(103), foroId: id(3), inicio: enLaFecha("21:00"), fin: enLaFecha("23:00") },
      { id: id(104), foroId: id(1), inicio: enLaFecha("23:00"), fin: enLaFecha("23:59") },
      { id: id(105), foroId: id(4), inicio: enLaFecha("20:00"), fin: enLaFecha("22:00") },
    ];
  });

  it("lee todas las páginas de Booking, agrupa por foro, quita foros inactivos y ordena en español", async () => {
    const banda = await usuario("banda");
    const r = await request(app).get(`/api/v1/disponibilidad?fecha=${fecha}`).set(banda.auth).set("X-Correlation-Id", CORRELACION);
    expect(r.status).toBe(200);
    // Á y Ñ ordenan como en español: Ánimas, Ñandú, Zócalo (por bytes, Á y Ñ irían al final)
    expect(r.body.datos.map((d: { foro: { nombre: string } }) => d.foro.nombre)).toEqual(["Ánimas", "Ñandú", "Zócalo"]);
    const zocalo = r.body.datos[2];
    expect(zocalo.foro).toEqual({ id: id(1), nombre: "Zócalo", capacidad: 300, generos: ["Rock"] });
    expect(zocalo.franjasLibres.map((f: { id: string }) => f.id)).toEqual([id(101), id(104)]);
    expect(r.body.paginacion).toEqual({ pagina: 1, porPagina: 20, total: 3 });

    const aBooking = recibidas.filter((p) => p.ruta.startsWith("/api/v1/franjas"));
    expect(aBooking).toHaveLength(3); // 5 franjas de 2 en 2
    expect(aBooking[0]!.ruta).toContain(`desde=${fecha}&hasta=${fecha}&estado=libre`);
    // El token y la correlación del usuario viajan a los dos servicios
    for (const p of recibidas) {
      expect(p.encabezados.authorization).toBe(banda.auth.Authorization);
      expect(p.encabezados["x-correlation-id"]).toBe(CORRELACION);
    }
  });

  it("pasa el filtro de género a Perfiles", async () => {
    const banda = await usuario("banda");
    const r = await request(app).get(`/api/v1/disponibilidad?fecha=${fecha}&genero=3`).set(banda.auth);
    expect(r.body.datos.map((d: { foro: { nombre: string } }) => d.foro.nombre)).toEqual(["Ánimas"]);
    expect(recibidas.find((p) => p.ruta.startsWith("/api/v1/foros"))!.ruta).toContain("&genero=3");
  });

  it("descarta las franjas de hoy que ya empezaron", async () => {
    const hace1h = new Date(Date.now() - 3_600_000).toISOString();
    const en1h = new Date(Date.now() + 3_600_000).toISOString();
    franjas = [
      { id: id(201), foroId: id(1), inicio: hace1h, fin: en1h },
      { id: id(202), foroId: id(2), inicio: en1h, fin: new Date(Date.now() + 7_200_000).toISOString() },
    ];
    const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(new Date());
    const r = await request(app).get(`/api/v1/disponibilidad?fecha=${hoy}`).set((await usuario("banda")).auth);
    expect(r.status).toBe(200);
    expect(r.body.datos.flatMap((d: { franjasLibres: { id: string }[] }) => d.franjasLibres.map((f) => f.id))).toEqual([id(202)]);
  });

  it("pagina la respuesta compuesta", async () => {
    const r = await request(app).get(`/api/v1/disponibilidad?fecha=${fecha}&pagina=2&porPagina=1`).set((await usuario("banda")).auth);
    expect(r.body.datos.map((d: { foro: { nombre: string } }) => d.foro.nombre)).toEqual(["Ñandú"]);
    expect(r.body.paginacion).toEqual({ pagina: 2, porPagina: 1, total: 3 });
  });

  it("pide los foros a Perfiles en lotes de 50 ids como máximo", async () => {
    foros = Array.from({ length: 51 }, (_, i) => ({ id: id(300 + i), nombre: `Foro ${i}`, capacidad: 50, generos: [] }));
    franjas = foros.map((f, i) => ({ id: id(400 + i), foroId: f.id, inicio: enLaFecha("20:00"), fin: enLaFecha("22:00") }));
    const r = await request(app).get(`/api/v1/disponibilidad?fecha=${fecha}&porPagina=100`).set((await usuario("banda")).auth);
    expect(r.body.paginacion.total).toBe(51);
    const lotes = recibidas.filter((p) => p.ruta.startsWith("/api/v1/foros"));
    expect(lotes.map((p) => new URL(p.ruta, "http://x").searchParams.get("ids")!.split(",").length)).toEqual([50, 1]);
  });

  it("sin franjas libres: lista vacía y no molesta a Perfiles", async () => {
    franjas = [];
    const r = await request(app).get(`/api/v1/disponibilidad?fecha=${fecha}`).set((await usuario("banda")).auth);
    expect(r.body).toEqual({ datos: [], paginacion: { pagina: 1, porPagina: 20, total: 0 } });
    expect(recibidas.some((p) => p.ruta.startsWith("/api/v1/foros"))).toBe(false);
  });
});
