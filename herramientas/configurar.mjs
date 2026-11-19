// Prepara el entorno de desarrollo. Se puede correr varias veces: no sobrescribe nada.
//  1. Genera el par de llaves RSA que firma y verifica los tokens (llaves/, fuera de Git).
//  2. Copia el .env.example de cada servicio a .env si todavía no existe.
import { generateKeyPairSync } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const raiz = new URL("..", import.meta.url).pathname;

const llaves = join(raiz, "llaves");
const privada = join(llaves, "jwt-privada.pem");
const publica = join(llaves, "jwt-publica.pem");
if (existsSync(privada) && existsSync(publica)) {
  console.log("Llaves: ya existen en llaves/, no se tocan.");
} else {
  mkdirSync(llaves, { recursive: true });
  const par = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  // La privada solo la lee Identidad (firma); la pública la leen todos los servicios (verifican)
  writeFileSync(privada, par.privateKey, { mode: 0o600 });
  writeFileSync(publica, par.publicKey);
  console.log("Llaves: generadas en llaves/ (RSA 2048).");
}

const servicios = join(raiz, "services");
for (const servicio of readdirSync(servicios)) {
  const ejemplo = join(servicios, servicio, ".env.example");
  const destino = join(servicios, servicio, ".env");
  if (!existsSync(ejemplo)) continue;
  if (existsSync(destino)) {
    console.log(`${servicio}: .env ya existe, no se toca.`);
  } else {
    copyFileSync(ejemplo, destino);
    console.log(`${servicio}: .env creado desde .env.example.`);
  }
}
