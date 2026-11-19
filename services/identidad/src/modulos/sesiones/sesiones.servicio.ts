import { ApiError, JWT, leerLlave, type Rol } from "@backline/comun";
import bcrypt from "bcryptjs";
import { importPKCS8, SignJWT, type CryptoKey } from "jose";
import { env } from "../../config/env";
import * as usuarios from "../usuarios/usuarios.repositorio";

/** Inicio de sesión y emisión de tokens. Solo este servicio tiene la llave privada. */

const llavePrivadaPem = leerLlave(env.JWT_LLAVE_PRIVADA, "llave privada de los tokens");
let llavePrivada: Promise<CryptoKey> | undefined;

/**
 * Hash de una contraseña que nadie tiene. Si el correo no existe, se compara contra este
 * para tardar lo mismo que con un correo real: así el tiempo de respuesta no revela
 * qué correos están registrados.
 */
const HASH_SENUELO = bcrypt.hashSync("señuelo-sin-cuenta", env.BCRYPT_COSTO);

export interface Sesion {
  tokenAcceso: string;
  tipo: "Bearer";
  expiraEn: number;
  usuario: { id: string; rol: Rol };
}

export async function iniciarSesion(correo: string, contrasena: string): Promise<Sesion> {
  const usuario = await usuarios.porCorreo(correo);
  const correcta = await bcrypt.compare(contrasena, usuario?.hash_contrasena ?? HASH_SENUELO);

  // Mismo mensaje para "no existe" y "contraseña incorrecta": no confirmar qué correos tienen cuenta
  if (!usuario || !correcta) {
    throw ApiError.noAutenticado("CREDENCIALES_INVALIDAS", "Correo o contraseña incorrectos.");
  }
  // Se revisa DESPUÉS de la contraseña: a quien no la sabe no se le dice que la cuenta está suspendida
  if (usuario.estado === "suspendida") {
    throw ApiError.sinPermiso("Tu cuenta está suspendida. Contacta al administrador.", "CUENTA_SUSPENDIDA");
  }

  const segundos = env.TOKEN_MINUTOS * 60;
  const tokenAcceso = await new SignJWT({ rol: usuario.rol })
    .setProtectedHeader({ alg: JWT.algoritmo, typ: "JWT" })
    .setSubject(usuario.id)
    .setIssuer(JWT.emisor)
    .setAudience(JWT.audiencia)
    .setIssuedAt()
    .setExpirationTime(`${segundos}s`)
    .sign(await (llavePrivada ??= importPKCS8(llavePrivadaPem, JWT.algoritmo)));

  return { tokenAcceso, tipo: "Bearer", expiraEn: segundos, usuario: { id: usuario.id, rol: usuario.rol } };
}
