import { generateKeyPairSync } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Par de llaves RSA SOLO para las pruebas, en la carpeta temporal del sistema.
 * Nunca se usan las llaves de desarrollo (llaves/) ni se guarda nada en el repositorio.
 */
const carpeta = join(tmpdir(), "backline-pruebas-llaves");
export const LLAVES_PRUEBA = {
  privada: join(carpeta, "jwt-privada.pem"),
  publica: join(carpeta, "jwt-publica.pem"),
};

if (!existsSync(LLAVES_PRUEBA.privada) || !existsSync(LLAVES_PRUEBA.publica)) {
  mkdirSync(carpeta, { recursive: true });
  const par = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  writeFileSync(LLAVES_PRUEBA.privada, par.privateKey, { mode: 0o600 });
  writeFileSync(LLAVES_PRUEBA.publica, par.publicKey);
}
