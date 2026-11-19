import { readFileSync } from "node:fs";
import type { NextFunction, Request, Response } from "express";
import { errors, importSPKI, jwtVerify, type CryptoKey } from "jose";
import { ApiError } from "../errores/ApiError";

/** Valores fijos del token (sección 26 del documento, Tabla 15). */
export const JWT = {
  emisor: "backline-identidad",
  audiencia: "backline-api",
  algoritmo: "RS256",
} as const;

export type Rol = "banda" | "foro" | "admin";
const ROLES: readonly Rol[] = ["banda", "foro", "admin"];

/** Quién hace la petición, tomado del token ya verificado. */
export interface UsuarioAutenticado {
  id: string;
  rol: Rol;
  /** El token tal como llegó, para reenviarlo cuando este servicio llama a otro. */
  token: string;
}

/** Lee una llave PEM del disco con un mensaje claro si no existe. */
export function leerLlave(ruta: string, descripcion: string): string {
  try {
    return readFileSync(ruta, "utf8");
  } catch (error) {
    // Distinguir "no existe" de "no tengo permiso": son problemas distintos con soluciones distintas (defecto D10)
    if ((error as NodeJS.ErrnoException).code === "EACCES") {
      console.error(
        `No hay permiso para leer la ${descripcion} en ${ruta} (este proceso corre con el uid ${process.getuid?.()}). ` +
          'En Docker los servicios corren como el usuario "node" (uid 1000); si en tu máquina la llave es de otro usuario, ' +
          "dale permiso de lectura SOLO en desarrollo: chmod 644 llaves/jwt-privada.pem",
      );
    } else {
      console.error(`No se encontró la ${descripcion} en ${ruta}. Genérala con "npm run configurar" en la raíz del repositorio.`);
    }
    process.exit(1);
  }
}

/**
 * Crea el middleware que exige un token válido.
 * Cada servicio verifica la firma con la llave PÚBLICA: puede comprobar que Identidad
 * emitió el token, pero no puede emitir uno. Solo Identidad tiene la llave privada.
 */
export function crearAutenticacion(llavePublicaPem: string) {
  let llave: Promise<CryptoKey> | undefined;
  const obtenerLlave = () => (llave ??= importSPKI(llavePublicaPem, JWT.algoritmo));

  return async function autenticar(req: Request, res: Response, next: NextFunction): Promise<void> {
    const encabezado = req.get("Authorization") ?? "";
    const [esquema, token] = encabezado.split(" ");
    if (esquema !== "Bearer" || !token) {
      return next(ApiError.noAutenticado("TOKEN_INVALIDO", "Falta el encabezado Authorization: Bearer <token>."));
    }
    try {
      const { payload } = await jwtVerify(token, await obtenerLlave(), {
        issuer: JWT.emisor,
        audience: JWT.audiencia,
        algorithms: [JWT.algoritmo], // nunca aceptar "none" ni HS256 con la llave pública como secreto
      });
      const rol = payload.rol as Rol;
      if (typeof payload.sub !== "string" || !ROLES.includes(rol)) {
        return next(ApiError.noAutenticado("TOKEN_INVALIDO", "El token no tiene un usuario o un rol válido."));
      }
      const usuario: UsuarioAutenticado = { id: payload.sub, rol, token };
      res.locals.usuario = usuario;
      next();
    } catch (error) {
      if (error instanceof errors.JWTExpired) {
        return next(ApiError.noAutenticado("TOKEN_EXPIRADO", "La sesión expiró. Inicia sesión de nuevo."));
      }
      next(ApiError.noAutenticado("TOKEN_INVALIDO", "El token no es válido."));
    }
  };
}

/** Exige que el usuario tenga uno de los roles indicados (autorización por rol). Va después de autenticar. */
export function requerirRol(...roles: Rol[]) {
  return (_req: Request, res: Response, next: NextFunction): void => {
    const usuario = res.locals.usuario as UsuarioAutenticado | undefined;
    if (!usuario) return next(ApiError.noAutenticado("TOKEN_INVALIDO", "Falta el token."));
    if (!roles.includes(usuario.rol)) {
      return next(ApiError.sinPermiso(`Esta operación es solo para: ${roles.join(", ")}. Tu cuenta es de ${usuario.rol}.`));
    }
    next();
  };
}

/** El usuario que dejó `autenticar` en res.locals. */
export function usuarioActual(res: Response): UsuarioAutenticado {
  const usuario = res.locals.usuario as UsuarioAutenticado | undefined;
  if (!usuario) throw ApiError.noAutenticado("TOKEN_INVALIDO", "Falta el token.");
  return usuario;
}

/** Autorización por propiedad: solo el dueño del recurso (su id coincide con el del token). */
export function exigirDueno(usuario: UsuarioAutenticado, duenoId: string, recurso: string): void {
  if (usuario.id !== duenoId) {
    throw ApiError.sinPermiso(`Solo el dueño puede modificar ${recurso}.`);
  }
}
