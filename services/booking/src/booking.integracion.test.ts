import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { enDias, operacionesProtegidas, usuario } from "../../../pruebas/ayudas";
import { crearAppBooking } from "./app";
import { consultar, pool } from "./db/pool";

/**
 * Booking contra su base real y un Perfiles real (levantado por pruebas/levantarPerfiles.ts).
 * Cubre las reglas de negocio de la Tabla 48 y RNF-05 (20 aceptaciones simultáneas).
 */

const app = crearAppBooking();
const PERFILES = process.env.PERFILES_URL!;
afterAll(() => pool.end());

type Usuario = Awaited<ReturnType<typeof usuario>>;

/** Crea una cuenta con su perfil en Perfiles (por HTTP, como lo haría la app). */
async function conPerfil(rol: "banda" | "foro", equipo: { tipoEquipoId: number; cantidad: number }[] = []): Promise<Usuario> {
  const u = await usuario(rol);
  const recurso = rol === "banda" ? "bandas" : "foros";
  const cuerpo =
    rol === "banda"
      ? { nombre: `Banda ${u.id.slice(0, 6)}`, integrantes: 3, generoIds: [1] }
      : { nombre: `Foro ${u.id.slice(0, 6)}`, direccion: "Centro", capacidad: 100, generoIds: [1] };
  const r = await request(PERFILES).post(`/api/v1/${recurso}`).set(u.auth).send(cuerpo);
  expect(r.status).toBe(201);
  if (equipo.length) {
    const lista = rol === "banda" ? { requisitos: equipo } : { elementos: equipo };
    await request(PERFILES).put(`/api/v1/${recurso}/${u.id}/${rol === "banda" ? "rider" : "inventario"}`).set(u.auth).send(lista);
  }
  return u;
}

let diaLibre = 40;
/** Publica una franja en un día que no se encima con las demás de este archivo. */
async function franja(foro: Usuario): Promise<string> {
  diaLibre += 1;
  const r = await request(app).post("/api/v1/franjas").set(foro.auth).send({ inicio: enDias(diaLibre, "20:00"), fin: enDias(diaLibre, "22:00") });
  expect(r.status).toBe(201);
  return r.body.id;
}
const solicitar = (banda: Usuario, franjaId: string, extra: object = { tipoAcuerdo: "a_convenir" }) =>
  request(app).post("/api/v1/solicitudes").set(banda.auth).send({ franjaId, ...extra });
const cambiar = (u: Usuario, solicitudId: string, estadoNuevo: string, motivo?: string) =>
  request(app).post(`/api/v1/solicitudes/${solicitudId}/cambios-estado`).set(u.auth).send({ estadoNuevo, ...(motivo ? { motivo } : {}) });

let foro: Usuario;
let banda: Usuario;
beforeAll(async () => {
  foro = await conPerfil("foro", [{ tipoEquipoId: 1, cantidad: 1 }, { tipoEquipoId: 3, cantidad: 1 }]);
  banda = await conPerfil("banda", [{ tipoEquipoId: 3, cantidad: 3 }, { tipoEquipoId: 9, cantidad: 1 }]);
});

describe("autenticación", () => {
  it("RNF-02: toda operación del contrato que atiende Booking responde 401 sin token", async () => {
    const operaciones = operacionesProtegidas(["/franjas", "/solicitudes"]);
    expect(operaciones.length).toBe(11);
    for (const { metodo, ruta } of operaciones) {
      const r = await (request(app) as unknown as Record<string, (r: string) => request.Test>)[metodo]!(ruta).send({});
      expect(r.status, `${metodo.toUpperCase()} ${ruta}`).toBe(401);
    }
  });
});

describe("franjas (RN-10 a RN-13)", () => {
  it("un foro sin perfil no publica: 409 PERFIL_REQUERIDO", async () => {
    const sinPerfil = await usuario("foro");
    const r = await request(app).post("/api/v1/franjas").set(sinPerfil.auth).send({ inicio: enDias(30), fin: enDias(30, "23:00") });
    expect(r.body.codigo).toBe("PERFIL_REQUERIDO");
  });

  it.each([
    ["en el pasado", "2025-01-10T20:00:00-06:00", "2025-01-10T22:00:00-06:00", "inicio"],
    ["a más de un año", enDias(400), enDias(400, "23:00"), "inicio"],
    ["que termina antes de empezar", enDias(30, "22:00"), enDias(30, "20:00"), "fin"],
    ["de 10 minutos", enDias(30, "20:00"), enDias(30, "20:10"), "fin"],
    ["de más de 12 horas", enDias(30, "08:00"), enDias(31, "08:00"), "fin"],
    ["en una fecha imposible", "2027-02-30T20:00:00-06:00", "2027-02-30T22:00:00-06:00", "inicio"],
  ])("rechaza una franja %s con 422", async (_caso, inicio, fin, campo) => {
    const r = await request(app).post("/api/v1/franjas").set(foro.auth).send({ inicio, fin });
    expect(r.status).toBe(422);
    expect(r.body.errores[0].campo).toBe(campo);
  });

  it("RN-12: 10 franjas encimadas publicadas a la vez: exactamente una se acepta", async () => {
    const dia = 200;
    const respuestas = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        request(app).post("/api/v1/franjas").set(foro.auth).send({ inicio: enDias(dia, `20:0${i}`), fin: enDias(dia, "23:00") }),
      ),
    );
    const status = respuestas.map((r) => r.status);
    expect(status.filter((s) => s === 201)).toHaveLength(1);
    expect(status.filter((s) => s === 409)).toHaveLength(9);
    expect(respuestas.find((r) => r.status === 409)!.body.codigo).toBe("FRANJA_TRASLAPADA");
  });

  it("solo el foro dueño retira; con solicitudes activas no se puede (RN-13)", async () => {
    const f = await franja(foro);
    const otroForo = await conPerfil("foro");
    expect((await request(app).delete(`/api/v1/franjas/${f}`).set(otroForo.auth)).status).toBe(403);
    await solicitar(banda, f);
    const r = await request(app).delete(`/api/v1/franjas/${f}`).set(foro.auth);
    expect(r.body.codigo).toBe("FRANJA_CON_SOLICITUDES");
  });

  it("la lista filtra por foro, rango de fechas y estado, y pagina", async () => {
    const f1 = await franja(foro);
    const r = await request(app)
      .get("/api/v1/franjas")
      .query({ foroId: foro.id, desde: enDias(diaLibre).slice(0, 10), hasta: enDias(diaLibre).slice(0, 10), estado: "libre", porPagina: 1 })
      .set(banda.auth);
    expect(r.status).toBe(200);
    expect(r.body.datos.map((x: { id: string }) => x.id)).toEqual([f1]);
    expect(r.body.paginacion).toEqual({ pagina: 1, porPagina: 1, total: 1 });
    expect((await request(app).get("/api/v1/franjas?desde=2026-01-01&hasta=2026-12-31").set(banda.auth)).status).toBe(400);
  });

  it("compatibilidad: compara el rider (Perfiles) con el inventario del foro (Perfiles)", async () => {
    const f = await franja(foro);
    const r = await request(app).get(`/api/v1/franjas/${f}/compatibilidad?bandaId=${banda.id}`).set(banda.auth);
    expect(r.body.compatible).toBe(false);
    expect(r.body.faltantes.map((x: { tipoEquipoId: number; faltan: number }) => [x.tipoEquipoId, x.faltan])).toEqual([[3, 2], [9, 1]]);
    const ajena = await request(app).get(`/api/v1/franjas/${f}/compatibilidad?bandaId=${foro.id}`).set(banda.auth);
    expect(ajena.status).toBe(403);
  });
});

describe("solicitudes (RN-14 a RN-24)", () => {
  it("la solicitud guarda nombres, rider, inventario y faltantes calculados por el servidor", async () => {
    const f = await franja(foro);
    const r = await solicitar(banda, f, { tipoAcuerdo: "pago_fijo", montoMxn: 2500 });
    expect(r.status).toBe(201);
    expect(r.body.banda.nombre).toMatch(/^Banda /);
    expect(r.body.faltantes.reduce((n: number, x: { faltan: number }) => n + x.faltan, 0)).toBe(3);
    expect(r.body.riderAlSolicitar).toHaveLength(2);
    const [cambio] = await consultar<{ estado_nuevo: string }>("SELECT estado_nuevo FROM cambio_estado WHERE solicitud_id = $1", [r.body.id]);
    expect(cambio?.estado_nuevo).toBe("solicitada");
  });

  it("una banda sin perfil no solicita; una banda no solicita dos veces la misma franja", async () => {
    const f = await franja(foro);
    expect((await solicitar(await usuario("banda"), f)).body.codigo).toBe("PERFIL_REQUERIDO");
    expect((await solicitar(banda, f)).status).toBe(201);
    expect((await solicitar(banda, f)).body.codigo).toBe("SOLICITUD_DUPLICADA");
  });

  it("flujo completo: aceptar reserva la franja y rechaza a las demás en una transacción", async () => {
    const f = await franja(foro);
    const otra = await conPerfil("banda");
    const s1 = (await solicitar(banda, f)).body.id;
    const s2 = (await solicitar(otra, f)).body.id;

    expect((await cambiar(banda, s1, "aceptada")).body.codigo).toBe("TRANSICION_NO_PERMITIDA");
    expect((await cambiar(await conPerfil("foro"), s1, "aceptada")).status).toBe(403);

    const aceptar = await cambiar(foro, s1, "aceptada");
    expect(aceptar.status).toBe(201);
    expect(aceptar.body.efectos).toEqual({ franjaEstado: "reservada", solicitudesRechazadas: [s2] });
    expect((await request(app).get(`/api/v1/solicitudes/${s2}`).set(otra.auth)).body.estado).toBe("rechazada");
    expect((await request(app).get(`/api/v1/franjas/${f}`).set(banda.auth)).body.estado).toBe("reservada");

    // la otra banda no puede ver la solicitud ganadora
    expect((await request(app).get(`/api/v1/solicitudes/${s1}`).set(otra.auth)).status).toBe(403);
    // otra banda ya no puede solicitar la franja reservada
    expect((await solicitar(await conPerfil("banda"), f)).body.codigo).toBe("FRANJA_NO_DISPONIBLE");

    expect((await cambiar(banda, s1, "confirmada")).status).toBe(201);
    expect((await cambiar(banda, s1, "cancelada")).status).toBe(422); // sin motivo
    const cancelar = await cambiar(banda, s1, "cancelada", "Se enfermó el baterista");
    expect(cancelar.body.efectos.franjaEstado).toBe("libre");

    const historial = await request(app).get(`/api/v1/solicitudes/${s1}/cambios-estado`).set(foro.auth);
    expect(historial.body.datos.map((c: { estadoNuevo: string }) => c.estadoNuevo)).toEqual(["solicitada", "aceptada", "confirmada", "cancelada"]);

    // los eventos quedan en el outbox en el orden en que ocurrieron
    const eventos = await consultar<{ tipo: string }>(
      "SELECT tipo FROM evento_pendiente WHERE payload->>'solicitudId' IN ($1, $2) ORDER BY creado_en",
      [s1, s2],
    );
    expect(eventos.map((e) => e.tipo)).toEqual([
      "SolicitudCreada",
      "SolicitudCreada",
      "SolicitudAceptada",
      "SolicitudRechazada",
      "SolicitudConfirmada",
      "SolicitudCancelada",
    ]);
  });

  it("RNF-05: 20 aceptaciones simultáneas sobre la misma franja: exactamente 1 tiene éxito", async () => {
    const f = await franja(foro);
    const bandas = await Promise.all(Array.from({ length: 20 }, () => conPerfil("banda")));
    const solicitudes = await Promise.all(bandas.map((b) => solicitar(b, f).then((r) => r.body.id as string)));

    const respuestas = await Promise.all(solicitudes.map((s) => cambiar(foro, s, "aceptada")));
    const status = respuestas.map((r) => r.status);
    expect(status.filter((s) => s === 201)).toHaveLength(1);
    expect(status.filter((s) => s === 409)).toHaveLength(19);
    expect(status).not.toContain(500); // sin deadlocks (defecto de la Entrega 6)

    const estados = await consultar<{ estado: string; n: number }>(
      "SELECT estado, count(*)::int AS n FROM solicitud WHERE franja_id = $1 GROUP BY estado ORDER BY estado",
      [f],
    );
    expect(estados).toEqual([
      { estado: "aceptada", n: 1 },
      { estado: "rechazada", n: 19 },
    ]);
  });

  it("la lista muestra a cada quien solo lo suyo", async () => {
    const intruso = await conPerfil("banda");
    const r = await request(app).get("/api/v1/solicitudes").set(intruso.auth);
    expect(r.body.paginacion.total).toBe(0);
    const delForo = await request(app).get("/api/v1/solicitudes?estado=rechazada").set(foro.auth);
    for (const s of delForo.body.datos) expect(s.foro.id).toBe(foro.id);
  });
});
