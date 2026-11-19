// Prueba de carga y concurrencia de Backline, contra el Gateway en marcha.
//
//   npm run test:carga                 (50 usuarios, 30 s por escenario)
//   USUARIOS=20 DURACION=10 npm run test:carga
//
// Escenarios:
//   1. Búsqueda: 50 bandas consultan GET /disponibilidad y GET /franjas sin parar (RNF-06).
//   2. Creación de solicitudes: 50 bandas envían solicitudes a la vez (RNF-06). Cada una
//      cruza servicios: Booking consulta a Perfiles 2 veces (rider e inventario) y escribe en una transacción.
//   3. Concurrencia: 20 solicitudes de la misma franja se aceptan al mismo tiempo (RNF-05).
//
// Criterios (Parte II, Tabla 7): p95 < 500 ms en 1 y 2; exactamente 1 aceptación en 3; 0 errores 5xx.
// Termina con código 1 si algún criterio no se cumple, para usarlo en integración continua.

const BASE = process.env.BASE_URL ?? "http://localhost:8080/api/v1";
const USUARIOS = Number(process.env.USUARIOS ?? 50);
const DURACION_MS = Number(process.env.DURACION ?? 30) * 1000;
const P95_MAXIMO_MS = 500;
const corrida = Date.now().toString(36);

// ------------------------------------------------------------------ utilidades
async function llamar(metodo, ruta, { token, cuerpo } = {}) {
  const inicio = performance.now();
  const r = await fetch(BASE + ruta, {
    method: metodo,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  const datos = r.status === 204 ? null : await r.json().catch(() => null);
  return { status: r.status, datos, ms: performance.now() - inicio };
}

async function exigir(metodo, ruta, opciones, esperado) {
  const r = await llamar(metodo, ruta, opciones);
  if (r.status !== esperado) throw new Error(`${metodo} ${ruta} respondió ${r.status}: ${JSON.stringify(r.datos)}`);
  return r.datos;
}

function percentil(valores, p) {
  const orden = [...valores].sort((a, b) => a - b);
  return orden[Math.min(orden.length - 1, Math.ceil((p / 100) * orden.length) - 1)] ?? 0;
}

/** Reparte una lista de tareas asíncronas entre N trabajadores concurrentes. */
async function enParalelo(n, crear) {
  return Promise.all(Array.from({ length: n }, (_, i) => crear(i)));
}

async function cuenta(rol, i) {
  const correo = `carga.${rol}.${corrida}.${i}@prueba.mx`;
  const contrasena = "Carga2026x";
  await exigir("POST", "/usuarios", { cuerpo: { correo, contrasena, rol } }, 201);
  const sesion = await exigir("POST", "/sesiones", { cuerpo: { correo, contrasena } }, 201);
  return { id: sesion.usuario.id, token: sesion.tokenAcceso };
}

const dia = (n) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

// ------------------------------------------------------------------ preparación
console.log(`Backline · prueba de carga contra ${BASE}`);
console.log(`${USUARIOS} usuarios concurrentes, ${DURACION_MS / 1000} s por escenario\n`);
console.log("Preparando datos (cuentas, perfiles, franjas)...");

const foro = await cuenta("foro", 0);
await exigir("POST", "/foros", { token: foro.token, cuerpo: { nombre: `Foro Carga ${corrida}`, direccion: "Centro", capacidad: 200, generoIds: [1, 3] } }, 201);
await exigir("PUT", `/foros/${foro.id}/inventario`, { token: foro.token, cuerpo: { elementos: [{ tipoEquipoId: 1, cantidad: 1 }, { tipoEquipoId: 3, cantidad: 2 }] } }, 200);

const bandas = await enParalelo(USUARIOS, async (i) => {
  const b = await cuenta("banda", i);
  await exigir("POST", "/bandas", { token: b.token, cuerpo: { nombre: `Banda Carga ${i}`, integrantes: 4, generoIds: [1] } }, 201);
  await exigir("PUT", `/bandas/${b.id}/rider`, { token: b.token, cuerpo: { requisitos: [{ tipoEquipoId: 3, cantidad: 3 }, { tipoEquipoId: 9, cantidad: 1 }] } }, 200);
  return b;
});

// Una franja por día durante 60 días, a partir de un día al azar para no chocar con corridas anteriores
const desfase = 60 + Math.floor(Math.random() * 200);
const franjas = [];
for (let i = 0; i < 60; i++) {
  const d = dia(desfase + i);
  franjas.push((await exigir("POST", "/franjas", { token: foro.token, cuerpo: { inicio: `${d}T20:00:00-06:00`, fin: `${d}T22:00:00-06:00` } }, 201)).id);
}
const fechaBusqueda = dia(desfase);
console.log(`Listo: 1 foro, ${bandas.length} bandas, ${franjas.length} franjas.\n`);

// ------------------------------------------------------------------ escenarios
const resultados = [];

async function escenarioPorTiempo(nombre, peticion) {
  const tiempos = [];
  const status = {};
  const fin = Date.now() + DURACION_MS;
  const inicio = performance.now();
  await enParalelo(USUARIOS, async (i) => {
    let n = 0;
    while (Date.now() < fin) {
      const r = await peticion(i, n++);
      if (r === null) break; // este usuario terminó su trabajo
      tiempos.push(r.ms);
      status[r.status] = (status[r.status] ?? 0) + 1;
    }
  });
  registrar(nombre, tiempos, status, performance.now() - inicio);
}

function registrar(nombre, tiempos, status, msTotales) {
  const errores5xx = Object.entries(status).filter(([s]) => Number(s) >= 500).reduce((n, [, c]) => n + c, 0);
  const fila = {
    escenario: nombre,
    peticiones: tiempos.length,
    "por segundo": Math.round((tiempos.length / msTotales) * 1000),
    "p50 ms": Math.round(percentil(tiempos, 50)),
    "p95 ms": Math.round(percentil(tiempos, 95)),
    "p99 ms": Math.round(percentil(tiempos, 99)),
    "máx ms": Math.round(Math.max(...tiempos)),
    status: Object.entries(status).map(([s, c]) => `${s}×${c}`).join(" "),
    "5xx": errores5xx,
  };
  resultados.push(fila);
  console.log(`  ${nombre}: ${fila.peticiones} peticiones, p95 ${fila["p95 ms"]} ms, ${fila.status}`);
}

console.log("Escenario 1: búsqueda");
await escenarioPorTiempo("1. Búsqueda (disponibilidad y franjas)", (i, n) =>
  n % 2 === 0
    ? llamar("GET", `/disponibilidad?fecha=${fechaBusqueda}`, { token: bandas[i].token })
    : llamar("GET", `/franjas?foroId=${foro.id}&desde=${dia(desfase)}&hasta=${dia(desfase + 59)}&porPagina=50`, { token: bandas[i].token }),
);

console.log("Escenario 2: creación de solicitudes");
await escenarioPorTiempo("2. Creación de solicitudes", (i, n) => {
  // Cada banda recorre las franjas en orden; al agotarlas, la siguiente sería duplicada (409): se detiene ahí
  if (n >= franjas.length) return null;
  const franjaId = franjas[n];
  return llamar("POST", "/solicitudes", { token: bandas[i].token, cuerpo: { franjaId, tipoAcuerdo: "pago_fijo", montoMxn: 1500 + i } });
});

console.log("Escenario 3: concurrencia (20 aceptaciones de la misma franja)");
const disputada = franjas[0];
const pendientes = await exigir("GET", `/solicitudes?franjaId=${disputada}&estado=solicitada&porPagina=20`, { token: foro.token }, 200);
const aceptaciones = await Promise.all(
  pendientes.datos.slice(0, 20).map((s) => llamar("POST", `/solicitudes/${s.id}/cambios-estado`, { token: foro.token, cuerpo: { estadoNuevo: "aceptada" } })),
);
const conteo = {};
for (const r of aceptaciones) conteo[r.status] = (conteo[r.status] ?? 0) + 1;
const final = await exigir("GET", `/solicitudes?franjaId=${disputada}&estado=aceptada`, { token: foro.token }, 200);
registrar("3. Aceptaciones simultáneas", aceptaciones.map((r) => r.ms), conteo, Math.max(...aceptaciones.map((r) => r.ms)));

// ------------------------------------------------------------------ criterios
console.log("");
console.table(resultados);
const criterios = [
  [`RNF-06 búsqueda: p95 < ${P95_MAXIMO_MS} ms`, resultados[0]["p95 ms"] < P95_MAXIMO_MS],
  [`RNF-06 creación de solicitudes: p95 < ${P95_MAXIMO_MS} ms`, resultados[1]["p95 ms"] < P95_MAXIMO_MS],
  ["RNF-05: exactamente 1 aceptación con éxito", conteo[201] === 1 && final.paginacion.total === 1],
  ["RNF-05: las demás reciben 409, ninguna 5xx", conteo[409] === aceptaciones.length - 1],
  ["Ningún error 5xx en toda la prueba", resultados.every((r) => r["5xx"] === 0)],
];
for (const [texto, ok] of criterios) console.log(`${ok ? "CUMPLE   " : "NO CUMPLE"}  ${texto}`);
process.exit(criterios.every(([, ok]) => ok) ? 0 : 1);
