// Respaldo y restauración de las cuatro bases de Backline.
//
//   npm run db:respaldo                      → respaldos/backline-AAAAMMDD-HHMM.sql
//   npm run db:respaldo -- otro/archivo.sql  → en la ruta indicada
//   npm run db:restaurar -- respaldos/backline-20261123-0130.sql
//
// Por omisión usa el contenedor "postgres" de docker compose (no hace falta instalar
// PostgreSQL). Si PGHOST está definido, usa pg_dump y psql de la máquina con las
// variables estándar de PostgreSQL (PGHOST, PGPORT, PGUSER, PGPASSWORD).
//
// El respaldo es un solo archivo SQL con las cuatro bases, una tras otra (\connect).
// No incluye los usuarios de PostgreSQL (svc_*): esos los crea db/init/00_bases_y_roles.sql,
// así que se restaura sobre una base levantada con docker compose.
import { spawnSync } from "node:child_process";
import { closeSync, existsSync, mkdirSync, openSync, writeSync } from "node:fs";
import { dirname } from "node:path";

const BASES = ["backline_identidad", "backline_perfiles", "backline_booking", "backline_notificaciones"];
const local = Boolean(process.env.PGHOST);

/** El comando para correr una herramienta de PostgreSQL, en el contenedor o en la máquina. */
function comando(herramienta, args) {
  return local
    ? { cmd: herramienta, args }
    : { cmd: "docker", args: ["compose", "exec", "-T", "postgres", herramienta, "-U", "postgres", ...args] };
}

function fallar(mensaje) {
  console.error(`\n✗ ${mensaje}`);
  process.exit(1);
}

function respaldar(destino) {
  const marca = new Date().toISOString().slice(0, 16).replace(/[-:]/g, "").replace("T", "-");
  const archivo = destino ?? `respaldos/backline-${marca}.sql`;
  mkdirSync(dirname(archivo), { recursive: true });
  const fd = openSync(archivo, "w");
  writeSync(fd, `-- Respaldo de Backline (${new Date().toISOString()})\n-- Restaurar con: npm run db:restaurar -- ${archivo}\n\n`);

  for (const base of BASES) {
    // --clean --if-exists: al restaurar, borra y vuelve a crear cada objeto, así que se puede
    // cargar sobre una base que ya tiene datos sin chocar con lo que existe.
    const { cmd, args } = comando("pg_dump", ["-d", base, "--clean", "--if-exists", "--quote-all-identifiers"]);
    const r = spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 512 * 1024 * 1024 });
    if (r.error) fallar(`No se pudo ejecutar ${cmd}: ${r.error.message}`);
    if (r.status !== 0) {
      closeSync(fd);
      fallar(`pg_dump de ${base} falló:\n${r.stderr}\n¿Está arriba la base? docker compose up -d --wait`);
    }
    writeSync(fd, `\n-- =================================================================== ${base}\n\\connect ${base}\n\n`);
    writeSync(fd, r.stdout);
    console.log(`✓ ${base}`);
  }
  closeSync(fd);
  console.log(`\nRespaldo guardado en ${archivo}`);
}

function restaurar(origen) {
  if (!origen) fallar("Indica el archivo: npm run db:restaurar -- respaldos/backline-AAAAMMDD-HHMM.sql");
  if (!existsSync(origen)) fallar(`No existe ${origen}`);
  // ON_ERROR_STOP: si algo falla, se detiene en lugar de dejar la base a medias en silencio
  const { cmd, args } = comando("psql", ["-d", "postgres", "-v", "ON_ERROR_STOP=1", "-q"]);
  const r = spawnSync(cmd, args, { stdio: [openSync(origen, "r"), "inherit", "pipe"], encoding: "utf8" });
  if (r.error) fallar(`No se pudo ejecutar ${cmd}: ${r.error.message}`);
  const avisos = (r.stderr ?? "").split("\n").filter((l) => l && !/NOTICE|does not exist, skipping/.test(l));
  if (r.status !== 0) fallar(`La restauración falló:\n${avisos.join("\n")}`);
  console.log(`✓ Restaurado ${origen} en ${BASES.length} bases`);
}

const [accion, archivo] = process.argv.slice(2);
if (accion === "respaldar") respaldar(archivo);
else if (accion === "restaurar") restaurar(archivo);
else fallar("Uso: node herramientas/respaldo.mjs respaldar [archivo] | restaurar <archivo>");
