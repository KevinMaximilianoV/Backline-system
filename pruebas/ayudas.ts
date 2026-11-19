import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { importPKCS8, SignJWT } from "jose";
import { parse } from "yaml";
import { LLAVES_PRUEBA } from "./llaves";

/** Utilidades compartidas por las pruebas. */

type Rol = "banda" | "foro" | "admin";

/**
 * Firma un token como lo haría Identidad, con la llave privada de PRUEBA.
 * Así las pruebas de Perfiles y Booking no dependen de que Identidad esté corriendo,
 * y se pueden fabricar a propósito tokens vencidos o con otro emisor.
 */
export async function token(
  opciones: { sub?: string; rol: Rol; expiraEnSegundos?: number; emisor?: string; audiencia?: string; llavePem?: string },
): Promise<string> {
  const llave = await importPKCS8(opciones.llavePem ?? readFileSync(LLAVES_PRUEBA.privada, "utf8"), "RS256");
  const ahora = Math.floor(Date.now() / 1000);
  return new SignJWT({ rol: opciones.rol })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setSubject(opciones.sub ?? randomUUID())
    .setIssuer(opciones.emisor ?? "backline-identidad")
    .setAudience(opciones.audiencia ?? "backline-api")
    .setIssuedAt(ahora - 10)
    .setExpirationTime(ahora + (opciones.expiraEnSegundos ?? 3600))
    .sign(llave);
}

/** Usuario de prueba: un id nuevo y su token. */
export async function usuario(rol: Rol): Promise<{ id: string; token: string; auth: { Authorization: string } }> {
  const id = randomUUID();
  const t = await token({ sub: id, rol });
  return { id, token: t, auth: { Authorization: `Bearer ${t}` } };
}

/**
 * Operaciones protegidas del contrato (docs/openapi.yaml): todas las que no declaran `security: []`.
 * Las pruebas de seguridad recorren ESTA lista, así que un endpoint nuevo en el contrato
 * queda cubierto sin escribir una prueba más.
 */
export function operacionesProtegidas(prefijos: string[]): { metodo: string; ruta: string }[] {
  const contrato = parse(readFileSync(new URL("../docs/openapi.yaml", import.meta.url), "utf8")) as {
    paths: Record<string, Record<string, { security?: unknown[] }>>;
  };
  const metodos = ["get", "post", "put", "patch", "delete"];
  const operaciones: { metodo: string; ruta: string }[] = [];
  for (const [ruta, operacionesRuta] of Object.entries(contrato.paths)) {
    if (!prefijos.some((p) => ruta === p || ruta.startsWith(`${p}/`))) continue;
    for (const [metodo, op] of Object.entries(operacionesRuta)) {
      if (!metodos.includes(metodo)) continue;
      if (Array.isArray(op.security) && op.security.length === 0) continue; // pública
      // Los parámetros de ruta se llenan con un UUID cualquiera: sin token no debe importar
      operaciones.push({ metodo, ruta: `/api/v1${ruta.replace(/\{[^}]+\}/g, randomUUID())}` });
    }
  }
  return operaciones;
}

/** Fecha y hora futura en Querétaro, a N días y a cierta hora. */
export function enDias(dias: number, hora = "21:00"): string {
  const d = new Date(Date.now() + dias * 86_400_000).toISOString().slice(0, 10);
  return `${d}T${hora}:00-06:00`;
}
